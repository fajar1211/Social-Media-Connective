import { Router } from "express";
import multer from "multer";
import { supabase } from "../supabase.js";
import { invalidateKnowledgeCache } from "../knowledge.js";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import puppeteer from "puppeteer";
import { existsSync } from "fs";
import { platform } from "os";
import crypto from "crypto";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Crawl job tracking for real-time progress
interface CrawlJob {
  id: string;
  status: "running" | "done" | "error";
  progress: number;
  currentPage: number;
  totalPages: number;
  currentUrl: string;
  pagesFound: number;
  linksFound: number;
  result?: any;
  error?: string;
}
const crawlJobs = new Map<string, CrawlJob>();

function tryParseJSON(text: string): { question: string; answer: string }[] | null {
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      const entries = json
        .map((item: any) => ({
          question:
            item.question || item.title || item.Q || item.q || "",
          answer:
            item.answer ||
            item.content ||
            item.A ||
            item.a ||
            item.text ||
            "",
        }))
        .filter((e) => e.question && e.answer);
      if (entries.length > 0) return entries;
    } else if (json.question || json.title) {
      return [
        {
          question: json.question || json.title,
          answer: json.answer || json.content || json.text || "",
        },
      ];
    }
  } catch {}
  return null;
}

function tryParseMarkdown(
  text: string
): { question: string; answer: string }[] {
  const sections = text.split(/(?=^## )/m);
  const entries: { question: string; answer: string }[] = [];
  for (const section of sections) {
    const lines = section.trim().split("\n");
    const heading = lines[0]?.replace(/^##\s+/, "").trim();
    const body = lines.slice(1).join("\n").trim();
    if (heading && body) {
      entries.push({ question: heading, answer: body });
    }
  }
  return entries;
}

function extractHTMLContent(html: string, url: string): string {
  // Use Readability first — it handles article pages well
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const articleText = article?.textContent?.replace(/\s+/g, " ").trim() || "";

  // Always get full body text via cheerio too (strips script/style only)
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, img, canvas, video, audio").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  // Use whichever is LONGER — Readability is cleaner but may strip too much
  if (articleText.length > 50 && articleText.length >= bodyText.length * 0.7) {
    return articleText;
  }
  if (bodyText.length > 50) return bodyText;

  // Fallback: collect text from block elements
  const blockText: string[] = [];
  $("p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre, figcaption")
    .each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 15) blockText.push(t);
    });
  if (blockText.length > 0) return blockText.join("\n");

  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').attr("content") || "";
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const parts = [title, ogDesc || description].filter(Boolean);
  return parts.join(" — ") || title || "";
}

function splitIntoChunks(
  text: string,
  maxChars: number = 4000
): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function generateQAByAI(
  text: string,
  sourceName: string
): Promise<{ question: string; answer: string }[]> {
  if (!openai) {
    throw new Error(
      "OPENAI_API_KEY tidak dikonfigurasi. Set OPENAI_API_KEY di .env untuk menggunakan AI generation."
    );
  }

  const chunks = splitIntoChunks(text);
  const promptTemplate = (chunk: string) => `Berikut adalah konten dari "${sourceName}".

Buatlah 3-5 pasang Q&A (Pertanyaan dan Jawaban) dalam Bahasa Indonesia berdasarkan konten di bawah. Setiap Q&A harus informatif dan langsung merujuk pada isi konten.

Konten:
${chunk}

Respond with ONLY a JSON array in this exact format, no other text:
[{"question": "Pertanyaan?", "answer": "Jawaban."}]`;

  const responses = await Promise.all(
    chunks.map((chunk) =>
      openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptTemplate(chunk) }],
        temperature: 0.3,
        max_tokens: 3000,
      })
    )
  );

  const allEntries: { question: string; answer: string }[] = [];
  for (const response of responses) {
    const content = response.choices[0]?.message?.content || "";
    const parsed = tryParseJSON(content);
    if (parsed) {
      allEntries.push(...parsed);
    }
  }

  return allEntries;
}

