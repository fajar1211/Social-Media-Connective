import { createFileRoute } from "@tanstack/react-router";

const INSTAGRAM_APP_ID = "2421970934879169";
const REDIRECT_URI = "https://socmed.marketingconnective.com/api/auth/instagram-direct/callback";

export const Route = createFileRoute("/api/auth/instagram-direct")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientId = url.searchParams.get("client_id") || "unknown";

        const params = new URLSearchParams({
          client_id: INSTAGRAM_APP_ID,
          redirect_uri: REDIRECT_URI,
          response_type: "code",
          scope: "instagram_basic,instagram_content_publish",
          state: clientId,
        });

        return new Response(null, {
          status: 302,
          headers: {
            Location: `https://www.instagram.com/oauth/authorize?${params.toString()}`,
          },
        });
      },
    },
  },
});
