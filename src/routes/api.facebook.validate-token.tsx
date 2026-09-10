import { createFileRoute } from "@tanstack/react-router";

const META_APP_ID = "1109449551768527";
const META_APP_SECRET = "42bc8519cc029ed1e79062a137d57b75";
const GRAPH_API_VERSION = "v21.0";

export const Route = createFileRoute("/api/facebook/validate-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { pageAccessToken } = body;

          if (!pageAccessToken) {
            return new Response(
              JSON.stringify({ error: "Missing required field: pageAccessToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const appToken = `${META_APP_ID}|${META_APP_SECRET}`;

          const debugResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token?input_token=${encodeURIComponent(pageAccessToken)}&access_token=${encodeURIComponent(appToken)}`
          );
          const debugData = await debugResponse.json();

          if (debugData.error) {
            return new Response(
              JSON.stringify({
                valid: false,
                error: debugData.error.message,
                expires_at: 0,
                scopes: [],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          const tokenInfo = debugData.data;
          const expiresAt = tokenInfo.expires_at || 0;
          const now = Math.floor(Date.now() / 1000);
          const isExpired = expiresAt > 0 && expiresAt < now;
          const expiresIn = expiresAt > 0 ? expiresAt - now : 0;

          return new Response(
            JSON.stringify({
              valid: tokenInfo.is_valid && !isExpired,
              is_expired: isExpired,
              expires_at: expiresAt,
              expires_in: expiresIn,
              scopes: tokenInfo.scopes || [],
              error: isExpired ? "Token has expired. Please reconnect Facebook." : "",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              valid: false,
              error: err instanceof Error ? err.message : "Unknown error",
              expires_at: 0,
              scopes: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