interface CrawlResult {
  url: string;
  title: string;
  text: string;
}

function extractTitle(html: string): string {
  const $ = cheerio.load(html);
  return $("title").first().text().trim() || "";
}

const MAX_ENTRY_LENGTH = 100000;

function normalizeHost(host: string): string {
  return host.replace(/^www\./, "");
}

const CRAWL_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function getChromePath(): Promise<string> {
  // Puppeteer bundled Chromium
  try {
    const p = await puppeteer.executablePath();
    if (p && existsSync(p)) return p;
  } catch { /* fall through */ }

  if (platform() === "linux") {
    const linuxPaths = [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/snap/bin/chromium",
    ];
    for (const p of linuxPaths) {
      if (existsSync(p)) return p;
    }
  }

  const windowsPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of windowsPaths) {
    if (existsSync(p)) return p;
  }
  return "google-chrome-stable";
}

// Try to fetch a page and extract links/content with either fetch or Puppeteer
interface FetchPageResult {
  result: CrawlResult | null;
  newLinks: string[];
  usedPuppeteer: boolean;
}

async function tryFetchPage(
  url: string,
  startHost: string,
  urlObj: URL,
  maxPages: number,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
): Promise<FetchPageResult | null> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": CRAWL_USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5" },
  });
  if (!response.ok) {
    console.log(`[Crawl] SKIP ${url} — HTTP ${response.status}`);
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const isHtml =
    contentType.includes("text/html") ||
    contentType.includes("application/xhtml") ||
    contentType.includes("application/xml") ||
    !contentType;
  if (!isHtml) {
    console.log(`[Crawl] SKIP ${url} — non-HTML content-type: ${contentType}`);
    return null;
  }

  const html = await response.text();
  if (!html.trim() || html.trim().length < 50) {
    console.log(`[Crawl] SKIP ${url} — HTML too short (${html.length} chars)`);
    return null;
  }

  const text = extractHTMLContent(html, url);
  const title = extractTitle(html);

  // Extract links
  const links = new Set<string>();
  const $ = cheerio.load(html);
  let totalATags = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    totalATags++;
    try {
      let fullHref = href;
      if (fullHref.startsWith("//")) fullHref = `${urlObj.protocol}${fullHref}`;
      if (/^(mailto:|tel:|javascript:|ftp:)/.test(fullHref)) return;

      const absolute = new URL(fullHref, url).href;
      const noHash = absolute.includes("#") ? absolute.split("#")[0] : absolute;
      const normalized = noHash.replace(/\/+$/, "") || noHash;
      const absUrl = new URL(normalized);
      const absHost = normalizeHost(absUrl.host);

      if (absHost === startHost && /^https?:$/.test(absUrl.protocol) &&
        !/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|ico|woff|woff2|ttf|eot|mp4|webm|mp3|wav|xml|json)$/i.test(absUrl.pathname) &&
        !visited.has(normalized)) {
        visited.add(normalized);
        links.add(normalized);
      }
    } catch { /* skip invalid hrefs */ }
  });

  console.log(`[Crawl] 🔗 ${url}: ${totalATags} <a> tags, ${links.size} internal links`);

  return { result: text.trim() ? { url, title, text } : null, newLinks: Array.from(links), usedPuppeteer: false };
}

