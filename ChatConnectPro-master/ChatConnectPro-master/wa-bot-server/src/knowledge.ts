import { supabase } from "./supabase.js";
import type { WAMessage } from "@whiskeysockets/baileys";

const SAPAAN: Record<string, string> = {
  "halo": "Halo! Ada yang bisa saya bantu? Silakan tanya seputar layanan kami.",
  "hallo": "Halo! Ada yang bisa saya bantu? Silakan tanya seputar layanan kami.",
  "helo": "Halo! Ada yang bisa saya bantu? Silakan tanya seputar layanan kami.",
  "hello": "Hello! How can I help you? Feel free to ask about our services.",
  "hai": "Hai! Ada yang bisa saya bantu?",
  "hay": "Hay! Ada yang bisa saya bantu?",
  "hi": "Hi! Ada yang bisa saya bantu?",
  "pagi": "Selamat pagi! Ada yang bisa kami bantu hari ini?",
  "siang": "Selamat siang! Ada yang bisa kami bantu?",
  "sore": "Selamat sore! Ada yang bisa kami bantu?",
  "malam": "Selamat malam! Ada yang bisa kami bantu?",
  "assalamualaikum": "Waalaikumsalam wr wb. Ada yang bisa kami bantu?",
  "assalamu'alaikum": "Waalaikumsalam wr wb. Ada yang bisa kami bantu?",
};

const STOP_WORDS = new Set([
  "dan", "di", "ke", "dari", "dengan", "untuk", "pada", "adalah", "ini",
  "itu", "yang", "tidak", "akan", "bisa", "dapat", "saya", "kami", "kita",
  "mereka", "dia", "oleh", "atau", "tapi", "namun", "sedangkan",
  "serta", "juga", "sudah", "telah", "lagi", "karena", "jika", "kalau",
  "maka", "saat", "setelah", "sebelum", "antara", "tentang", "secara",
  "saja", "pun", "masih", "sangat", "semua", "ada", "banyak", "lain",
  "baru", "dulu", "sini", "situ", "sana", "disini", "disitu", "disana",
  "belum", "pernah", "selalu", "sering", "jarang",
]);

function stem(word: string): string {
  if (word.length <= 4) return word;
  if (word.startsWith("men")) return word.replace(/^me(n)?/, "");
  if (word.startsWith("mem")) return word.replace(/^mem/, "");
  if (word.startsWith("meny")) return "s" + word.slice(4);
  if (word.startsWith("meng")) return word.replace(/^meng/, "");
  if (word.startsWith("me")) return word.slice(2);
  if (word.startsWith("di")) return word.slice(2);
  if (word.startsWith("ke")) return word.slice(2);
  if (word.startsWith("ter")) return word.slice(3);
  if (word.startsWith("ber")) return word.slice(3);
  if (word.startsWith("per")) return word.slice(3);
  if (word.endsWith("kan")) return word.slice(0, -3);
  if (word.endsWith("nya")) return word.slice(0, -3);
  if (word.endsWith("an")) return word.slice(0, -2);
  return word;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map(stem)
    .filter((w) => w.length > 2);
}

interface KnowledgeEntry {
  question: string;
  answer: string;
  questionWords: string[];
  answerWords: string[];
}

let knowledgeCache: KnowledgeEntry[] | null = null;
let knowledgeCacheTime = 0;
const KNOWLEDGE_CACHE_TTL = 30_000;

