import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";
import { api } from "./api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
};

const SESSION_COOKIE = "mc_sb_session";

function setSessionCookie(accessToken: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=${accessToken}; path=/; max-age=86400; SameSite=Lax; Secure`;
}

function clearSessionCookie() {
  if (typeof window === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax; Secure`;
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = typeof window !== "undefined"
      ? localStorage.getItem("mc_auth")
      : null;
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  return !!getAuthUser();
}

export async function checkAuth(): Promise<boolean> {
  if (typeof window === "undefined") return true;


  const localUser = getAuthUser();
  if (!localUser) return false;

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    localStorage.removeItem("mc_auth");
    clearSessionCookie();
    return false;
  }
  return true;
}

async function ensureAdminUser(supabaseUser: User): Promise<AuthUser> {
  const name =
    supabaseUser.user_metadata?.name ||
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.email?.split("@")[0] ||
    "Admin";

  const avatar_url = supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null;

  // Upsert into admin_users table
  await supabase.from("admin_users").upsert(
    {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name,
      avatar_url,
      last_login: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return { id: supabaseUser.id, name, email: supabaseUser.email || "", avatar_url };
}

export async function signInWithGoogle() {
  const origin = typeof window !== "undefined"
    ? window.location.origin
    : import.meta.env.VITE_SITE_URL || "https://chatconnectpro.marketingconnective.com";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Login gagal");

  const authUser = await ensureAdminUser(data.user);
  localStorage.setItem("mc_auth", JSON.stringify(authUser));
  if (data.session) setSessionCookie(data.session.access_token);
  return authUser;
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });
  if (error) throw error;
  return data;
}

export async function handleAuthCallback() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) throw new Error("No session");

  const authUser = await ensureAdminUser(data.session.user);
  localStorage.setItem("mc_auth", JSON.stringify(authUser));
  if (data.session) setSessionCookie(data.session.access_token);
  return authUser;
}

export async function updateDisplayName(name: string) {
  const { data, error } = await supabase.auth.updateUser({
    data: { name },
  })
  if (error) throw error

  const current = getAuthUser()
  if (current) {
    const updated = { ...current, name }
    localStorage.setItem("mc_auth", JSON.stringify(updated))
  }

  await supabase.from("admin_users").upsert(
    { id: data.user.id, name },
    { onConflict: "id" }
  )

  return data
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  localStorage.removeItem("mc_auth");
  clearSessionCookie();
  await supabase.auth.signOut();
}

export type ProfileData = {
  business_name?: string | null;
  phone?: string | null;
  additional_email?: string | null;
  address?: string | null;
  logo_url?: string | null;
};

export async function getProfile(): Promise<ProfileData | null> {
  try {
    const data = await api.getProfile();
    return {
      business_name: data.business_name,
      phone: data.phone,
      additional_email: data.additional_email,
      address: data.address,
      logo_url: data.logo_url,
    };
  } catch {
    return null;
  }
}

export async function updateProfile(profile: ProfileData) {
  const data = await api.updateProfile(profile);
  return data;
}

export async function uploadLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("logo", file);

  const token = await getSession().then((s) => s?.access_token);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const apiBase = import.meta.env.VITE_BOT_API_URL || "http://localhost:3000";
  const res = await fetch(`${apiBase}/api/admin/profile/logo`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    let msg: string;
    try { const j = JSON.parse(body); msg = j.error || j.message || body; } catch { msg = body; }
    throw new Error(msg);
  }

  const result = await res.json();
  return result.logo_url;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
