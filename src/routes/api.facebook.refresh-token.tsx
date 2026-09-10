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
          const { shortToken, pageId } = body;

          if (!shortToken) {
            return new Response(
              JSON.stringify({ error: "Missing required field: shortToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Step 1: Exchange short-lived user token for long-lived user token
          const exchangeResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${encodeURIComponent(shortToken)}`
          );
          const exchangeData = await exchangeResponse.json();

          if (exchangeData.error) {
            return new Response(
              JSON.stringify({
                success: false,
                error: exchangeData.error.message,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          const longLivedToken = exchangeData.access_token;
          const expiresIn = exchangeData.expires_in || 0;

          // Step 2: If pageId provided, get the page access token
          if (pageId) {
            const pageTokenResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}?fields=access_token&access_token=${encodeURIComponent(longLivedToken)}`
            );
            const pageTokenData = await pageTokenResponse.json();

            if (pageTokenData.access_token) {
              return new Response(
                JSON.stringify({
                  success: true,
                  pageAccessToken: pageTokenData.access_token,
                  userAccessToken: longLivedToken,
                  expires_in: expiresIn,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          // Step 3: Return long-lived user token if no page token
          return new Response(
            JSON.stringify({
              success: true,
              pageAccessToken: longLivedToken,
              userAccessToken: longLivedToken,
              expires_in: expiresIn,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
