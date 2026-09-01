import { createFileRoute } from "@tanstack/react-router";

const META_APP_ID = "1513088904188454";
const REDIRECT_URI = "https://socmedconnective.marketingconnective.com/api/auth/facebook/callback";

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
          scope: "public_profile,email,business_management",
          state: clientId,
          auth_type: "reauthenticate",
          config_id: "1623538329189371",
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
