import { createFileRoute } from "@tanstack/react-router";

const META_APP_ID = "1109449551768527";
const META_APP_SECRET = "42bc8519cc029ed1e79062a137d57b75";
const GRAPH_API_VERSION = "v21.0";

export const Route = createFileRoute("/api/facebook/refresh-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { accessToken } = body;

          if (!accessToken) {
            return new Response(
              JSON.stringify({ error: "Missing required field: accessToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
          url.searchParams.set("grant_type", "fb_exchange_token");
          url.searchParams.set("client_id", META_APP_ID);
          url.searchParams.set("client_secret", META_APP_SECRET);
          url.searchParams.set("fb_exchange_token", accessToken);

          const resp = await fetch(url.toString());
          const data = await resp.json();

          if (data.error) {
            return new Response(
              JSON.stringify({
                success: false,
                error: data.error.message || "Failed to refresh token",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              accessToken: data.access_token,
              expiresIn: data.expires_in || 0,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
