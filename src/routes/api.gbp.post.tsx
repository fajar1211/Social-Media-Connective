import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/gbp/post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            accountId,
            locationId,
            accessToken,
            summary,
            callToAction,
            url,
            media,
          } = body;

          if (!accountId || !locationId || !accessToken || !summary) {
            return new Response(
              JSON.stringify({
                error:
                  "Missing required fields: accountId, locationId, accessToken, summary",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const locationName = `accounts/${accountId}/locations/${locationId}`;

          const postBody: Record<string, unknown> = {
            languageCode: "en",
            summary: summary,
          };

          if (callToAction && url) {
            postBody["callToAction"] = {
              actionType: callToAction,
              url: url,
            };
          }

          if (media && media.length > 0) {
            postBody["media"] = media.map(
              (item: { url: string; mediaFormat?: string }) => ({
                mediaFormat: item.mediaFormat || "PHOTO",
                sourceUrl: item.url,
              })
            );
          }

          const gbpResponse = await fetch(
            `https://mybusinessbusinessinfo.googleapis.com/v1/${locationName}/localPosts`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(postBody),
            }
          );

          const gbpData = await gbpResponse.json();

          if (gbpData.error) {
            return new Response(
              JSON.stringify({
                error: gbpData.error.message || "Failed to create post",
                code: gbpData.error.code,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              postId: gbpData.name,
              message: "GBP post created successfully",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
