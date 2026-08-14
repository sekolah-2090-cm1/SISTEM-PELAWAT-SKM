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
      reason: 'Ini adalah URL Google Sheets biasa. Sila gunakan Web App URL dari Extensions > Apps Script > Deploy > Web app (bermula dengan https://script.google.com/macros/s/.../exec).'
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
    return null;
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
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
    console.warn('Gagal memuat turun data dari Google Sheets. Menggunakan storan tempatan:', error);
    return null;
  }
}

/**
 * Append new visitor to Google Sheets with robust fallback
 */
export async function addVisitorToSheet(visitor: Visitor): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  const validation = isValidGoogleAppsScriptUrl(apiUrl);
  if (!validation.valid) return false;

  const payload = JSON.stringify({
    action: 'ADD',
    visitor,
  });

  // Attempt 1: Direct POST with text/plain (avoids CORS preflight in modern browsers)
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
    if (response.ok) return true;
  } catch (err) {
    // If CORS or redirect blocks direct response, proceed to fallback
  }

  // Attempt 2: Fallback using no-cors POST
  try {
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
    return true;
  } catch (err) {
    // Attempt 3: Fallback using GET query parameter (100% reliable for firewalls/redirects)
    try {
      const getUrl = new URL(apiUrl);
      getUrl.searchParams.set('action', 'ADD');
      getUrl.searchParams.set('data', encodeURIComponent(JSON.stringify(visitor)));
      await fetch(getUrl.toString(), { method: 'GET', mode: 'no-cors' });
      return true;
    } catch (e) {
      console.warn('Ralat penghantaran ke Google Sheets:', e);
      return false;
    }
  }
}

/**
 * Update checkout time for visitor in Google Sheets with robust fallback
 */
export async function checkOutVisitorInSheet(id: string, checkOutTime: string): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  const validation = isValidGoogleAppsScriptUrl(apiUrl);
  if (!validation.valid) return false;

  const payload = JSON.stringify({
    action: 'CHECK_OUT',
    id,
    checkOutTime,
  });

  // Attempt 1: Standard POST
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
    if (response.ok) return true;
  } catch (err) {
    // Fallback if needed
  }

  // Attempt 2: Fallback with no-cors POST
  try {
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
    return true;
  } catch (err) {
    // Attempt 3: Fallback using GET query parameter
    try {
      const getUrl = new URL(apiUrl);
      getUrl.searchParams.set('action', 'CHECK_OUT');
      getUrl.searchParams.set('id', id);
      getUrl.searchParams.set('checkOutTime', checkOutTime);
      await fetch(getUrl.toString(), { method: 'GET', mode: 'no-cors' });
      return true;
    } catch (e) {
      console.warn('Ralat kemaskini daftar keluar ke Google Sheets:', e);
      return false;
    }
  }
}

/**
 * The standard Google Apps Script code to copy and paste in Apps Script editor
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * SISTEM KAWALAN PENGAWAL - GOOGLE APPS SCRIPT BACKEND
 * Dihasilkan untuk SK MORIB (BBA1026)
 */

function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Pelawat") || ss.getSheets()[0];
  
  // Sediakan header jika helaian masih kosong
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID",
      "Nama Penuh",
      "No. KP / Pasport",
      "No. Telefon",
      "No. Kenderaan",
      "Tujuan Lawatan",
      "Waktu Masuk",
      "Waktu Keluar",
      "Status"
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#e2e8f0");
  }
  return sheet;
}

function doGet(e) {
  var sheet = getTargetSheet();
  
  // Semak jika ada arahan aksi melalui GET (Fallback)
  if (e && e.parameter && e.parameter.action) {
    var action = e.parameter.action;
    if (action === "ADD" && e.parameter.data) {
      var v = JSON.parse(decodeURIComponent(e.parameter.data));
      sheet.appendRow([
        v.id || "",
        v.name || "",
        v.icOrPassport || "",
        "'" + (v.phone || ""),
        v.vehiclePlate || "",
        v.purpose || "",
        v.checkInTime || "",
        v.checkOutTime || "",
        v.status || "ACTIVE"
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "SUCCESS" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "CHECK_OUT" && e.parameter.id) {
      updateCheckOut(sheet, e.parameter.id, e.parameter.checkOutTime || new Date().toISOString());
      return ContentService.createTextOutput(JSON.stringify({ status: "SUCCESS" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Ambil semua data pelawat
  var rows = sheet.getDataRange().getValues();
  var visitors = [];
  
  if (rows.length > 1) {
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue; // Abaikan baris kosong
      visitors.push({
        id: String(row[0]),
        name: String(row[1]),
        icOrPassport: String(row[2]),
        phone: String(row[3]).replace(/^'/, ''),
        vehiclePlate: String(row[4]),
        purpose: String(row[5]),
        checkInTime: row[6] instanceof Date ? row[6].toISOString() : String(row[6]),
        checkOutTime: row[7] ? (row[7] instanceof Date ? row[7].toISOString() : String(row[7])) : null,
        status: String(row[8]) === "CHECKED_OUT" ? "CHECKED_OUT" : "ACTIVE"
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(visitors))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = getTargetSheet();
    var contents;
    
    if (e && e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.data) {
      contents = JSON.parse(e.parameter.data);
    } else {
      throw new Error("Tiada data POST diterima.");
    }
    
    var action = contents.action;
    
    if (action === "ADD") {
      var v = contents.visitor;
      sheet.appendRow([
        v.id,
        v.name,
        v.icOrPassport,
        "'" + (v.phone || ""),
        v.vehiclePlate || "",
        v.purpose,
        v.checkInTime,
        v.checkOutTime || "",
        v.status || "ACTIVE"
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "SUCCESS" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === "CHECK_OUT") {
      updateCheckOut(sheet, contents.id, contents.checkOutTime || new Date().toISOString());
      return ContentService.createTextOutput(JSON.stringify({ status: "SUCCESS" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "UNKNOWN_ACTION" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateCheckOut(sheet, id, checkOutTime) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 8).setValue(checkOutTime);
      sheet.getRange(i + 1, 9).setValue("CHECKED_OUT");
      break;
    }
  }
}
`;
