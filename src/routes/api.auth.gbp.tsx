import { createFileRoute } from "@tanstack/react-router";

const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"] || "";
const REDIRECT_URI =
  "https://socmed.marketingconnective.com/api/auth/gbp/callback";

export const Route = createFileRoute("/api/auth/gbp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientId = url.searchParams.get("client_id") || "unknown";

        const params = new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          response_type: "code",
          scope: "https://www.googleapis.com/auth/business.manage",
          access_type: "offline",
          prompt: "consent",
          state: clientId,
        });

        return new Response(null, {
          status: 302,
          headers: {
            Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
          },
        });
      },
    },
  },
});
