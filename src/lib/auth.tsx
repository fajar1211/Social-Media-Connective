import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { getProfile, createProfile, hasExistingProfiles } from "@/lib/db";
import type { User, Session } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/database.types";

export interface UserProfile {
  role: UserRole;
  clientId: string | null;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

const LOCAL_AUTH_KEY = "socmedconnective-local-auth";

function getLocalAuth(): { email: string; name: string } | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function clearLocalAuth() {
  localStorage.removeItem(LOCAL_AUTH_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabaseConfigured) {
      setProfile({ role: "admin", clientId: null, fullName: "Local Admin" });
      return;
    }

    const p = await getProfile(userId);
    if (p) {
      setProfile({
        role: p.role,
        clientId: p.client_id,
        fullName: p.full_name,
      });
    } else {
      const isFirstUser = !(await hasExistingProfiles());
      const userRole = isFirstUser ? "admin" : "client";

      const newProfile = await createProfile({
        id: userId,
        email: user?.email || "",
        full_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "",
        role: userRole,
        client_id: null,
      });
      if (newProfile) {
        setProfile({
          role: newProfile.role,
          clientId: newProfile.client_id,
          fullName: newProfile.full_name,
        });
      }
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!supabaseConfigured) {
      const local = getLocalAuth();
      if (local) {
        setUser({
          id: "local",
          email: local.email,
          user_metadata: { full_name: local.name },
        } as User);
        setProfile({ role: "admin", clientId: null, fullName: local.name });
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }
    clearLocalAuth();
    setUser(null);
    setSession(null);
    setProfile(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
