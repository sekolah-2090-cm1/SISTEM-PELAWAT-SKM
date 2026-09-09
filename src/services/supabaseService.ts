import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Visitor } from '../types';

const STORAGE_KEY_SUPABASE_URL = 'supabase_project_url';
const STORAGE_KEY_SUPABASE_ANON_KEY = 'supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let currentConfig = {
  url: '',
  anonKey: '',
};

export function getSupabaseConfig(): { url: string; anonKey: string } {
  if (currentConfig.url && currentConfig.anonKey) {
    return currentConfig;
  }

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_SUPABASE_ANON_KEY) || '';

  const url = (envUrl || localUrl).trim();
  const anonKey = (envKey || localKey).trim();

  currentConfig = { url, anonKey };
  return currentConfig;
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  currentConfig = { url: cleanUrl, anonKey: cleanKey };
  localStorage.setItem(STORAGE_KEY_SUPABASE_URL, cleanUrl);
  localStorage.setItem(STORAGE_KEY_SUPABASE_ANON_KEY, cleanKey);
  cachedClient = null; // reset client to reinitialize with new creds

  // Sync to central server so phones automatically receive it!
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supabaseUrl: cleanUrl,
      supabaseAnonKey: cleanKey,
    }),
  }).catch((err) => console.warn('Gagal segerak config Supabase ke server:', err));
}

export async function syncSupabaseConfigWithServer(): Promise<{ url: string; anonKey: string }> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        const url = String(data.supabaseUrl).trim();
        const anonKey = String(data.supabaseAnonKey).trim();
        if (url && anonKey) {
          currentConfig = { url, anonKey };
          localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url);
          localStorage.setItem(STORAGE_KEY_SUPABASE_ANON_KEY, anonKey);
          cachedClient = null;
          return currentConfig;
        }
      }
    }
  } catch (err) {
    console.warn('Gagal membaca config Supabase dari server:', err);
  }

  // Fallback: If local exists but server doesn't, publish local to server
  const local = getSupabaseConfig();
  if (local.url && local.anonKey) {
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseUrl: local.url,
        supabaseAnonKey: local.anonKey,
      }),
    }).catch(() => {});
  }

  return local;
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  if (!cachedClient) {
    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('Ralat mencipta Supabase client:', err);
      return null;
    }
  }

  return cachedClient;
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'Sila masukkan Project URL dan anon public key yang sah.' };
    }

    const tempClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await tempClient
      .from('visitors')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          success: false,
          message: 'Berjaya bersambung ke Supabase, tetapi jadual "visitors" belum dicipta. Sila jalankan skrip SQL di Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Ralat Supabase: ${error.message} (${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      success: true,
      message: `Sambungan ke Supabase berjaya! Jadual "visitors" sedia digunakan.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menyambung ke Supabase: ${err?.message || 'Sila pastikan URL dan Key adalah betul.'}`,
    };
  }
}

export async function fetchVisitorsFromSupabase(): Promise<Visitor[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('visitors')
      .select('*')
      .order('check_in_time', { ascending: false });

    if (error) {
      console.error('Ralat memuat turun dari Supabase:', error);
      return null;
    }

    if (!Array.isArray(data)) return [];

    return data.map((row: any) => ({
      id: String(row.id),
      name: String(row.name || ''),
      icOrPassport: String(row.ic_or_passport || ''),
      phone: String(row.phone || ''),
      vehiclePlate: String(row.vehicle_plate || ''),
      purpose: String(row.purpose || ''),
      checkInTime: String(row.check_in_time || new Date().toISOString()),
      checkOutTime: row.check_out_time ? String(row.check_out_time) : null,
      status: row.status === 'CHECKED_OUT' ? 'CHECKED_OUT' : 'ACTIVE',
    }));
  } catch (err) {
    console.error('Ralat fetching Supabase visitors:', err);
    return null;
  }
}

export async function addVisitorToSupabase(visitor: Visitor): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('visitors').upsert(
      {
        id: visitor.id,
        name: visitor.name,
        ic_or_passport: visitor.icOrPassport,
        phone: visitor.phone,
        vehicle_plate: visitor.vehiclePlate || '-',
        purpose: visitor.purpose,
        check_in_time: visitor.checkInTime,
        check_out_time: visitor.checkOutTime || null,
        status: visitor.status || 'ACTIVE',
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Ralat simpan ke Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Ralat addVisitorToSupabase:', err);
    return false;
  }
}

export async function checkOutVisitorInSupabase(id: string, checkOutTime: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('visitors')
      .update({
        check_out_time: checkOutTime,
        status: 'CHECKED_OUT',
      })
      .eq('id', id);

    if (error) {
      console.error('Ralat checkout di Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Ralat checkOutVisitorInSupabase:', err);
    return false;
  }
}

export async function deleteVisitorFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('visitors').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Real-time listener for live visitor updates across all phones and laptops!
 */
export function subscribeToVisitorChanges(onChange: () => void): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitors',
        },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Ralat melanggan Supabase realtime:', err);
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Skrip SQL untuk mencipta jadual pelawat (visitors) di Supabase
-- Salin dan tampal skrip ini ke dalam Supabase SQL Editor, kemudian tekan "Run".

CREATE TABLE IF NOT EXISTS public.visitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ic_or_passport TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_plate TEXT DEFAULT '-',
  purpose TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benarkan akses baca & tulis untuk aplikasi sekolah (Row Level Security)
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Buang polisi lama jika wujud supaya selamat dijalankan berulang kali
DROP POLICY IF EXISTS "Allow all read" ON public.visitors;
DROP POLICY IF EXISTS "Allow all insert" ON public.visitors;
DROP POLICY IF EXISTS "Allow all update" ON public.visitors;
DROP POLICY IF EXISTS "Allow all delete" ON public.visitors;
DROP POLICY IF EXISTS "Allow anon read all visitors" ON public.visitors;
DROP POLICY IF EXISTS "Allow anon insert visitors" ON public.visitors;
DROP POLICY IF EXISTS "Allow anon update visitors" ON public.visitors;
DROP POLICY IF EXISTS "Allow anon delete visitors" ON public.visitors;

CREATE POLICY "Allow all read" ON public.visitors FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.visitors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.visitors FOR DELETE USING (true);

-- Aktifkan Realtime untuk jadual ini supaya telefon & laptop segerak serta-merta!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'visitors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
  END IF;
END $$;
`;
