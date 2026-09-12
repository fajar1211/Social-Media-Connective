import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { checkAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function AuthGuard({
  children,
  loginPath = "/login",
}: {
  children: React.ReactNode;
  loginPath?: string;
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok">("loading");

  useEffect(() => {
    checkAuth().then((authed) => {
      if (!authed) {
        navigate({ to: loginPath });
      } else {
        setState("ok");
      }
    });
  }, []);

  if (state !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
