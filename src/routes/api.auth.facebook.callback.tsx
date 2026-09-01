import { createFileRoute } from "@tanstack/react-router";

const META_APP_ID = "1513088904188454";
const META_APP_SECRET = "a2801fd1f190e76d0ffdb3125ec2dc14";
const REDIRECT_URI =
  "https://socmedconnective.marketingconnective.com/api/auth/facebook/callback";
const GRAPH_API_VERSION = "v19.0";

export const Route = createFileRoute("/api/auth/facebook/callback")({
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
              title: "Facebook OAuth Error",
              body: `
                <h2>Facebook OAuth Error</h2>
                <p><strong>Error:</strong> ${escapeHtml(error)}</p>
                <p><strong>Description:</strong> ${escapeHtml(errorDescription || "Unknown error")}</p>
              `,
              script: `window.opener.postMessage({ type: "facebook-auth-error", clientId: "${escapeJs(clientId)}", error: "${escapeJs(error)}", description: "${escapeJs(errorDescription || "")}" }, "*"); window.close();`,
            }),
            { status: 200, headers: { "Content-Type": "text/html" } }
          );
        }

        if (!code) {
          return new Response(
            buildHtml({
              title: "Facebook OAuth",
              body: `
                <h2>Facebook OAuth Callback</h2>
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
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me?fields=id,name,email,client_business_id&access_token=${accessToken}`
          );
          const userData = await userResponse.json();

          let businesses: Array<{
            id: string;
            name: string;
            pages: Array<{
              id: string;
              name: string;
              category: string;
              access_token: string;
            }>;
          }> = [];
          let allBusinessPages: Array<{
            id: string;
            name: string;
            category: string;
            access_token: string;
          }> = [];

          if (userData.client_business_id) {
            const bizId = userData.client_business_id;

            const bizInfoResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${bizId}?fields=id,name&access_token=${accessToken}`
            );
            const bizInfo = await bizInfoResponse.json();

            const bizPagesResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${bizId}/owned_pages?fields=id,name,category,access_token&access_token=${accessToken}`
            );
            const bizPagesData = await bizPagesResponse.json();
            const bizPages = (bizPagesData.data || []).filter(
              (p: { category?: string }) =>
                !p.category?.toLowerCase().includes("instagram")
            );

            businesses = [{
              id: bizId,
              name: bizInfo.name || "Business Portfolio",
              pages: bizPages,
            }];
            allBusinessPages = bizPages;
          } else {
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
                }>,
              })
            );

            for (const biz of businesses) {
              const bizPagesResponse = await fetch(
                `https://graph.facebook.com/${GRAPH_API_VERSION}/${biz.id}/owned_pages?fields=id,name,category,access_token&access_token=${accessToken}`
              );
              const bizPagesData = await bizPagesResponse.json();
              biz.pages = (bizPagesData.data || []).filter(
                (p: { category?: string }) =>
                  !p.category?.toLowerCase().includes("instagram")
              );
            }

            allBusinessPages = businesses.flatMap(
              (biz: {
                pages: Array<{
                  id: string;
                  name: string;
                  category: string;
                  access_token: string;
                }>;
              }) => biz.pages
            );
          }

          const successHtml = buildHtml({
            title: "Facebook Auth Success",
            body: `
              <h2>Facebook Authentication Successful!</h2>
              <p><strong>User:</strong> ${escapeHtml(userData.name)} (${userData.id})</p>
              <p><strong>Businesses:</strong> ${businesses.length} found</p>
              <p><strong>Pages:</strong> ${allBusinessPages.length} found</p>
            `,
            script: `
              if (window.opener) {
                window.opener.postMessage({
                  type: "facebook-auth-success",
                  clientId: "${escapeJs(clientId)}",
                  user: ${JSON.stringify(userData)},
                  businesses: ${JSON.stringify(businesses)},
                  pages: ${JSON.stringify(allBusinessPages)},
                  access_token: "${accessToken}",
                  token_type: "${tokenData.token_type || "bearer"}",
                  expires_in: ${tokenData.expires_in || 0}
                }, "*");
                window.close();
              }
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
              title: "Facebook OAuth Error",
              body: `
                <h2>Facebook OAuth Error</h2>
                <p><strong>Error:</strong> ${escapeHtml(msg)}</p>
              `,
              script: `window.opener.postMessage({ type: "facebook-auth-error", clientId: "${escapeJs(clientId)}", error: "${escapeJs(msg)}" }, "*"); window.close();`,
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
