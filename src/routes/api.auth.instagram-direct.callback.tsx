import { createFileRoute } from "@tanstack/react-router";

const META_APP_ID = "1109449551768527";
const META_APP_SECRET = "42bc8519cc029ed1e79062a137d57b75";
const REDIRECT_URI = "https://socmed.marketingconnective.com/api/auth/instagram-direct/callback";
const GRAPH_API_VERSION = "v21.0";

export const Route = createFileRoute("/api/auth/instagram-direct/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        const clientId = state || "unknown";

        if (error) {
          return new Response(
            buildHtml({
              title: "Instagram OAuth Error",
              body: `
                <h2>Instagram OAuth Error</h2>
                <p><strong>Error:</strong> ${escapeHtml(error)}</p>
                <p><strong>Description:</strong> ${escapeHtml(errorDescription || "Unknown error")}</p>
              `,
              script: `(function(){try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"instagram-auth-error",clientId:"${escapeJs(clientId)}",error:"${escapeJs(error)}",description:"${escapeJs(errorDescription || "")}" },"*")}}catch(e){}setTimeout(function(){try{window.close()}catch(e){}},800)})()`,
            }),
            { status: 200, headers: { "Content-Type": "text/html" } }
          );
        }

        if (!code) {
          return new Response(
            buildHtml({
              title: "Instagram OAuth",
              body: `
                <h2>Instagram OAuth Callback</h2>
                <p>No authorization code received.</p>
              `,
            }),
            { status: 400, headers: { "Content-Type": "text/html" } }
          );
        }

        try {
          // Exchange code for short-lived token
          const tokenResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                client_id: META_APP_ID,
                client_secret: META_APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code: code,
              }),
            }
          );

          const tokenData = await tokenResponse.json();

          if (tokenData.error) {
            throw new Error(tokenData.error.message);
          }

          const accessToken = tokenData.access_token;

          // Get user info
          const userResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me?fields=id,name,email&access_token=${accessToken}`
          );
          const userData = await userResponse.json();

          // Get pages with Instagram Business accounts
          const pagesResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?fields=id,name,category,instagram_business_account&access_token=${accessToken}`
          );
          const pagesData = await pagesResponse.json();

          // Filter pages that have Instagram Business accounts
          const instagramAccounts = (pagesData.data || []).filter(
            (page: { instagram_business_account?: unknown }) => page.instagram_business_account
          );

          if (instagramAccounts.length === 0) {
            return new Response(
              buildHtml({
                title: "Instagram OAuth Error",
                body: `
                  <h2>No Instagram Business Account Found</h2>
                  <p>Please connect an Instagram Business account to a Facebook Page first.</p>
                `,
                script: `(function(){try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"instagram-auth-error",clientId:"${escapeJs(clientId)}",error:"No Instagram Business accounts found" },"*")}}catch(e){}setTimeout(function(){try{window.close()}catch(e){}},2000)})()`,
              }),
              { status: 200, headers: { "Content-Type": "text/html" } }
            );
          }

          // Build Instagram accounts list
          const igAccountsList = instagramAccounts.map((p: { instagram_business_account: { id: string; name: string } }) => ({
            id: p.instagram_business_account.id,
            name: p.instagram_business_account.name,
          }));

          const payload = JSON.stringify({
            type: "instagram-auth-success",
            clientId: clientId,
            user: userData,
            pages: pagesData.data || [],
            instagram_accounts: igAccountsList,
            access_token: accessToken,
            token_type: tokenData.token_type || "bearer",
            expires_in: tokenData.expires_in || 0,
          });

          const successHtml = buildHtml({
            title: "Instagram Auth Success",
            body: `
              <h2>Instagram Authentication Successful!</h2>
              <p><strong>User:</strong> ${userData.name} (${userData.id})</p>
              <p><strong>Instagram Accounts:</strong> ${igAccountsList.length} found</p>
              <p id="status" style="color:green;">Connecting...</p>
            `,
            script: `
              (function() {
                var payload = ${payload};
                var attempts = 0;
                var maxAttempts = 30;

                function sendAuth() {
                  attempts++;
                  try {
                    localStorage.setItem("socmedconnective-ig-auth", JSON.stringify(payload));
                  } catch(e) {}

                  try {
                    if (window.opener && !window.opener.closed) {
                      window.opener.postMessage(payload, "*");
                    }
                  } catch(e) {}

                  var el = document.getElementById("status");
                  if (el) el.textContent = "Connected! Closing...";

                  if (attempts < maxAttempts) {
                    setTimeout(sendAuth, 100);
                  } else {
                    try { window.close(); } catch(e) {}
                  }
                }

                sendAuth();
              })();
            `,
          });

          return new Response(successHtml, {
            status: 200,
            headers: { "Content-Type": "text/html" },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";

          return new Response(
            buildHtml({
              title: "Instagram OAuth Error",
              body: `
                <h2>Instagram OAuth Error</h2>
                <p>Error: ${escapeHtml(msg)}</p>
                <p>Please close this tab and try again.</p>
              `,
              script: `
                (function() {
                  var attempts = 0;
                  var maxAttempts = 10;

                  function sendError() {
                    attempts++;
                    try {
                      if (window.opener && !window.opener.closed) {
                        window.opener.postMessage({ type: "instagram-auth-error", clientId: "${escapeJs(clientId)}", error: "${escapeJs(msg)}" }, "*");
                      }
                    } catch(e) {}
                    if (attempts < maxAttempts) {
                      setTimeout(sendError, 100);
                    } else {
                      try { window.close(); } catch(e) {}
                    }
                  }

                  sendError();
                })();
              `,
            }),
            { status: 500, headers: { "Content-Type": "text/html" } }
          );
        }
      },
    },
  },
});

function buildHtml({
  title,
  body,
  script,
}: {
  title: string;
  body: string;
  script?: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><title>${escapeHtml(title)}</title></head>
<body>
  ${body}
  ${script ? `<script>${script}</script>` : ""}
</body>
</html>`;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJs(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
