import { supabase, supabaseConfigured } from "@/lib/supabase";
import type {
  Profile,
  Client,
  Content,
  SocialConnection,
  Platform,
  ContentStatus,
} from "@/lib/database.types";

// ============================================
// PROFILE QUERIES
// ============================================

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data;
}

export async function hasExistingProfiles(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error("Error checking profiles:", error);
    return true;
  }
  return (count ?? 0) > 0;
}

export async function createProfile(
  profile: Omit<Profile, "created_at" | "updated_at">
): Promise<Profile | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select()
    .single();
  if (error) {
    console.error("Error creating profile:", error);
    return null;
  }
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Profile>
): Promise<Profile | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }
  return data;
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
  return data || [];
}

export async function deleteProfile(userId: string): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (error) {
    console.error("Error deleting profile:", error);
    return false;
  }
  return true;
}

// ============================================
// CLIENT QUERIES
// ============================================

export async function getClients(): Promise<Client[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
  return data || [];
}

export async function getClient(clientId: string): Promise<Client | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();
  if (error) {
    console.error("Error fetching client:", error);
    return null;
  }
  return data;
}

export async function createClient(
  client: Omit<Client, "id" | "created_at" | "updated_at">
): Promise<Client | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("clients")
    .insert(client)
    .select()
    .single();
  if (error) {
    console.error("Error creating client:", error);
    return null;
  }
  return data;
}

export async function updateClient(
  clientId: string,
  patch: Partial<Client>
): Promise<Client | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", clientId)
    .select()
    .single();
  if (error) {
    console.error("Error updating client:", error);
    return null;
  }
  return data;
}

export async function deleteClient(clientId: string): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);
  if (error) {
    console.error("Error deleting client:", error);
    return false;
  }
  return true;
}

// ============================================
// CONTENT QUERIES (filtered by client_id via RLS)
// ============================================

export async function getContent(): Promise<Content[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .order("date", { ascending: false });
  if (error) {
    console.error("Error fetching content:", error);
    return [];
  }
  return (data || []).map((item) => ({
    ...item,
    hashtags: item.hashtags || [],
    media: item.media || [],
  }));
}

export async function getContentByClient(clientId: string): Promise<Content[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false });
  if (error) {
    console.error("Error fetching content by client:", error);
    return [];
  }
  return (data || []).map((item) => ({
    ...item,
    hashtags: item.hashtags || [],
    media: item.media || [],
  }));
}

export async function createContent(
  content: Omit<Content, "id" | "created_at" | "updated_at">
): Promise<Content | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("content")
    .insert(content)
    .select()
    .single();
  if (error) {
    console.error("Error creating content:", error);
    return null;
  }
  return { ...data, hashtags: data.hashtags || [], media: data.media || [] };
}

export async function updateContent(
  contentId: string,
  patch: Partial<Content>
): Promise<Content | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("content")
    .update(patch)
    .eq("id", contentId)
    .select()
    .single();
  if (error) {
    console.error("Error updating content:", error);
    return null;
  }
  return { ...data, hashtags: data.hashtags || [], media: data.media || [] };
}

export async function deleteContent(contentId: string): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { error } = await supabase
    .from("content")
    .delete()
    .eq("id", contentId);
  if (error) {
    console.error("Error deleting content:", error);
    return false;
  }
  return true;
}

// ============================================
// SOCIAL CONNECTIONS QUERIES
// ============================================

export async function getSocialConnections(
  clientId: string
): Promise<SocialConnection[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("social_connections")
    .select("*")
    .eq("client_id", clientId);
  if (error) {
    console.error("Error fetching social connections:", error);
    return [];
  }
  return (data || []).map((item) => ({
    ...item,
    pages: item.pages || [],
  }));
}

export async function upsertSocialConnection(
  connection: Omit<SocialConnection, "id" | "created_at" | "updated_at">
): Promise<SocialConnection | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("social_connections")
    .upsert(connection, { onConflict: "client_id,platform" })
    .select()
    .single();
  if (error) {
    console.error("Error upserting social connection:", error);
    return null;
  }
  return { ...data, pages: data.pages || [] };
}

// ============================================
// PLATFORM QUERIES
// ============================================

export async function getPlatforms(): Promise<Platform[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("platforms")
    .select("*")
    .order("name");
  if (error) {
    console.error("Error fetching platforms:", error);
    return [];
  }
  return data || [];
}

// ============================================
// STATS QUERIES
// ============================================

export async function getContentCounts(): Promise<{
  Suggested: number;
  Additional: number;
  Submitted: number;
  Approved: number;
  Deleted: number;
}> {
  if (!supabaseConfigured)
    return { Suggested: 0, Additional: 0, Submitted: 0, Approved: 0, Deleted: 0 };

  const { data, error } = await supabase
    .from("content")
    .select("status");
  if (error) {
    console.error("Error fetching content counts:", error);
    return { Suggested: 0, Additional: 0, Submitted: 0, Approved: 0, Deleted: 0 };
  }

  const counts = {
    Suggested: 0,
    Additional: 0,
    Submitted: 0,
    Approved: 0,
    Deleted: 0,
  };

  (data || []).forEach((item) => {
    if (item.status in counts) {
      counts[item.status as keyof typeof counts]++;
    }
  });

  return counts;
}