async function tryPuppeteerPage(
  browser: any,
  url: string,
  startHost: string,
  urlObj: URL,
  maxPages: number,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
): Promise<FetchPageResult | null> {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(CRAWL_USER_AGENT);
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.5" });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000)); // Extra wait for JS to finish

    const html = await page.content();
    if (!html.trim() || html.trim().length < 50) {
      console.log(`[Crawl] PUPPETEER SKIP ${url} — HTML too short`);
      return null;
    }

    const text = extractHTMLContent(html, url);
    const title = extractTitle(html);

    // Extract links from fully rendered page
    const links = new Set<string>();
    const hrefs = await page.evaluate(() => {
      const anchors = document.querySelectorAll("a[href]");
      return Array.from(anchors).map((a) => (a as HTMLAnchorElement).href).filter(Boolean);
    });

    let totalATags = hrefs.length;
    for (const href of hrefs) {
      try {
        if (/^(mailto:|tel:|javascript:|ftp:)/.test(href)) continue;
        const absolute = new URL(href);
        // Edge: / might not have protocol/host, already absolute from evaluate
        const noHash = absolute.href.includes("#") ? absolute.href.split("#")[0] : absolute.href;
        const normalized = noHash.replace(/\/+$/, "") || noHash;
        const absHost = normalizeHost(absolute.host);

        if (absHost === startHost && /^https?:$/.test(absolute.protocol) &&
          !/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|ico|woff|woff2|ttf|eot|mp4|webm|mp3|wav|xml|json)$/i.test(absolute.pathname) &&
          !visited.has(normalized)) {
          visited.add(normalized);
          links.add(normalized);
        }
      } catch { /* skip */ }
    }

    console.log(`[Crawl] PUPPETEER 🔗 ${url}: ${totalATags} <a> tags, ${links.size} internal links`);
    return { result: text.trim() ? { url, title, text } : null, newLinks: Array.from(links), usedPuppeteer: true };
  } finally {
    await page.close();
  }
}

