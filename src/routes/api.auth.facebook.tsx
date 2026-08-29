import { createFileRoute } from "@tanstack/react-router";

const META_APP_ID = "1797916071226372";
const REDIRECT_URI = "http://localhost:8080/api/auth/facebook/callback";

export const Route = createFileRoute("/api/auth/facebook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientId = url.searchParams.get("client_id") || "unknown";

        const params = new URLSearchParams({
          client_id: META_APP_ID,
          redirect_uri: REDIRECT_URI,
          response_type: "code",
          scope: "public_profile,email,pages_show_list,pages_read_user_content,instagram_basic,instagram_content_publish",
          state: clientId,
          auth_type: "reauthenticate",
        });

        return new Response(null, {
          status: 302,
          headers: {
            Location: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`,
          },
        });
      },
    },
  },
});
