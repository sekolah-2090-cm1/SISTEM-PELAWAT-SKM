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
 * Fetch all visitors from Google Sheets
 */
export async function fetchVisitorsFromSheet(): Promise<Visitor[] | null> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return null;

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
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
    console.error('Error fetching visitors from Google Sheets:', error);
    return null;
  }
}

/**
 * Append new visitor to Google Sheets
 */
export async function addVisitorToSheet(visitor: Visitor): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  try {
    await fetch(apiUrl, {
      method: 'POST',
      // Using text/plain prevents CORS preflight triggers for Google Apps Script Web App
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
    console.error('Error syncing visitor to Google Sheets:', error);
    return false;
  }
}

/**
 * Update checkout time for visitor in Google Sheets
 */
export async function checkOutVisitorInSheet(id: string, checkOutTime: string): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  try {
    await fetch(apiUrl, {
      method: 'POST',
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
    console.error('Error updating check out in Google Sheets:', error);
    return false;
  }
}
