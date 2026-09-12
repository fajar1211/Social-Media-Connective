import { createFileRoute } from "@tanstack/react-router";

const GOOGLE_CLIENT_ID = "396802055324-s0iv979okqkku75k1fudsatsmvuocu4t.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

export const Route = createFileRoute("/api/gbp/refresh-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { refreshToken } = body;

          if (!refreshToken) {
            return new Response(
              JSON.stringify({ error: "Missing refreshToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
              }),
            }
          );

          const tokenData = await tokenResponse.json();

          if (tokenData.error) {
            return new Response(
              JSON.stringify({
                error:
                  tokenData.error_description || tokenData.error,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              access_token: tokenData.access_token,
              expires_in: tokenData.expires_in || 3600,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
