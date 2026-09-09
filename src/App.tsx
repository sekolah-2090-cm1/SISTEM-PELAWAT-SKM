import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Clock as ClockIcon, 
  Activity, 
  Download, 
  ClipboardList, 
  BarChart3, 
  UserPlus, 
  RefreshCw, 
  Lock, 
  Printer, 
  FileText, 
  Camera, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  X, 
  Sparkles,
  Database
} from 'lucide-react';
import { Visitor } from './types';
import VisitorForm from './components/VisitorForm';
import VisitorList from './components/VisitorList';
import VisitorDetailModal from './components/VisitorDetailModal';
import VisitorAnalyticsChart from './components/VisitorAnalyticsChart';
import AdminModal from './components/AdminModal';
import ReportPrintView, { ReportConfig } from './components/ReportPrintView';
import QRScannerModal from './components/QRScannerModal';
import VisitorPassModal from './components/VisitorPassModal';
import { 
  getGoogleSheetApiUrl, 
  setGoogleSheetApiUrl,
  syncConfigWithServer,
  fetchVisitorsFromSheet, 
  addVisitorToSheet, 
  checkOutVisitorInSheet,
  mergeVisitors
} from './services/sheetsService';
import {
  isSupabaseConfigured,
  setSupabaseConfig,
  syncSupabaseConfigWithServer,
  fetchVisitorsFromSupabase,
  addVisitorToSupabase,
  checkOutVisitorInSupabase,
  subscribeToVisitorChanges
} from './services/supabaseService';

// Helper to guarantee unique IDs across any visitor list
function sanitizeVisitorsList(list: any[]): Visitor[] {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  return list.map((item: any, index: number) => {
    let rawId = item?.id ? String(item.id).trim() : '';
    if (!rawId || seenIds.has(rawId)) {
      rawId = rawId ? `${rawId}_${index}_${crypto.randomUUID().slice(0, 4)}` : crypto.randomUUID();
    }
    seenIds.add(rawId);

    return {
      id: rawId,
      name: String(item?.name || ''),
      icOrPassport: String(item?.icOrPassport || ''),
      phone: String(item?.phone || ''),
      vehiclePlate: String(item?.vehiclePlate || ''),
      purpose: String(item?.purpose || ''),
      checkInTime: String(item?.checkInTime || new Date().toISOString()),
      checkOutTime: item?.checkOutTime ? String(item.checkOutTime) : null,
      status: item?.status === 'CHECKED_OUT' ? 'CHECKED_OUT' : 'ACTIVE',
    };
  });
}

