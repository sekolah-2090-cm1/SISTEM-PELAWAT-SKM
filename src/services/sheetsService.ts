import { Visitor } from '../types';

const STORAGE_KEY_API_URL = 'google_sheet_api_url';

export function getGoogleSheetApiUrl(): string {
  const envUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL || '';
  if (envUrl.trim()) return envUrl.trim();
  return localStorage.getItem(STORAGE_KEY_API_URL) || '';
}

export function setGoogleSheetApiUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_API_URL, url.trim());
}

/**
 * Helper to validate if the URL looks like a valid Google Apps Script Web App exec URL
 */
export function isValidGoogleAppsScriptUrl(url: string): { valid: boolean; reason?: string } {
  if (!url || !url.trim()) {
    return { valid: false, reason: 'URL kosong.' };
  }

  const trimmed = url.trim();
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return {
      valid: false,
      reason: 'Ini adalah URL Google Sheets, bukan Web App URL. Sila guna Web App URL dari Extensions > Apps Script > Deploy > Web app (bermula dengan https://script.google.com/macros/s/.../exec).'
    };
  }

  if (trimmed.includes('/edit') && trimmed.includes('script.google.com')) {
    return {
      valid: false,
      reason: 'Ini adalah pautan editor Apps Script. Sila klik "Deploy" > "New deployment" > "Web app" untuk mendapatkan URL /exec.'
    };
  }

  if (!trimmed.startsWith('https://script.google.com/macros/s/')) {
    return {
      valid: false,
      reason: 'URL mesti bermula dengan https://script.google.com/macros/s/...'
    };
  }

  return { valid: true };
}

/**
 * Fetch all visitors from Google Sheets
 */
export async function fetchVisitorsFromSheet(): Promise<Visitor[] | null> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return null;

  const validation = isValidGoogleAppsScriptUrl(apiUrl);
  if (!validation.valid) {
    console.warn('Google Sheet URL validation notice:', validation.reason);
    return null;
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`Google Sheet request returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        id: String(item.id || ''),
        name: String(item.name || ''),
        icOrPassport: String(item.icOrPassport || ''),
        phone: String(item.phone || ''),
        vehiclePlate: String(item.vehiclePlate || ''),
        purpose: String(item.purpose || ''),
        checkInTime: String(item.checkInTime || new Date().toISOString()),
        checkOutTime: item.checkOutTime ? String(item.checkOutTime) : null,
        status: item.status === 'CHECKED_OUT' ? 'CHECKED_OUT' : 'ACTIVE',
      }));
    }
    return null;
  } catch (error) {
    // Graceful fallback without throwing noisy uncaught exceptions
    console.warn('Gagal memuat turun data dari Google Sheets. Menggunakan storan tempatan:', error);
    return null;
  }
}

/**
 * Append new visitor to Google Sheets
 */
export async function addVisitorToSheet(visitor: Visitor): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  const validation = isValidGoogleAppsScriptUrl(apiUrl);
  if (!validation.valid) return false;

  try {
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors', // Use no-cors for Google Apps Script Web App redirection compatibility
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'ADD',
        visitor,
      }),
    });
    return true;
  } catch (error) {
    console.warn('Gagal menambah data ke Google Sheets:', error);
    return false;
  }
}

/**
 * Update checkout time for visitor in Google Sheets
 */
export async function checkOutVisitorInSheet(id: string, checkOutTime: string): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  const validation = isValidGoogleAppsScriptUrl(apiUrl);
  if (!validation.valid) return false;

  try {
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'CHECK_OUT',
        id,
        checkOutTime,
      }),
    });
    return true;
  } catch (error) {
    console.warn('Gagal mengemaskini daftar keluar ke Google Sheets:', error);
    return false;
  }
}

