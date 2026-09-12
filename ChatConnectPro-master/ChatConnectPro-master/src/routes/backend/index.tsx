import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { checkAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/backend/")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/backend/login" });
  },
  component: BackendIndexRedirect,
});

function BackendIndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/backend/dashboard", replace: true });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
