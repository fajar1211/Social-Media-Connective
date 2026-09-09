import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/describe-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { image_data } = body;

          if (!image_data) {
            return new Response(
              JSON.stringify({ error: "Missing required field: image_data" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const model = "gemini-2.0-flash";
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          let parts: Array<Record<string, unknown>>;

          if (image_data.startsWith("http")) {
            parts = [
              {
                text: "Describe this image in detail for recreation. Focus on: style, colors, lighting, composition, mood, and key visual elements. Be concise but specific. Output ONLY the description, no extra text.",
              },
              { file_data: { file_uri: image_data } },
            ];
          } else {
            let cleanB64 = image_data;
            if (image_data.includes(",")) {
              cleanB64 = image_data.split(",")[1];
            }
            parts = [
              {
                text: "Describe this image in detail for recreation. Focus on: style, colors, lighting, composition, mood, and key visual elements. Be concise but specific. Output ONLY the description, no extra text.",
              },
              { inline_data: { mime_type: "image/jpeg", data: cleanB64 } },
            ];
          }

          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
            }),
          });

          const data = await resp.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const realPart = parts.find((p: { thought?: boolean }) => !p.thought);
          const description =
            realPart?.text?.trim() || "";

          return new Response(
            JSON.stringify({ success: true, description }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
