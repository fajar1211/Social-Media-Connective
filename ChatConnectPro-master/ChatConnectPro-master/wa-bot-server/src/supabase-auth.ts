import { supabase } from "./supabase.js";
import type { AuthenticationState, SignalKeyStore, AuthenticationCreds, SignalDataSet, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import { initAuthCreds } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";
import { BufferJSON } from "@whiskeysockets/baileys/lib/Utils/generics.js";

const AUTH_TABLE = "bot_auth_store";

const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {} } as any;

let tableChecked = false;

async function ensureTable(): Promise<boolean> {
  if (tableChecked) return true;
  const { error } = await supabase.from(AUTH_TABLE).select("id").limit(1);
  if (error && error.message?.includes("does not exist")) {
    console.error(`[SupabaseAuth] ❌ Tabel ${AUTH_TABLE} tidak ditemukan! Jalankan SQL migration di Supabase dashboard.`);
    tableChecked = true;
    return false;
  }
  tableChecked = true;
  return true;
}

async function getItem(instanceId: string, filename: string): Promise<any | null> {
  const { data, error } = await supabase
    .from(AUTH_TABLE)
    .select("data")
    .eq("instance_id", instanceId)
    .eq("filename", filename)
    .maybeSingle();
  if (error) {
    console.error(`[SupabaseAuth] getItem error (${filename}):`, error.message);
    return null;
  }
  return (data as any)?.data || null;
}

export async function removeAllInstanceAuth(instanceId: string): Promise<void> {
  const { error } = await supabase
    .from(AUTH_TABLE)
    .delete()
    .eq("instance_id", instanceId);
  if (error) {
    console.error(`[SupabaseAuth] removeAllInstanceAuth error:`, error.message);
  }
}

export async function useSupabaseAuthState(instanceId: string): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  await ensureTable();

  let creds: AuthenticationCreds;

  const savedCreds = await getItem(instanceId, "creds");
  if (savedCreds) {
    creds = JSON.parse(JSON.stringify(savedCreds), BufferJSON.reviver) as AuthenticationCreds;
  } else {
    creds = initAuthCreds();
  }

  const keyStore: SignalKeyStore = {
    async get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [id: string]: SignalDataTypeMap[T] }> {
      const result: { [id: string]: any } = {};
      for (const id of ids) {
        try {
          const raw = await getItem(instanceId, `${type}-${id}`);
          if (raw) {
            result[id] = JSON.parse(JSON.stringify(raw), BufferJSON.reviver);
          }
        } catch (err) {
          console.error(`[SupabaseAuth] keyStore.get error (${type}-${id}):`, err);
        }
      }
      return result;
    },

    async set(data: SignalDataSet): Promise<void> {
      const rows: { instance_id: string; filename: string; data: any }[] = [];
      const filenames: string[] = [];
      for (const type in data) {
        const entries = data[type as keyof SignalDataTypeMap] as Record<string, any>;
        for (const id in entries) {
          const filename = `${type}-${id}`;
          filenames.push(filename);
          rows.push({
            instance_id: instanceId,
            filename,
            data: JSON.parse(JSON.stringify(entries[id], BufferJSON.replacer)),
          });
        }
      }
      if (rows.length === 0) return;

      // Hapus batch lama + insert batch baru — hanya 2 API call
      await supabase
        .from(AUTH_TABLE)
        .delete()
        .eq("instance_id", instanceId)
        .in("filename", filenames);
      const { error } = await supabase
        .from(AUTH_TABLE)
        .insert(rows);
      if (error) {
        console.error(`[SupabaseAuth] batch insert error (${rows.length} rows):`, error.message);
      }
    },
  };

  const keys = makeCacheableSignalKeyStore(keyStore, silentLogger);

  const saveCreds = async () => {
    const serialized = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    await supabase
      .from(AUTH_TABLE)
      .delete()
      .eq("instance_id", instanceId)
      .eq("filename", "creds");
    await supabase
      .from(AUTH_TABLE)
      .insert({ instance_id: instanceId, filename: "creds", data: serialized });
  };

  return {
    state: { creds, keys },
    saveCreds,
  };
}
