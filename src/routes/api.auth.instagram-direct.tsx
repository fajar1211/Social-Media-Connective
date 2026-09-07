import { createFileRoute } from "@tanstack/react-router";

const META_APP_ID = "1109449551768527";
const REDIRECT_URI = "https://socmed.marketingconnective.com/api/auth/instagram-direct/callback";

export const Route = createFileRoute("/api/auth/instagram-direct")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientId = url.searchParams.get("client_id") || "unknown";

        const params = new URLSearchParams({
          client_id: META_APP_ID,
          redirect_uri: REDIRECT_URI,
          response_type: "code",
          scope: "instagram_business_basic,instagram_business_content_publish",
          enable_fb_login: "1",
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
