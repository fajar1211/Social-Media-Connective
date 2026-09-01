import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/facebook/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // This is the clientId
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        const clientId = state || "unknown";

        if (error) {
          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Facebook OAuth Error</title></head>
<body>
  <h2>Facebook OAuth Error</h2>
  <p><strong>Error:</strong> ${error}</p>
  <p><strong>Description:</strong> ${errorDescription || "Unknown error"}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "facebook-auth-error", clientId: "${clientId}", error: "${error}", description: "${errorDescription || ""}" }, "*");
      window.close();
    }
  </script>
</body>
</html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html" },
            }
          );
        }

        if (!code) {
          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Facebook OAuth</title></head>
<body>
  <h2>Facebook OAuth Callback</h2>
  <p>No authorization code received.</p>
</body>
</html>`,
            {
              status: 400,
              headers: { "Content-Type": "text/html" },
            }
          );
        }

        try {
          const tokenResponse = await fetch(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                client_id: "1513088904188454",
                client_secret: "a2801fd1f190e76d0ffdb3125ec2dc14",
                redirect_uri: "https://socmedconnective.marketingconnective.com/api/auth/facebook/callback",
                code: code,
              }),
            }
          );

          const tokenData = await tokenResponse.json();

          if (tokenData.error) {
            throw new Error(tokenData.error.message);
          }

          const accessToken = tokenData.access_token;

          const userResponse = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`
          );
          const userData = await userResponse.json();

          const businessesResponse = await fetch(
            `https://graph.facebook.com/v19.0/me/businesses?fields=id,name&access_token=${accessToken}`
          );
          const businessesData = await businessesResponse.json();

          const businesses = (businessesData.data || []).map(
            (biz: { id: string; name: string }) => ({
              id: biz.id,
              name: biz.name,
              pages: [] as Array<{ id: string; name: string; category: string; access_token: string }>,
            })
          );

          for (const biz of businesses) {
            const bizPagesResponse = await fetch(
              `https://graph.facebook.com/v19.0/${biz.id}/pages?fields=id,name,category,access_token&access_token=${accessToken}`
            );
            const bizPagesData = await bizPagesResponse.json();
            biz.pages = (bizPagesData.data || []).filter(
              (p: { category?: string }) => p.category !== "Instagram Business"
            );
          }

          const pagesResponse = await fetch(
            `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token&access_token=${accessToken}`
          );
          const pagesData = await pagesResponse.json();

          const facebookPages = (pagesData.data || []).filter(
            (page: { category?: string }) => page.category !== "Instagram Business"
          );

          const allBusinessPages = businesses.flatMap((biz: { pages: Array<{ id: string; name: string; category: string; access_token: string }> }) => biz.pages);

          const dedupedPages = facebookPages.filter(
            (page: { id: string }) => !allBusinessPages.some((bp: { id: string }) => bp.id === page.id)
          );

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Facebook Auth Success</title></head>
<body>
  <h2>Facebook Authentication Successful!</h2>
  <p><strong>User:</strong> ${userData.name} (${userData.id})</p>
  <p><strong>Businesses:</strong> ${businesses.length} found</p>
  <p><strong>Pages:</strong> ${facebookPages.length} found (direct) + ${allBusinessPages.length} found (via businesses)</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: "facebook-auth-success",
        clientId: "${clientId}",
        user: ${JSON.stringify(userData)},
        businesses: ${JSON.stringify(businesses)},
        pages: ${JSON.stringify([...allBusinessPages, ...dedupedPages])},
        access_token: "${accessToken}",
        token_type: "${tokenData.token_type}",
        expires_in: ${tokenData.expires_in || 0}
      }, "*");
      window.close();
    }
  </script>
</body>
</html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html" },
            }
          );
        } catch (err) {
          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Facebook OAuth Error</title></head>
<body>
  <h2>Facebook OAuth Error</h2>
  <p><strong>Error:</strong> ${err instanceof Error ? err.message : "Unknown error"}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "facebook-auth-error", clientId: "${clientId}", error: "${err instanceof Error ? err.message : "Unknown error"}" }, "*");
      window.close();
    }
  </script>
</body>
</html>`,
            {
              status: 500,
              headers: { "Content-Type": "text/html" },
            }
          );
        }
      },
    },
  },
});