async function loadKnowledge(userId?: string): Promise<typeof knowledgeCache> {
  const now = Date.now();
  if (!userId && knowledgeCache && now - knowledgeCacheTime < KNOWLEDGE_CACHE_TTL) {
    console.log(`ℹ️ Knowledge cache hit (${knowledgeCache.length} items, no userId)`);
    return knowledgeCache;
  }

  let query = supabase
    .from("bot_knowledge_base")
    .select("question, answer")
    .eq("is_active", true);

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
    console.log(`🔍 Loading knowledge for user ${userId.slice(0, 8)}...`);
  } else {
    console.log(`🔍 Loading ALL knowledge (no userId filter) — legacy path`);
  }

  const { data, error } = await query.order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("❌ Gagal load knowledge base:", error?.message);
    if (!userId) return knowledgeCache ?? [];
    return [];
  }

  const result = data.map((item) => ({
    question: item.question,
    answer: item.answer,
    questionWords: tokenize(item.question),
    answerWords: tokenize(item.answer),
  }));

  console.log(`📚 Knowledge loaded: ${result.length} items${userId ? ` for user ${userId.slice(0, 8)}` : " (all users)"}`);

  if (!userId) {
    knowledgeCache = result;
    knowledgeCacheTime = now;
  }
  return result;
}

export async function findKnowledgeAnswer(message: string, userId?: string): Promise<string | null> {
  try {
    const cleaned = message.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();

    const sapaanKey = Object.keys(SAPAAN).find(
      (k) => cleaned === k || cleaned.startsWith(k + " ") || cleaned.endsWith(" " + k)
    );
    if (sapaanKey) {
      console.log(`👋 Sapaan terdeteksi: "${sapaanKey}"`);
      return SAPAAN[sapaanKey];
    }

    const knowledge = await loadKnowledge(userId);
    if (!knowledge || knowledge.length === 0) {
      console.log("ℹ️ Knowledge base kosong");
      return null;
    }

    const msgWords = tokenize(message);
    if (msgWords.length === 0) {
      console.log("ℹ️ Tidak ada kata kunci yang bisa diproses");
      return null;
    }
    const msgSet = new Set(msgWords);

    let bestMatch: { answer: string; score: number } | null = null;

    // Tahap 1: Cocokkan terhadap QUESTION entries (prioritas utama)
    for (const item of knowledge) {
      const qSet = new Set(item.questionWords);
      let overlap = 0;
      for (const w of msgSet) {
        if (qSet.has(w)) overlap++;
      }
      if (overlap === 0) continue;
      const score = overlap / msgWords.length;
      if (score > (bestMatch?.score || 0)) {
        bestMatch = { answer: item.answer, score };
      }
    }

    if (bestMatch && bestMatch.score >= 0.3) {
      if (bestMatch.answer.length > 2000) {
        console.log(`⚠️ Jawaban terlalu panjang (${bestMatch.answer.length} chars) — skip, fallback ke AI`);
      } else {
        console.log(`✅ Jawaban ditemukan dari question (score: ${bestMatch.score.toFixed(3)})`);
        return bestMatch.answer;
      }
    }

    // Tahap 2: Jika tidak cocok dengan question, coba cocokkan dengan ANSWER
    bestMatch = null;
    for (const item of knowledge) {
      const aSet = new Set(item.answerWords);
      let overlap = 0;
      for (const w of msgSet) {
        if (aSet.has(w)) overlap++;
      }
      if (overlap === 0) continue;
      const score = overlap / msgWords.length;
      if (score > (bestMatch?.score || 0)) {
        bestMatch = { answer: item.answer, score };
      }
    }

    if (bestMatch && bestMatch.score >= 0.5 && msgWords.length <= 3) {
      if (bestMatch.answer.length > 2000) {
        console.log(`⚠️ Jawaban terlalu panjang (${bestMatch.answer.length} chars) — skip, fallback ke AI`);
      } else {
        console.log(`✅ Jawaban ditemukan dari answer (score: ${bestMatch.score.toFixed(3)})`);
        return bestMatch.answer;
      }
    }

    console.log(`ℹ️ Tidak ada kecocokan dari ${knowledge.length} item knowledge`);
    return null;
  } catch (err) {
    console.error("findKnowledgeAnswer error:", err);
    return null;
  }
}

export function extractText(msg: WAMessage): string {
  const m = msg.message;
  if (!m) return "";

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.ephemeralMessage?.message?.conversation ||
    m.ephemeralMessage?.message?.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

export function invalidateKnowledgeCache(): void {
  knowledgeCache = null;
  knowledgeCacheTime = 0;
}
