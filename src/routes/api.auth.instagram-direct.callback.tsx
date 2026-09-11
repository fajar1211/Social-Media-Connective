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

          const userResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me?fields=id,name,email&access_token=${accessToken}`
          );
          const userData = await userResponse.json();

          const pagesResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?fields=id,name,category,access_token,instagram_business_account&access_token=${accessToken}`
          );
          const pagesData = await pagesResponse.json();

          let businesses: Array<{
            id: string;
            name: string;
            pages: Array<{
              id: string;
              name: string;
              category: string;
              access_token: string;
              instagram_business_account?: { id: string; name: string };
            }>;
          }> = [];
          let allBusinessPages: Array<{
            id: string;
            name: string;
            category: string;
            access_token: string;
            instagram_business_account?: { id: string; name: string };
          }> = [];

          const userPages = (pagesData.data || []).filter(
            (p: { category?: string }) =>
              !p.category?.toLowerCase().includes("instagram")
          );

          const businessesResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/businesses?fields=id,name&access_token=${accessToken}`
          );
          const businessesData = await businessesResponse.json();

          businesses = (businessesData.data || []).map(
            (biz: { id: string; name: string }) => ({
              id: biz.id,
              name: biz.name,
              pages: [] as Array<{
                id: string;
                name: string;
                category: string;
                access_token: string;
                instagram_business_account?: { id: string; name: string };
              }>,
            })
          );

          for (const biz of businesses) {
            const bizPagesResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${biz.id}/owned_pages?fields=id,name,category,access_token,instagram_business_account&access_token=${accessToken}`
            );
            const bizPagesData = await bizPagesResponse.json();
            biz.pages = (bizPagesData.data || []).filter(
              (p: { category?: string }) =>
                !p.category?.toLowerCase().includes("instagram")
            );
          }

          allBusinessPages = [
            ...userPages,
            ...businesses.flatMap(
              (biz: {
                pages: Array<{
                  id: string;
                  name: string;
                  category: string;
                  access_token: string;
                  instagram_business_account?: { id: string; name: string };
                }>;
              }) => biz.pages
            ),
          ].filter(
            (page, index, self) =>
              self.findIndex((p) => p.id === page.id) === index
          );

          const pagesWithBusiness = allBusinessPages.map((page) => {
            const parentBusiness = businesses.find((biz) =>
              biz.pages?.some((bp) => bp.id === page.id)
            );
            return {
              ...page,
              business_id: parentBusiness?.id || "",
              business_name: parentBusiness?.name || "",
            };
          });

          const instagramAccounts = allBusinessPages.filter(
            (p) => p.instagram_business_account
          );

          const instagramAccountsWithPictures = await Promise.all(
            instagramAccounts.map(async (p) => {
              const igId = p.instagram_business_account!.id;
              let profilePicture = "";
              let igName = p.instagram_business_account!.name || "";
              try {
                const detailsResponse = await fetch(
                  `https://graph.facebook.com/${GRAPH_API_VERSION}/${igId}?fields=name,profile_picture_url&access_token=${accessToken}`
                );
                const detailsData = await detailsResponse.json();
                if (detailsData.profile_picture_url) {
                  profilePicture = detailsData.profile_picture_url;
                }
                if (!igName && detailsData.name) {
                  igName = detailsData.name;
                }
              } catch {}
              if (!igName) {
                igName = p.name || "Instagram Account";
              }
              return {
                id: igId,
                name: igName,
                profile_picture: profilePicture,
                page_id: p.id,
                page_name: p.name,
                business_id: pagesWithBusiness.find((pw) => pw.id === p.id)?.business_id || "",
                business_name: pagesWithBusiness.find((pw) => pw.id === p.id)?.business_name || "",
              };
            })
          );

          const payload = JSON.stringify({
            type: "instagram-auth-success",
            clientId: clientId,
            user: userData,
            businesses: businesses.map((biz) => ({
              id: biz.id,
              name: biz.name,
            })),
            pages: pagesWithBusiness,
            instagram_accounts: instagramAccountsWithPictures.map((p) => ({
              id: p.id,
              name: p.name,
              profile_picture: p.profile_picture,
              page_id: p.page_id,
              page_name: p.page_name,
              business_id: p.business_id,
              business_name: p.business_name,
            })),
            access_token: accessToken,
            token_type: tokenData.token_type || "bearer",
            expires_in: tokenData.expires_in || 0,
          });

          const successHtml = buildHtml({
            title: "Instagram Auth Success",
            body: `
              <h2>Instagram Authentication Successful!</h2>
              <p>User: ${escapeHtml(userData.name)} (${userData.id})</p>
              <p>Pages: ${allBusinessPages.length} found</p>
              <p>Instagram Accounts: ${instagramAccounts.length} found</p>
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
