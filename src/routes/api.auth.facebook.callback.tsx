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
                client_id: "1797916071226372",
                client_secret: process.env["META_APP_SECRET"] || "YOUR_APP_SECRET",
                redirect_uri: "http://localhost:8080/api/auth/facebook/callback",
                code: code,
              }),
            }
          );

          const tokenData = await tokenResponse.json();

          if (tokenData.error) {
            throw new Error(tokenData.error.message);
          }

          const userResponse = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${tokenData.access_token}`
          );
          const userData = await userResponse.json();

          const pagesResponse = await fetch(
            `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token&access_token=${tokenData.access_token}`
          );
          const pagesData = await pagesResponse.json();

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Facebook Auth Success</title></head>
<body>
  <h2>Facebook Authentication Successful!</h2>
  <p><strong>User:</strong> ${userData.name} (${userData.id})</p>
  <p><strong>Pages:</strong> ${pagesData.data?.length || 0} found</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: "facebook-auth-success",
        clientId: "${clientId}",
        user: ${JSON.stringify(userData)},
        pages: ${JSON.stringify(pagesData.data || [])},
        access_token: "${tokenData.access_token}",
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
