import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { handleAuthCallback } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Memproses..." },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    handleAuthCallback()
      .then(() => {
        navigate({ to: "/dashboard" });
      })
      .catch((err) => {
        console.error("Auth callback error:", err);
        navigate({ to: "/login" });
      });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Memproses login...</p>
      </div>
    </div>
  );
}
