import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/instagram/callback")({
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
          const errorPayload = JSON.stringify({
            type: "instagram-auth-error",
            clientId: clientId,
            error: error,
            description: errorDescription || "",
          });

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Instagram OAuth Error</title></head>
<body>
  <h2>Instagram OAuth Error</h2>
  <p><strong>Error:</strong> ${error}</p>
  <p><strong>Description:</strong> ${errorDescription || "Unknown error"}</p>
  <script>
    (function() {
      try {
        localStorage.setItem("socmedconnective-ig-auth", atob("${btoa(errorPayload)}"));
      } catch(e) {}
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${errorPayload}, "*");
        }
      } catch(e) {}
      setTimeout(function() { try { window.close(); } catch(e) {} }, 800);
    })();
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
<head><title>Instagram OAuth</title></head>
<body>
  <h2>Instagram OAuth Callback</h2>
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
                redirect_uri: "https://socmed.marketingconnective.com/api/auth/instagram/callback",
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
            `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,instagram_business_account&access_token=${tokenData.access_token}`
          );
          const pagesData = await pagesResponse.json();

          const instagramAccounts = pagesData.data?.filter(
            (page: { instagram_business_account?: unknown }) => page.instagram_business_account
          ) || [];

          const payload = JSON.stringify({
            type: "instagram-auth-success",
            clientId: clientId,
            user: userData,
            pages: pagesData.data || [],
            instagram_accounts: instagramAccounts,
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || "bearer",
            expires_in: tokenData.expires_in || 0,
          });

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Instagram Auth Success</title></head>
<body>
  <h2>Instagram Authentication Successful!</h2>
  <p><strong>User:</strong> ${userData.name} (${userData.id})</p>
  <p><strong>Instagram Accounts:</strong> ${instagramAccounts.length} found</p>
  <p id="status" style="color:green;">Connecting...</p>
  <script>
    (function() {
      try {
        localStorage.setItem("socmedconnective-ig-auth", atob("${btoa(payload)}"));
      } catch(e) {}

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${payload}, "*");
        }
      } catch(e) {}

      setTimeout(function() {
        var el = document.getElementById("status");
        if (el) el.textContent = "Connected! You can close this tab.";
        try { window.close(); } catch(e) {}
      }, 1500);
    })();
  </script>
</body>
</html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html" },
            }
          );
        } catch (err) {
          const errorPayload = JSON.stringify({
            type: "instagram-auth-error",
            clientId: clientId,
            error: err instanceof Error ? err.message : "Unknown error",
          });

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Instagram OAuth Error</title></head>
<body>
  <h2>Instagram OAuth Error</h2>
  <p><strong>Error:</strong> ${err instanceof Error ? err.message : "Unknown error"}</p>
  <script>
    (function() {
      try {
        localStorage.setItem("socmedconnective-ig-auth", atob("${btoa(errorPayload)}"));
      } catch(e) {}
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${errorPayload}, "*");
        }
      } catch(e) {}
      setTimeout(function() { try { window.close(); } catch(e) {} }, 800);
    })();
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
