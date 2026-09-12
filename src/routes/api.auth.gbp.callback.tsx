import { createFileRoute } from "@tanstack/react-router";

const GOOGLE_CLIENT_ID = "1052426132622-0prhe3i370pm94cghgm3d7df1v55jpon.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
const REDIRECT_URI =
  "https://socmed.marketingconnective.com/api/auth/gbp/callback";

export const Route = createFileRoute("/api/auth/gbp/callback")({
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
              title: "Google Business Profile OAuth Error",
              body: `
                <h2>Google Business Profile OAuth Error</h2>
                <p><strong>Error:</strong> ${escapeHtml(error)}</p>
                <p><strong>Description:</strong> ${escapeHtml(errorDescription || "Unknown error")}</p>
              `,
              script: `(function(){try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"gbp-auth-error",clientId:"${escapeJs(clientId)}",error:"${escapeJs(error)}",description:"${escapeJs(errorDescription || "")}" },"*")}}catch(e){}setTimeout(function(){try{window.close()}catch(e){}},800)})()`,
            }),
            { status: 200, headers: { "Content-Type": "text/html" } }
          );
        }

        if (!code) {
          return new Response(
            buildHtml({
              title: "Google Business Profile OAuth",
              body: `
                <h2>Google Business Profile OAuth Callback</h2>
                <p>No authorization code received.</p>
              `,
            }),
            { status: 400, headers: { "Content-Type": "text/html" } }
          );
        }

        try {
          const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                code: code,
                grant_type: "authorization_code",
              }),
            }
          );

          const tokenData = await tokenResponse.json();

          if (tokenData.error) {
            throw new Error(
              tokenData.error_description || tokenData.error
            );
          }

          const accessToken = tokenData.access_token;
          const refreshToken = tokenData.refresh_token;
          const expiresIn = tokenData.expires_in || 3600;

          const userResponse = await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const userData = await userResponse.json();

          const accountsResponse = await fetch(
            "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const accountsData = await accountsResponse.json();
          console.log("[GBP Callback] Accounts API response:", JSON.stringify(accountsData, null, 2));

          const accounts: Array<{
            id: string;
            name: string;
            type: string;
          }> = accountsData.accounts || [];

          const locationsMap: Record<
            string,
            Array<{
              id: string;
              name: string;
              address?: string;
              phoneNumber?: string;
              websiteUrl?: string;
            }>
          > = {};

          for (const account of accounts) {
            console.log(`[GBP Callback] Fetching locations for account: ${account.id} (${account.name}) type=${account.type}`);
            try {
              const locationsResponse = await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${account.id}/locations?readMask=name,title,address,websiteUri,phoneNumbers`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
              const locationsData = await locationsResponse.json();
              locationsMap[account.id] = (locationsData.locations || []).map(
                (loc: {
                  name: string;
                  title?: string;
                  address?: { addressLines?: string[] };
                  websiteUri?: string;
                  phoneNumbers?: { primaryPhone?: string };
                }) => ({
                  id: loc.name?.replace("locations/", "") || "",
                  name: loc.title || "Untitled Location",
                  address: loc.address?.addressLines?.join(", ") || "",
                  phoneNumber: loc.phoneNumbers?.primaryPhone || "",
                  websiteUrl: loc.websiteUri || "",
                })
              );
            } catch (e) {
              console.error(
                `Error fetching locations for account ${account.id}:`,
                e
              );
              locationsMap[account.id] = [];
            }
          }

          const flatLocations = Object.entries(locationsMap).flatMap(
            ([accountId, locs]) =>
              locs.map((loc) => ({
                ...loc,
                accountId,
                accountName:
                  accounts.find((a) => a.id === accountId)?.name || "",
              }))
          );

          const payload = JSON.stringify({
            type: "gbp-auth-success",
            clientId: clientId,
            user: userData,
            accounts: accounts,
            locations: flatLocations,
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: "bearer",
            expires_in: expiresIn,
          });

          console.log("[GBP Callback] Total accounts:", accounts.length);
          console.log("[GBP Callback] Total flat locations:", flatLocations.length);
          console.log("[GBP Callback] Locations:", JSON.stringify(flatLocations, null, 2));

          const successHtml = buildHtml({
            title: "Google Business Profile Auth Success",
            body: `
              <h2>Google Business Profile Authentication Successful!</h2>
              <p>User: ${escapeHtml(userData.name || userData.email || "Unknown")} (${userData.id})</p>
              <p>Business Accounts: ${accounts.length} found</p>
              <p>Locations: ${flatLocations.length} found</p>
              ${accounts.length > 0 ? `<p>Account types: ${accounts.map(a => `${a.name} (${a.type})`).join(", ")}</p>` : ""}
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
                    localStorage.setItem("socmedconnective-gbp-auth", JSON.stringify(payload));
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
              title: "Google Business Profile OAuth Error",
              body: `
                <h2>Google Business Profile OAuth Error</h2>
                <p>Error: ${escapeHtml(msg)}</p>
                <p>Please close this tab and try again.</p>
              `,
              script: `
                (function() {
                  try {
                    if (window.opener && !window.opener.closed) {
                      window.opener.postMessage({ type: "gbp-auth-error", clientId: "${escapeJs(clientId)}", error: "${escapeJs(msg)}" }, "*");
                    }
                  } catch(e) {}
                  setTimeout(function() { try { window.close(); } catch(e) {} }, 800);
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
