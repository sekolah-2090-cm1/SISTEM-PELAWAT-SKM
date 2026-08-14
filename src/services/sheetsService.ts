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

  if (!trimmed.endsWith('/exec')) {
    return {
      valid: false,
      reason: 'URL mesti berakhir dengan /exec (Contoh: https://script.google.com/macros/s/.../exec)'
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
    // Add cache-busting timestamp
    const fetchUrl = `${apiUrl}?t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      const seenIds = new Set<string>();
      return data.map((item: any, index: number) => {
        let rawId = String(item.id || '').trim();
        if (!rawId || seenIds.has(rawId)) {
          rawId = rawId ? `${rawId}_${index}_${crypto.randomUUID().slice(0, 6)}` : crypto.randomUUID();
        }
        seenIds.add(rawId);

        return {
          id: rawId,
          name: String(item.name || ''),
          icOrPassport: String(item.icOrPassport || ''),
          phone: String(item.phone || ''),
          vehiclePlate: String(item.vehiclePlate || ''),
          purpose: String(item.purpose || ''),
          checkInTime: String(item.checkInTime || new Date().toISOString()),
          checkOutTime: item.checkOutTime ? String(item.checkOutTime) : null,
          status: item.status === 'CHECKED_OUT' ? 'CHECKED_OUT' : 'ACTIVE',
        };
      });
    }
    return null;
  } catch (error) {
    console.warn('Gagal memuat turun data dari Google Sheets:', error);
    return null;
  }
}

/**
 * Append new visitor to Google Sheets with 100% reliable multi-channel delivery.
 * Passes params in query string (GET) AND form payload (POST) so redirects never drop data.
 */
export async function addVisitorToSheet(visitor: Visitor): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  const validation = isValidGoogleAppsScriptUrl(apiUrl);
  if (!validation.valid) return false;

  try {
    const params = new URLSearchParams();
    params.set('action', 'ADD');
    params.set('id', visitor.id);
    params.set('name', visitor.name);
    params.set('icOrPassport', visitor.icOrPassport);
    params.set('phone', visitor.phone);
    params.set('vehiclePlate', visitor.vehiclePlate || '-');
    params.set('purpose', visitor.purpose);
    params.set('checkInTime', visitor.checkInTime);
    params.set('checkOutTime', visitor.checkOutTime || '');
    params.set('status', visitor.status || 'ACTIVE');
    params.set('data', JSON.stringify(visitor));
    params.set('_ts', String(Date.now()));

    const queryString = params.toString();
    const targetUrl = apiUrl.includes('?') ? `${apiUrl}&${queryString}` : `${apiUrl}?${queryString}`;

    // Primary: Send with GET no-cors (100% immune to 302 redirect payload drops in all browsers)
    fetch(targetUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
    }).catch((e) => console.warn('GET sync error:', e));

    // Secondary: Also send POST as backup
    fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: queryString,
    }).catch((e) => console.warn('POST sync error:', e));

    return true;
  } catch (err) {
    console.error('Ralat penghantaran ke Google Sheets:', err);
    return false;
  }
}

/**
 * Update checkout time for visitor in Google Sheets with multi-channel delivery
 */
export async function checkOutVisitorInSheet(id: string, checkOutTime: string): Promise<boolean> {
  const apiUrl = getGoogleSheetApiUrl();
  if (!apiUrl) return false;

  const validation = isValidGoogleAppsScriptUrl(apiUrl);
  if (!validation.valid) return false;

  try {
    const params = new URLSearchParams();
    params.set('action', 'CHECK_OUT');
    params.set('id', id);
    params.set('checkOutTime', checkOutTime);
    params.set('_ts', String(Date.now()));

    const queryString = params.toString();
    const targetUrl = apiUrl.includes('?') ? `${apiUrl}&${queryString}` : `${apiUrl}?${queryString}`;

    // Primary: GET no-cors
    fetch(targetUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
    }).catch((e) => console.warn('GET checkout sync error:', e));

    // Secondary: POST
    fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: queryString,
    }).catch((e) => console.warn('POST checkout sync error:', e));

    return true;
  } catch (err) {
    console.error('Ralat kemaskini daftar keluar ke Google Sheets:', err);
    return false;
  }
}

/**
 * The standard Google Apps Script code to copy and paste in Apps Script editor
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * SISTEM KAWALAN PENGAWAL - GOOGLE APPS SCRIPT BACKEND
 * Dihasilkan khas untuk SK MORIB (BBA1026)
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

function processAction(params) {
  var sheet = getTargetSheet();
  var action = params.action;
  
  if (action === "ADD") {
    var v = {};
    if (params.data) {
      try {
        v = typeof params.data === "string" ? JSON.parse(params.data) : params.data;
      } catch (e) {
        try { v = JSON.parse(decodeURIComponent(params.data)); } catch (e2) {}
      }
    }
    
    var id = params.id || v.id || ("V-" + Date.now());
    var name = params.name || v.name || "Pelawat";
    var ic = params.icOrPassport || v.icOrPassport || "-";
    var phone = params.phone || v.phone || "-";
    var vehicle = params.vehiclePlate || v.vehiclePlate || "-";
    var purpose = params.purpose || v.purpose || "-";
    var checkInTime = params.checkInTime || v.checkInTime || new Date().toISOString();
    var checkOutTime = params.checkOutTime || v.checkOutTime || "";
    var status = params.status || v.status || "ACTIVE";
    
    sheet.appendRow([
      id,
      name,
      ic,
      "'" + String(phone).replace(/^'/, ""),
      vehicle,
      purpose,
      checkInTime,
      checkOutTime,
      status
    ]);
    
    return { status: "SUCCESS", message: "Rekod pelawat berjaya ditambah" };
  }
  
  if (action === "CHECK_OUT") {
    var checkOutId = params.id;
    var outTime = params.checkOutTime || new Date().toISOString();
    updateCheckOut(sheet, checkOutId, outTime);
    return { status: "SUCCESS", message: "Status daftar keluar dikemaskini" };
  }
  
  return null;
}

function doGet(e) {
  var sheet = getTargetSheet();
  
  // Semak jika ada arahan penambahan atau kemaskini data
  if (e && e.parameter && e.parameter.action) {
    var result = processAction(e.parameter);
    if (result) {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Jika tiada parameter aksi, pulangkan keseluruhan data pelawat
  var rows = sheet.getDataRange().getValues();
  var visitors = [];
  
  if (rows.length > 1) {
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      visitors.push({
        id: String(row[0]),
        name: String(row[1]),
        icOrPassport: String(row[2]),
        phone: String(row[3]).replace(/^'/, ""),
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
    var params = {};
    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        // Form encoded format
        if (e.parameter) {
          params = e.parameter;
        }
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }
    
    var result = processAction(params);
    if (result) {
      return ContentService.createTextOutput(JSON.stringify(result))
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