async function crawlWebsite(
  startUrl: string,
  maxPages: number,
  maxDepth: number,
  onProgress?: (url: string, current: number, total: number) => void,
  onLinksFound?: (count: number, totalLinks: number) => void
): Promise<CrawlResult[]> {
  const urlObj = new URL(startUrl);
  const startHost = normalizeHost(urlObj.host);
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [
    { url: startUrl.replace(/\/+$/, ""), depth: 0 },
  ];
  visited.add(startUrl.replace(/\/+$/, ""));

  let usePuppeteer = false;
  let browser: any = null;

  while (queue.length > 0 && results.length < maxPages) {
    const { url, depth } = queue.shift()!;
    if (depth > maxDepth) continue;
    onProgress?.(url, results.length, maxPages);
    console.log(`[Crawl] 📄 Processing: ${url} (depth ${depth}, mode: ${usePuppeteer ? "puppeteer" : "fetch"})`);

    try {
      let pageResult: FetchPageResult | null = null;

      if (!usePuppeteer) {
        pageResult = await tryFetchPage(url, startHost, urlObj, maxPages, depth, maxDepth, visited);
        // If fetch finds no text (< 100 chars) or no links, try Puppeteer (JS-rendered SPA)
        const needsJs = pageResult && (
          (pageResult.result && pageResult.result.text.trim().length < 100) ||
          pageResult.newLinks.length === 0
        ) && results.length < 3 && depth === 0;
        if (needsJs) {
          console.log(`[Crawl] ⚠️ Fetch returned minimal content — switching to Puppeteer for JS rendering`);
          if (!browser) {
              browser = await puppeteer.launch({
              executablePath: await getChromePath(),
              headless: true,
              args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
            });
          }
          const puppeteerResult = await tryPuppeteerPage(browser, url, startHost, urlObj, maxPages, depth, maxDepth, visited);
          if (puppeteerResult && (puppeteerResult.result || puppeteerResult.newLinks.length > 0)) {
            console.log(`[Crawl] ✅ Puppeteer berhasil — beralih ke mode Puppeteer`);
            usePuppeteer = true;
            pageResult = puppeteerResult;
          }
        }
      } else {
        if (!browser) {
          browser = await puppeteer.launch({
            executablePath: await getChromePath(),
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
          });
        }
        pageResult = await tryPuppeteerPage(browser, url, startHost, urlObj, maxPages, depth, maxDepth, visited);
      }

      if (pageResult) {
        if (pageResult.result) {
          results.push(pageResult.result);
          console.log(`[Crawl] ✅ [${results.length}/${maxPages}] ${pageResult.result.title || url} — ${pageResult.result.text.length} chars`);
        } else {
          console.log(`[Crawl] ⚠️ ${url} — no extractable text`);
        }

        if (depth < maxDepth && results.length < maxPages) {
          for (const link of pageResult.newLinks) {
            if (queue.length + results.length >= maxPages * 2) break;
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.log(`[Crawl] ❌ ${url} — ${(err as Error)?.message || "unknown error"}`);
      continue;
    }
  }

  if (browser) await browser.close();
  return results;
}

function textToEntries(text: string, sourceLabel: string, generateAi: boolean): { question: string; answer: string }[] {
  const entries: { question: string; answer: string }[] = [];

  if (generateAi && openai) {
    return entries; // AI gen handled separately per page
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  if (paragraphs.length > 0) {
    for (let i = 0; i < paragraphs.length; i++) {
      entries.push({
        question: `${sourceLabel} - Bagian ${i + 1}`,
        answer: paragraphs[i].slice(0, MAX_ENTRY_LENGTH),
      });
    }
  } else {
    entries.push({
      question: `Konten dari ${sourceLabel}`,
      answer: text.slice(0, MAX_ENTRY_LENGTH),
    });
  }

  return entries;
}

router.post("/api/knowledge/import-url", async (req, res) => {
  try {
    let { url, generate_ai, crawl, max_pages, max_depth } = req.body;

    if (!url) {
      res.status(400).json({ error: "URL diperlukan." });
      return;
    }

    url = url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    crawl = crawl === true;
    max_pages = Math.min(Math.max(Number(max_pages) || 20, 1), 200);
    max_depth = Math.min(Math.max(Number(max_depth) || 3, 1), 10);

    // === CRAWL MODE: crawl entire website (background job with progress) ===
    if (crawl) {
      const jobId = crypto.randomUUID();
      const job: CrawlJob = {
        id: jobId,
        status: "running",
        progress: 0,
        currentPage: 0,
        totalPages: max_pages,
        currentUrl: url,
        pagesFound: 0,
        linksFound: 0,
      };
      crawlJobs.set(jobId, job);

      // Run crawl in background
      runCrawlJob(jobId, url, max_pages, max_depth, generate_ai, (req as any).userId);

      res.json({ jobId });
      return;
    }

    // === SINGLE PAGE MODE (original behavior) ===
    console.log(`[Import URL] Fetching: ${url}`);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    } catch (fetchErr: any) {
      const msg = fetchErr.name === "TimeoutError"
        ? `Koneksi timeout: ${url} tidak dapat dijangkau dalam 15 detik`
        : `Gagal mengambil URL: ${fetchErr.message}`;
      console.error(`[Import URL] Fetch failed: ${fetchErr.message}`);
      res.status(400).json({ error: msg });
      return;
    }

    if (!response.ok) {
      res
        .status(400)
        .json({ error: `Gagal mengambil URL: HTTP ${response.status} ${response.statusText}` });
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    console.log(`[Import URL] OK ${response.status} | Content-Type: ${contentType} | Length: ${text.length} chars`);

    if (!text.trim()) {
      res.status(400).json({ error: `URL ${url} tidak mengembalikan konten teks (kosong).` });
      return;
    }

    let entries: { question: string; answer: string }[] = [];

    if (contentType.includes("json")) {
      console.log(`[Import URL] Detected as JSON`);
      const jsonEntries = tryParseJSON(text);
      if (jsonEntries) {
        entries = jsonEntries;
        console.log(`[Import URL] Parsed ${entries.length} Q&A entries from JSON`);
      } else {
        console.log(`[Import URL] JSON parse failed or unrecognized format`);
      }
    } else if (contentType.includes("html")) {
      console.log(`[Import URL] Detected as HTML`);
      const extractedText = extractHTMLContent(text, url);
      console.log(`[Import URL] HTML extracted: ${extractedText.length} chars`);

      if (!extractedText.trim()) {
        res.status(400).json({ error: `Gagal mengekstrak teks dari halaman ${url}. Halaman mungkin membutuhkan JavaScript atau tidak memiliki konten teks.` });
        return;
      }

      if (generate_ai && openai) {
        console.log(`[Import URL] Generating Q&A with AI...`);
        entries = await generateQAByAI(extractedText, url);
        console.log(`[Import URL] AI generated ${entries.length} entries`);
      } else {
        entries = textToEntries(extractedText, new URL(url).hostname, false);
        console.log(`[Import URL] ${entries.length} entries from extracted text`);
      }
    } else if (contentType.includes("text/")) {
      console.log(`[Import URL] Detected as plain text`);
      const mdEntries = tryParseMarkdown(text);
      if (mdEntries.length > 0) {
        entries = mdEntries;
        console.log(`[Import URL] Parsed ${entries.length} entries from Markdown`);
      } else if (generate_ai && openai) {
        entries = await generateQAByAI(text, url);
      } else {
        entries.push({
          question: `Konten dari ${url}`,
          answer: text.trim().slice(0, MAX_ENTRY_LENGTH),
        });
      }
    } else {
      console.log(`[Import URL] Unknown content-type: ${contentType}, treating as text`);
      const mdEntries = tryParseMarkdown(text);
      if (mdEntries.length > 0) {
        entries = mdEntries;
      } else if (generate_ai && openai) {
        entries = await generateQAByAI(text, url);
      } else {
        entries.push({
          question: `Konten dari ${url}`,
          answer: text.trim().slice(0, MAX_ENTRY_LENGTH),
        });
      }
    }

    const validEntries = entries.filter((e) => e.answer.trim().length > 0);

    if (validEntries.length === 0 && text.trim()) {
      console.log(`[Import URL] Fallback: using raw text`);
      validEntries.push({
        question: `Konten dari ${url}`,
        answer: text.trim().slice(0, MAX_ENTRY_LENGTH),
      });
    }

    if (validEntries.length === 0) {
      res.status(400).json({
        error: "Tidak ada konten yang bisa diekstrak dari URL tersebut.",
        detail: `URL: ${url}, Content-Type: ${contentType}, Panjang konten: ${text.length} chars, Ekstraksi menghasilkan 0 entry.`,
      });
      return;
    }

    const { error: insertError } = await supabase.from("bot_knowledge_base").insert(
      validEntries.map((e) => ({
        question: e.question,
        answer: e.answer,
        category: "imported",
        is_active: true,
        sort_order: 0,
        user_id: (req as any).userId,
      }))
    );
    const success = insertError ? 0 : validEntries.length;
    if (insertError) {
      console.error("Failed to save entries:", insertError);
    }

    console.log(`[Import URL] Done: ${success}/${validEntries.length} entries saved to DB`);
    invalidateKnowledgeCache();
    res.json({ success: true, count: validEntries.length, saved: success });
  } catch (err: any) {
    console.error("Import URL error:", err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

// Crawl progress endpoint (polling)
router.get("/api/knowledge/crawl-progress/:jobId", (req, res) => {
  const job = crawlJobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Job tidak ditemukan" });
    return;
  }
  res.json({
    status: job.status,
    progress: job.progress,
    currentPage: job.currentPage,
    totalPages: job.totalPages,
    currentUrl: job.currentUrl,
    pagesFound: job.pagesFound,
    linksFound: job.linksFound,
    result: job.result,
    error: job.error,
  });
  // Cleanup finished jobs after sending result
  if (job.status !== "running") {
    setTimeout(() => crawlJobs.delete(job.id), 30000);
  }
});

async function runCrawlJob(
  jobId: string,
  url: string,
  maxPages: number,
  maxDepth: number,
  generateAi: boolean,
  userId: string,
) {
  const job = crawlJobs.get(jobId)!;
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   CRAWL START: ${url}`);
  console.log(`║   max_pages=${maxPages} max_depth=${maxDepth}`);
  console.log(`╚══════════════════════════════════════╝\n`);

  try {
    const pages = await crawlWebsite(
      url, maxPages, maxDepth,
      (pageUrl, current, total) => {
        const j = crawlJobs.get(jobId);
        if (!j) return;
        j.currentPage = current + 1;
        j.totalPages = total;
        j.currentUrl = pageUrl;
        j.pagesFound = current + 1;
        j.progress = Math.min(Math.round(((current + 1) / total) * 70), 70);
      },
      (linkCount, totalLinks) => {
        const j = crawlJobs.get(jobId);
        if (!j) return;
        j.linksFound = linkCount;
      }
    );

    if (pages.length === 0) {
      job.status = "error";
      job.error = "Tidak ada halaman yang berhasil di-crawl. Website mungkin menggunakan JavaScript atau tidak memiliki link internal.";
      job.progress = 100;
      return;
    }

    job.progress = 75;
    const allEntries: { question: string; answer: string }[] = [];
    let totalChars = 0;
    const crawledUrls: string[] = [];

    for (let idx = 0; idx < pages.length; idx++) {
      const page = pages[idx];
      crawledUrls.push(page.url);
      const label = page.title
        ? `${new URL(page.url).hostname} — ${page.title}`
        : new URL(page.url).hostname;

      console.log(`[Crawl] Processing ${idx + 1}/${pages.length}: ${page.title || page.url} (${page.text.length} chars)`);
      job.progress = 75 + Math.round(((idx + 1) / pages.length) * 15);
      job.currentUrl = `Processing: ${page.title || page.url}`;

      if (generateAi && openai) {
        try {
          const aiEntries = await generateQAByAI(page.text, page.url);
          allEntries.push(...aiEntries);
        } catch (e: any) {
          console.error(`[Crawl] AI gen failed for ${page.url}: ${e.message}`);
          allEntries.push(...textToEntries(page.text, label, false));
        }
      } else {
        allEntries.push(...textToEntries(page.text, label, false));
      }

      totalChars += page.text.length;
    }

    const validEntries = allEntries.filter((e) => e.answer.trim().length > 0);

    if (validEntries.length === 0) {
      job.status = "error";
      job.error = "Tidak ada konten yang bisa diekstrak dari halaman yang di-crawl.";
      job.progress = 100;
      return;
    }

    job.progress = 92;
    job.currentUrl = "Menyimpan ke database...";
    console.log(`[Crawl] Saving ${validEntries.length} entries to DB...`);

    const { error: insertError } = await supabase.from("bot_knowledge_base").insert(
      validEntries.map((e) => ({
        question: e.question,
        answer: e.answer,
        category: "imported",
        is_active: true,
        sort_order: 0,
        user_id: userId,
      }))
    );
    const success = insertError ? 0 : validEntries.length;
    if (insertError) {
      console.error("Failed to save entries:", insertError);
    }

    console.log(`[Crawl] ✅ Done: ${pages.length} pages, ${validEntries.length} entries, ${success} saved`);
    invalidateKnowledgeCache();

    job.status = "done";
    job.progress = 100;
    job.result = {
      success: true,
      count: validEntries.length,
      saved: success,
      pages_crawled: pages.length,
      total_chars: totalChars,
      urls: crawledUrls,
    };
  } catch (err: any) {
    console.error("Crawl job error:", err);
    job.status = "error";
    job.error = err.message || "Unknown error";
    job.progress = 100;
  }
}

router.post(
  "/api/knowledge/import-file",
  upload.array("files", 10),
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const generate_ai = req.body.generate_ai === "true";

      if (!files || files.length === 0) {
        res.status(400).json({ error: "Tidak ada file yang diupload." });
        return;
      }

      console.log(`[Import File] Received ${files.length} file(s)`);

      const allEntries: { question: string; answer: string }[] = [];
      const errors: string[] = [];

      for (const file of files) {
        const ext = file.originalname.split(".").pop()?.toLowerCase();
        console.log(`[Import File] Processing: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB, .${ext})`);

        if (!file.buffer || file.buffer.length === 0) {
          errors.push(`${file.originalname}: file kosong`);
          continue;
        }

        const text = file.buffer.toString("utf-8");

        if (!text.trim()) {
          errors.push(`${file.originalname}: tidak mengandung teks yang bisa dibaca`);
          continue;
        }

        let entries: { question: string; answer: string }[] = [];

        if (ext === "json") {
          console.log(`[Import File] Parsing as JSON`);
          const jsonEntries = tryParseJSON(text);
          if (jsonEntries) {
            entries = jsonEntries;
            console.log(`[Import File] JSON: ${entries.length} entries`);
          } else {
            errors.push(`${file.originalname}: format JSON tidak dikenal atau tidak memiliki Q&A`);
          }
        } else if (ext === "pdf") {
          console.log(`[Import File] Parsing as PDF`);
          try {
            const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
            const pdfDoc = await pdfjs.getDocument({ data: file.buffer }).promise;
            let pdfText = "";
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const content = await page.getTextContent();
              pdfText += content.items.map((item: any) => item.str).join(" ") + "\n";
            }
            pdfText = pdfText.replace(/\s+/g, " ").trim();
            console.log(`[Import File] PDF extracted: ${pdfText.length} chars from ${pdfDoc.numPages} pages`);

            if (!pdfText) {
              errors.push(`${file.originalname}: PDF tidak mengandung teks (mungkin scan/image-based)`);
              continue;
            }

            if (generate_ai && openai) {
              entries = await generateQAByAI(pdfText, file.originalname);
            } else {
              entries.push({
                question: file.originalname,
                answer: pdfText.slice(0, MAX_ENTRY_LENGTH),
              });
            }
          } catch (pdfErr: any) {
            errors.push(`${file.originalname}: gagal parse PDF (${pdfErr.message})`);
            continue;
          }
        } else if (ext === "md") {
          console.log(`[Import File] Parsing as Markdown`);
          const mdEntries = tryParseMarkdown(text);
          if (mdEntries.length > 0) {
            entries = mdEntries;
            console.log(`[Import File] Markdown: ${entries.length} entries from ## headings`);
          } else if (generate_ai && openai) {
            entries = await generateQAByAI(text, file.originalname);
          } else {
            entries.push({
              question: file.originalname,
              answer: text.trim().slice(0, MAX_ENTRY_LENGTH),
            });
          }
        } else if (ext === "txt") {
          console.log(`[Import File] Parsing as TXT`);
          if (generate_ai && openai) {
            entries = await generateQAByAI(text, file.originalname);
          } else {
            entries.push({
              question: file.originalname,
              answer: text.trim().slice(0, MAX_ENTRY_LENGTH),
            });
          }
        } else {
          const msg = `${file.originalname}: format .${ext} tidak didukung (hanya .json, .pdf, .md, .txt)`;
          errors.push(msg);
          console.log(`[Import File] ${msg}`);
          continue;
        }

        allEntries.push(...entries);
      }

      if (allEntries.length === 0) {
        const errorSummary = errors.length > 0
          ? errors.join(" | ")
          : "Tidak ada konten yang bisa diekstrak dari file.";
        res.status(400).json({ error: errorSummary });
        return;
      }

      const validEntries = allEntries.filter((e) => e.answer.trim().length > 0);

      const { error: insertError } = await supabase.from("bot_knowledge_base").insert(
        validEntries.map((e) => ({
          question: e.question,
          answer: e.answer,
          category: "imported",
          is_active: true,
          sort_order: 0,
          user_id: (req as any).userId,
        }))
      );
      const success = insertError ? 0 : validEntries.length;
      if (insertError) {
        console.error("Failed to save entries:", insertError);
      }

      console.log(`[Import File] Done: ${success}/${validEntries.length} entries saved, ${errors.length} error(s)`);
      if (errors.length > 0) {
        console.log(`[Import File] Errors: ${errors.join(" | ")}`);
      }

      invalidateKnowledgeCache();
      res.json({
        success: true,
        count: validEntries.length,
        saved: success,
        warnings: errors.length > 0 ? errors : undefined,
      });
    } catch (err: any) {
      console.error("Import file error:", err);
      res.status(500).json({ error: `Server error: ${err.message}` });
    }
  }
);
export default router;