export default function App() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const visitorsRef = useRef<Visitor[]>(visitors);
  visitorsRef.current = visitors;

  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'pendaftaran' | 'senarai' | 'analisis'>('pendaftaran');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Real-time synchronization state
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSheetConfig, setHasSheetConfig] = useState(false);
  const [hasSupabaseConfig, setHasSupabaseConfig] = useState(isSupabaseConfigured());
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [activeReportConfig, setActiveReportConfig] = useState<ReportConfig | null>(null);
  
  // QR Scanner & Visitor Pass Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [passVisitor, setPassVisitor] = useState<Visitor | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  // Broadcast channel for multi-tab synchronization on the same device
  const broadcastSync = useCallback(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('sk_morib_visitors_channel');
        bc.postMessage({ type: 'LOCAL_DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch (e) {}
    }
  }, []);

  // Multi-device Cloud Sync Engine (Supabase Real-Time + Google Sheets)
  const isAutoUploadingToSupabase = useRef(false);

  const syncWithCloud = useCallback(async (silent = false) => {
    const isSupabase = isSupabaseConfigured();
    setHasSupabaseConfig(isSupabase);

    const sheetUrl = getGoogleSheetApiUrl();
    const isSheet = !!sheetUrl;
    setHasSheetConfig(isSheet);

    if (!isSupabase && !isSheet) return;

    if (!silent) setIsSyncing(true);

    try {
      let cloudVisitors: Visitor[] | null = null;
      if (isSupabase) {
        cloudVisitors = await fetchVisitorsFromSupabase();

        // If Supabase is empty (0 records), check if Google Sheets has the records (e.g. 17 records)
        // and automatically populate Supabase with them so all phones and devices receive them instantly!
        if (isSheet && (!cloudVisitors || cloudVisitors.length === 0)) {
          try {
            const sheetVisitors = await fetchVisitorsFromSheet();
            if (sheetVisitors && sheetVisitors.length > 0) {
              console.log(`Menjumpai ${sheetVisitors.length} rekod di Google Sheets. Menyegerakkan ke Supabase...`);
              for (const sv of sheetVisitors) {
                await addVisitorToSupabase(sv);
              }
              const refreshed = await fetchVisitorsFromSupabase();
              cloudVisitors = refreshed || sheetVisitors;
            }
          } catch (sheetErr) {
            console.warn('Gagal muat turun dari Google Sheet untuk Supabase:', sheetErr);
          }
        }
      } else if (isSheet) {
        cloudVisitors = await fetchVisitorsFromSheet();
      }

      if (cloudVisitors && Array.isArray(cloudVisitors)) {
        // AUTO-MIGRATE: If this device has local visitors that are not yet in Supabase
        // (e.g. 17 records recorded on laptop before Supabase was connected),
        // automatically push them up to Supabase so the phone and all other devices receive them!
        if (isSupabase && visitorsRef.current.length > 0 && !isAutoUploadingToSupabase.current) {
          const missingInCloud = visitorsRef.current.filter(
            (local) => !cloudVisitors!.some((cloud) => String(cloud.id) === String(local.id))
          );

          if (missingInCloud.length > 0) {
            isAutoUploadingToSupabase.current = true;
            console.log(`Auto-uploading ${missingInCloud.length} local visitors to Supabase...`);
            try {
              for (const v of missingInCloud) {
                await addVisitorToSupabase(v);
              }
              const freshCloud = await fetchVisitorsFromSupabase();
              if (freshCloud) {
                cloudVisitors = freshCloud;
              }
            } catch (upErr) {
              console.warn('Auto-upload to Supabase failed:', upErr);
            } finally {
              isAutoUploadingToSupabase.current = false;
            }
          }
        }

        // Smart merge resolves cross-device updates without wiping recent local inputs
        const merged = mergeVisitors(visitorsRef.current, cloudVisitors);
        const sanitized = sanitizeVisitorsList(merged);
        
        setVisitors(sanitized);
        localStorage.setItem('school_visitors', JSON.stringify(sanitized));
        setLastSyncedAt(new Date());
        setIsOnline(true);
      }
    } catch (error) {
      console.warn('Sync attempt warning:', error);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, []);

  // 1. Check URL parameters for instant phone pairing via QR code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const setupSheet = params.get('setup_sheet');
      if (setupSheet) {
        setGoogleSheetApiUrl(setupSheet);
        setHasSheetConfig(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const supabaseUrlParam = params.get('setup_supabase_url');
      const supabaseKeyParam = params.get('setup_supabase_key');
      if (supabaseUrlParam && supabaseKeyParam) {
        setSupabaseConfig(supabaseUrlParam, supabaseKeyParam);
        setHasSupabaseConfig(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // 2. Initial Data Load & Central Server Config Check
  useEffect(() => {
    const saved = localStorage.getItem('school_visitors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVisitors(sanitizeVisitorsList(parsed));
      } catch (e) {
        console.error('Failed to parse visitors from local storage');
      }
    }

    // Check server-config.json so mobile guards inherit Supabase settings automatically
    Promise.all([
      syncConfigWithServer(),
      syncSupabaseConfigWithServer()
    ]).then(() => {
      setHasSheetConfig(!!getGoogleSheetApiUrl());
      setHasSupabaseConfig(isSupabaseConfigured());
      syncWithCloud(false);
    });
  }, [syncWithCloud]);

  // 3. Supabase Real-Time Subscription (Instant sub-second updates across all laptops & phones)
  useEffect(() => {
    if (!hasSupabaseConfig) return;

    const unsubscribe = subscribeToVisitorChanges(() => {
      syncWithCloud(true);
    });

    return () => {
      unsubscribe();
    };
  }, [hasSupabaseConfig, syncWithCloud]);

  // 4. Real-Time Multi-Device Sync Listeners (Polling & Focus triggers)
  useEffect(() => {
    // A. Background fallback polling every 12 seconds
    const pollTimer = setInterval(() => {
      syncWithCloud(true);
    }, 12000);

    // B. Re-sync when user returns to the tab or unlocks their smartphone
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncWithCloud(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // C. Re-sync when window gains focus (switching windows on laptop or tablet)
    const handleFocus = () => {
      syncWithCloud(true);
    };
    window.addEventListener('focus', handleFocus);

    // D. Network state changes
    const handleOnline = () => {
      setIsOnline(true);
      syncWithCloud(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // E. Cross-tab synchronization
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('sk_morib_visitors_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'LOCAL_DATA_UPDATED') {
            const latest = localStorage.getItem('school_visitors');
            if (latest) {
              try {
                setVisitors(sanitizeVisitorsList(JSON.parse(latest)));
              } catch (e) {}
            }
          }
        };
      } catch (e) {}
    }

    return () => {
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (channel) {
        try { channel.close(); } catch (e) {}
      }
    };
  }, [syncWithCloud]);

  // 3. Save to localStorage whenever visitors change & notify other tabs
  useEffect(() => {
    localStorage.setItem('school_visitors', JSON.stringify(visitors));
  }, [visitors]);

  // 4. Update Clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Add Visitor
  const handleAddVisitor = async (visitorData: Omit<Visitor, 'id' | 'checkInTime' | 'checkOutTime' | 'status'>) => {
    const newVisitor: Visitor = {
      ...visitorData,
      id: crypto.randomUUID(),
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: 'ACTIVE',
    };
    
    // Optimistic UI update
    setVisitors((prev) => [newVisitor, ...prev]);
    setActiveTab('senarai');

    // Prompt Visitor Pass with QR Code
    setPassVisitor(newVisitor);
    setIsPassModalOpen(true);

    // Broadcast update to other tabs/windows
    broadcastSync();

    // Async sync to Supabase (primary) and/or Google Sheets
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      await addVisitorToSupabase(newVisitor);
      setIsSyncing(false);
      setLastSyncedAt(new Date());
    }
    if (getGoogleSheetApiUrl()) {
      setIsSyncing(true);
      await addVisitorToSheet(newVisitor);
      setIsSyncing(false);
      setLastSyncedAt(new Date());
    }
  };

  // Handle Check Out Visitor
  const handleCheckOut = async (id: string) => {
    const checkOutTime = new Date().toISOString();
    
    // Optimistic UI update
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: 'CHECKED_OUT', checkOutTime }
          : v
      )
    );

    // Broadcast update to other tabs/windows
    broadcastSync();

    // Async sync to Supabase (primary) and/or Google Sheets
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      await checkOutVisitorInSupabase(id, checkOutTime);
      setIsSyncing(false);
      setLastSyncedAt(new Date());
    }
    if (getGoogleSheetApiUrl()) {
      setIsSyncing(true);
      await checkOutVisitorInSheet(id, checkOutTime);
      setIsSyncing(false);
      setLastSyncedAt(new Date());
    }
  };

  const handleShowPass = (visitor: Visitor) => {
    setPassVisitor(visitor);
    setIsPassModalOpen(true);
  };

  // Compute stats for today
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  
  const visitorsToday = visitors.filter(
    (v) => new Date(v.checkInTime).toLocaleDateString() === todayStr
  );
  const activeVisitors = visitorsToday.filter((v) => v.status === 'ACTIVE').length;
  const totalToday = visitorsToday.length;

  // Analytics Stats
  const getWeekNumber = (d: Date) => {
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const totalThisWeek = visitors.filter(v => {
    const date = new Date(v.checkInTime);
    return getWeekNumber(date) === getWeekNumber(now) && date.getFullYear() === now.getFullYear();
  }).length;

  const totalThisMonth = visitors.filter(v => {
    const date = new Date(v.checkInTime);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const totalThisYear = visitors.filter(v => {
    const date = new Date(v.checkInTime);
    return date.getFullYear() === now.getFullYear();
  }).length;

  const handleExportCSV = () => {
    if (visitorsToday.length === 0) return;

    const headers = ['Nama Penuh', 'No. KP / Pasport', 'No. Telefon', 'No. Kenderaan', 'Tujuan', 'Masa Masuk', 'Masa Keluar', 'Status'];
    
    const csvContent = [
      headers.join(','),
      ...visitorsToday.map(v => {
        return [
          `"${v.name}"`,
          `"${v.icOrPassport}"`,
          `"${v.phone}"`,
          `"${v.vehiclePlate || '-'}"`,
          `"${v.purpose}"`,
          `"${new Date(v.checkInTime).toLocaleString('ms-MY')}"`,
          `"${v.checkOutTime ? new Date(v.checkOutTime).toLocaleString('ms-MY') : '-'}"`,
          `"${v.status === 'ACTIVE' ? 'Dalam Kawasan' : 'Telah Keluar'}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Pelawat_${new Date().toLocaleDateString('ms-MY').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for formatted last sync text
  const getLastSyncText = () => {
    if (!hasSheetConfig) return 'Storan Tempatan (Offline-Ready)';
    if (!isOnline) return 'Luar Talian (Data Tersimpan)';
    if (isSyncing) return 'Menyegerak data...';
    if (!lastSyncedAt) return 'Bersambung ke Cloud';
    
    const diffSec = Math.round((Date.now() - lastSyncedAt.getTime()) / 1000);
    if (diffSec < 15) return 'Data Terkini (Disegerak)';
    if (diffSec < 60) return `Segerak ${diffSec}s lepas`;
    return `Segerak ${Math.round(diffSec / 60)}m lepas`;
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-200">
      {/* Background Soft Blobs for Ambient Contrast */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-indigo-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-sky-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none"></div>

      {/* ========================================================= */}
      {/* HEADER: Fully responsive for Phones, Tablets, and Laptops */}
      {/* ========================================================= */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/70 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* School Brand & Sync Status Row */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 sm:p-2 rounded-xl border border-slate-200 shadow-xs shrink-0">
                  <img 
                    src="https://i.postimg.cc/bwhChtbs/SKM.png" 
                    alt="Logo SK Morib" 
                    className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-xs" 
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                      Sistem Kawalan Pengawal
                    </h1>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold text-[10px] sm:text-[11px] rounded-md border border-blue-200">
                      BBA1026
                    </span>
                  </div>
                  <p className="text-blue-700 text-xs font-semibold tracking-wide flex items-center gap-1.5">
                    <span>SK Morib</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500 font-normal">Pondok Keselamatan</span>
                  </p>
                </div>
              </div>

              {/* Mobile Sync Indicator (Pill) */}
              <div className="sm:hidden">
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  !isOnline 
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : (hasSupabaseConfig || hasSheetConfig) 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    !isOnline 
                      ? 'bg-amber-500' 
                      : (hasSupabaseConfig || hasSheetConfig) 
                        ? (isSyncing ? 'bg-blue-500 animate-spin' : 'bg-emerald-500 animate-pulse') 
                        : 'bg-slate-400'
                  }`}></span>
                  <span>
                    {!isOnline 
                      ? 'Offline' 
                      : isSyncing 
                        ? 'Segerak...' 
                        : hasSupabaseConfig 
                          ? 'Supabase Live' 
                          : hasSheetConfig 
                            ? 'Sheets' 
                            : 'Tempatan'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions & Live Clocks Row */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
              
              {/* Desktop Live Sync Status Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200/80 text-xs">
                {isOnline ? (
                  hasSupabaseConfig ? (
                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Supabase Cloud (Masa Nyata)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </span>
                  ) : hasSheetConfig ? (
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Google Sheets ({getLastSyncText()})</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span>Storan Tempatan</span>
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>Luar Talian</span>
                  </span>
                )}

                {(hasSupabaseConfig || hasSheetConfig) && (
                  <button
                    type="button"
                    onClick={() => syncWithCloud(false)}
                    disabled={isSyncing}
                    className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                    title="Segerak sekarang dengan pangkalan data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                )}
              </div>

              {/* Big, thumb-friendly QR Scanner Button for Security Guard */}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 border border-blue-400/30"
                title="Buka Pengimbas Kod QR untuk Daftar Keluar Pantas"
              >
                <Camera className="w-4 h-4 text-blue-200 shrink-0" />
                <span>Imbas Pas QR</span>
              </button>

              {/* Admin Hub Button */}
              <button
                type="button"
                onClick={() => setIsAdminOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-95 border border-slate-800"
                title="Buka Panel Pentadbir: Supabase, PDF & Tetapan"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="hidden sm:inline">Pentadbir</span>
                <span className="sm:hidden">Admin</span>
                {(hasSupabaseConfig || hasSheetConfig) ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400 ml-0.5" />
                )}
              </button>

              {/* Mobile Quick Sync Icon Button */}
              {hasSheetConfig && (
                <button
                  type="button"
                  onClick={() => syncWithCloud(false)}
                  disabled={isSyncing}
                  className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center bg-white text-slate-700 border border-slate-200 rounded-xl active:bg-slate-100 transition-colors shadow-xs"
                  title="Segerak Data Sekarang"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              )}

              {/* Digital Clock */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-xl border border-slate-200 shadow-xs min-h-[44px] shrink-0">
                <ClockIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-black font-mono text-slate-800 tracking-wider">
                    {currentTime.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold hidden md:block">
                    {currentTime.toLocaleDateString('ms-MY', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN BODY                                                 */}
      {/* ========================================================= */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 relative z-20">
        
        {/* Navigation Tabs (Touch friendly, min 44px height) */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 bg-slate-200/70 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200 shadow-xs">
          
          <button 
            type="button"
            onClick={() => setActiveTab('pendaftaran')}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 ${
              activeTab === 'pendaftaran' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Pendaftaran</span>
            <span className="hidden sm:inline">Pelawat</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('senarai')}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 ${
              activeTab === 'senarai' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Senarai</span>
            <span className="hidden sm:inline">Terkini</span>
            {visitors.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full font-mono shadow-xs">
                {visitors.length}
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('analisis')}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 ${
              activeTab === 'analisis' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Analisis</span>
            <span className="hidden sm:inline">Pelawat</span>
          </button>

        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          
          {/* ========================================================= */}
          {/* TAB 1: Pendaftaran Pelawat                                */}
          {/* ========================================================= */}
          {activeTab === 'pendaftaran' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
              <VisitorForm onSubmit={handleAddVisitor} />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: Senarai Terkini (Today's Visitors)                 */}
          {/* ========================================================= */}
          {activeTab === 'senarai' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-5 sm:gap-6">
              
              {/* Responsive Quick Stats: 2 columns on Mobile, Tablets, and Desktops */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                
                {/* Total Today Card */}
                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center gap-3.5 sm:gap-5 hover:shadow-md transition-all">
                  <div className="bg-blue-50 p-2.5 sm:p-4 rounded-xl border border-blue-100 shrink-0">
                    <Users className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      Jumlah Hari Ini
                    </p>
                    <h3 className="text-2xl sm:text-4xl font-black text-slate-900 font-mono">
                      {totalToday}
                    </h3>
                  </div>
                </div>

                {/* Active in Premises Card */}
                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center gap-3.5 sm:gap-5 hover:shadow-md transition-all">
                  <div className="bg-amber-50 p-2.5 sm:p-4 rounded-xl border border-amber-200 shrink-0">
                    <Activity className="w-5 h-5 sm:w-7 sm:h-7 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      Dalam Kawasan
                    </p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl sm:text-4xl font-black text-amber-700 font-mono">
                        {activeVisitors}
                      </h3>
                      {activeVisitors > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action and Search Bar */}
              <div className="flex flex-col">
                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-t-2xl shadow-xs border border-slate-200 border-b-0 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                  
                  {/* Title & Live Status */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="w-2 h-5 bg-blue-600 rounded-full"></span>
                      <span>Senarai Pelawat Hari Ini</span>
                    </h2>

                    <span className="md:hidden text-xs text-slate-500 font-mono">
                      {visitorsToday.length} rekod
                    </span>
                  </div>

                  {/* Controls: Search & Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    
                    {/* Search Field */}
                    <div className="relative flex-1 sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari nama, plat kenderaan, IC..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* QR Checkout Quick Button */}
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="min-h-[42px] inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Imbas QR Keluar</span>
                    </button>

                    {/* CSV Export Button */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={visitorsToday.length === 0}
                      className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl transition-all border text-xs sm:text-sm font-bold shrink-0 ${
                        visitorsToday.length === 0 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:scale-95'
                      }`}
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>Eksport CSV</span>
                    </button>

                  </div>

                </div>

                {/* Visitor List Component (Responsive Card + Table Views) */}
                <div className="flex-1 min-h-[450px]">
                  <VisitorList
                    visitors={visitorsToday}
                    onCheckOut={handleCheckOut}
                    searchTerm={searchTerm}
                    onSelectVisitor={setSelectedVisitor}
                    onShowPass={handleShowPass}
                  />
                </div>

              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: Analisis Pelawat (Full Screen Charts & Reports)   */}
          {/* ========================================================= */}
          {activeTab === 'analisis' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 sm:space-y-8">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    <span>Analisis Kekerapan Pelawat</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Statistik pendaftaran pelawat di SK Morib (BBA1026)</p>
                </div>

                <div className="text-xs text-slate-600 font-semibold bg-white/90 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
                  Jumlah Keseluruhan Rekod: <strong className="text-blue-700 font-mono text-sm">{visitors.length}</strong> pelawat
                </div>
              </div>

              {/* 7 Days Bar Chart using Recharts */}
              <VisitorAnalyticsChart visitors={visitors} />
              
              {/* Summary Stats Grid (2 cols on mobile, 4 on desktop) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                
                {/* Hari Ini */}
                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-center items-center text-center">
                  <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px] sm:text-xs">Hari Ini</div>
                  <div className="text-3xl sm:text-5xl font-black text-slate-900 font-mono mt-1">{totalToday}</div>
                  <div className="text-[10px] text-slate-500 mt-1.5 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">{todayStr}</div>
                </div>

                {/* Minggu Ini */}
                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-center items-center text-center">
                  <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px] sm:text-xs">Minggu Ini</div>
                  <div className="text-3xl sm:text-5xl font-black text-blue-600 font-mono mt-1">{totalThisWeek}</div>
                  <div className="text-[10px] text-slate-500 mt-1.5 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">Isnin - Ahad</div>
                </div>

                {/* Bulan Ini */}
                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-center items-center text-center">
                  <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px] sm:text-xs">Bulan Ini</div>
                  <div className="text-3xl sm:text-5xl font-black text-indigo-600 font-mono mt-1">{totalThisMonth}</div>
                  <div className="text-[10px] text-slate-500 mt-1.5 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full truncate max-w-[140px]">
                    {now.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {/* Tahun Ini */}
                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-center items-center text-center">
                  <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px] sm:text-xs">Tahun Ini</div>
                  <div className="text-3xl sm:text-5xl font-black text-purple-600 font-mono mt-1">{totalThisYear}</div>
                  <div className="text-[10px] text-slate-500 mt-1.5 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">{now.getFullYear()}</div>
                </div>

              </div>
              
              {/* PDF Report Generation Action Card */}
              <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
                <div className="relative z-10 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
                    <Printer className="w-3.5 h-3.5" />
                    <span>Laporan Cetakan Rasmi</span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-snug">
                    Jana Laporan PDF Analisis Pelawat
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 leading-relaxed">
                    Hasilkan dokumen PDF rasmi lengkap dengan analisis statistik mingguan, bulanan, atau tahunan berserta ruangan tandatangan pengesahan pentadbir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminOpen(true)}
                  className="relative z-10 min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-blue-50 text-slate-900 hover:text-blue-700 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Buka Penjana PDF</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ========================================================= */}
      {/* MODALS & OVERLAYS                                         */}
      {/* ========================================================= */}

      {/* Visitor Detail Modal */}
      <VisitorDetailModal
        visitor={selectedVisitor}
        allVisitors={visitors}
        onClose={() => setSelectedVisitor(null)}
        onCheckOut={handleCheckOut}
        onShowPass={handleShowPass}
      />

      {/* Camera QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        visitors={visitors}
        onCheckOut={handleCheckOut}
      />

      {/* Visitor Pass (QR Code) Modal */}
      <VisitorPassModal
        visitor={passVisitor}
        isOpen={isPassModalOpen}
        onClose={() => {
          setIsPassModalOpen(false);
          setPassVisitor(null);
        }}
      />

      {/* Admin Modal (Includes PDF Generator & Google Sheets Sync) */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          setHasSheetConfig(!!getGoogleSheetApiUrl());
        }}
        visitors={visitors}
        onGenerateReport={(config) => setActiveReportConfig(config)}
        onSyncComplete={() => syncWithCloud(false)}
      />

      {/* Printable PDF Report View */}
      {activeReportConfig && (
        <ReportPrintView
          config={activeReportConfig}
          visitors={visitors}
          onClose={() => setActiveReportConfig(null)}
        />
      )}
    </div>
  );
}
