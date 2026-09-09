import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Table, 
  Download, 
  Calendar, 
  Printer, 
  RefreshCw, 
  Check, 
  Copy, 
  AlertTriangle,
  AlertCircle,
  Info, 
  Database,
  Sliders,
  BarChart2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Send,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Smartphone,
  Share2,
  Sparkles,
  UploadCloud,
  Server
} from 'lucide-react';
import QRCode from 'qrcode';
import { Visitor } from '../types';
import { 
  getGoogleSheetApiUrl, 
  setGoogleSheetApiUrl, 
  fetchVisitorsFromSheet, 
  addVisitorToSheet,
  isValidGoogleAppsScriptUrl,
  GOOGLE_APPS_SCRIPT_TEMPLATE 
} from '../services/sheetsService';
import {
  getSupabaseConfig,
  setSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
  addVisitorToSupabase,
  SUPABASE_SQL_SCHEMA
} from '../services/supabaseService';
import { ReportConfig } from './ReportPrintView';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitors: Visitor[];
  onGenerateReport: (config: ReportConfig) => void;
  onSyncComplete?: () => void;
}

const STORAGE_KEY_ADMIN_PASS = 'admin_security_password';
const DEFAULT_PASSWORD = '1234';

export default function AdminModal({ 
  isOpen, 
  onClose, 
  visitors, 
  onGenerateReport,
  onSyncComplete 
}: AdminModalProps) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Change Password State
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState<string | null>(null);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  const [activeAdminTab, setActiveAdminTab] = useState<'supabase' | 'sheets' | 'pdf' | 'export' | 'security'>('supabase');
  
  // PDF Report State
  const [reportType, setReportType] = useState<'mingguan' | 'bulanan' | 'tahunan' | 'kustom'>('bulanan');
  const now = new Date();
  
  // Date pickers
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = this week, -1 = last week
  const [customStartDate, setCustomStartDate] = useState<string>(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(now.toISOString().split('T')[0]);

  // Supabase State
  const initialSupabaseConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabaseConfig.url || 'https://moxrzumujiaoeichubxy.supabase.co');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialSupabaseConfig.anonKey);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabasePairQrUrl, setSupabasePairQrUrl] = useState<string>('');
  const [copiedSupabasePairLink, setCopiedSupabasePairLink] = useState(false);

  // Google Sheets state
  const [url, setUrl] = useState(getGoogleSheetApiUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTestRow, setIsSendingTestRow] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; isSendTest?: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [phonePairQrUrl, setPhonePairQrUrl] = useState<string>('');
  const [copiedPairLink, setCopiedPairLink] = useState(false);

  // Generate Phone Pairing QR Code for Supabase
  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey && typeof window !== 'undefined') {
      const pairUrl = `${window.location.origin}${window.location.pathname}?setup_supabase_url=${encodeURIComponent(supabaseUrl.trim())}&setup_supabase_key=${encodeURIComponent(supabaseAnonKey.trim())}`;
      QRCode.toDataURL(pairUrl, {
        width: 320,
        margin: 1.5,
        color: { dark: '#047857', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      })
        .then((dataUrl) => setSupabasePairQrUrl(dataUrl))
        .catch(() => setSupabasePairQrUrl(''));
    } else {
      setSupabasePairQrUrl('');
    }
  }, [supabaseUrl, supabaseAnonKey]);

  const handleCopySupabasePairingLink = () => {
    if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
      const pairUrl = `${window.location.origin}${window.location.pathname}?setup_supabase_url=${encodeURIComponent(supabaseUrl.trim())}&setup_supabase_key=${encodeURIComponent(supabaseAnonKey.trim())}`;
      navigator.clipboard.writeText(pairUrl);
      setCopiedSupabasePairLink(true);
      setTimeout(() => setCopiedSupabasePairLink(false), 3000);
    }
  };

  const handleTestAndSaveSupabase = async () => {
    let cleanUrl = supabaseUrl.trim().replace(/['"\s;]/g, '');
    if (cleanUrl.includes('=')) {
      cleanUrl = cleanUrl.split('=').pop()?.trim() || cleanUrl;
    }
    let cleanKey = supabaseAnonKey.trim().replace(/['"\s;]/g, '');
    if (cleanKey.includes('=')) {
      cleanKey = cleanKey.split('=').pop()?.trim() || cleanKey;
    }

    if (!cleanUrl || !cleanKey) {
      setSupabaseTestResult({
        success: false,
        message: 'Sila lengkapkan Project URL dan anon public key dari dashboard Supabase.',
      });
      return;
    }

    setSupabaseUrl(cleanUrl);
    setSupabaseAnonKey(cleanKey);

    setIsTestingSupabase(true);
    setSupabaseTestResult(null);

    const res = await testSupabaseConnection(cleanUrl, cleanKey);
    setIsTestingSupabase(false);
    setSupabaseTestResult(res);

    if (res.success) {
      setSupabaseConfig(cleanUrl, cleanKey);
      if (onSyncComplete) onSyncComplete();
    }
  };

  const handleUploadAllToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setSupabaseTestResult({
        success: false,
        message: 'Sila sambungkan Supabase terlebih dahulu sebelum memindahkan data.',
      });
      return;
    }

    if (visitors.length === 0) {
      setSupabaseTestResult({
        success: true,
        message: 'Tiada rekod pelawat tempatan untuk dipindahkan.',
      });
      return;
    }

    setIsUploadingToSupabase(true);
    setUploadProgress({ current: 0, total: visitors.length });

    let count = 0;
    for (const v of visitors) {
      const ok = await addVisitorToSupabase(v);
      if (ok) count++;
      setUploadProgress({ current: count, total: visitors.length });
    }

    setIsUploadingToSupabase(false);
    setSupabaseTestResult({
      success: true,
      message: `Berjaya memindahkan ${count} daripada ${visitors.length} rekod pelawat ke pangkalan data Supabase! Anda kini boleh menyemaknya di Table Editor Supabase.`,
    });
    if (onSyncComplete) onSyncComplete();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Generate Phone Pairing QR Code
  useEffect(() => {
    if (url && isValidGoogleAppsScriptUrl(url).valid && typeof window !== 'undefined') {
      const pairUrl = `${window.location.origin}${window.location.pathname}?setup_sheet=${encodeURIComponent(url.trim())}`;
      QRCode.toDataURL(pairUrl, {
        width: 320,
        margin: 1.5,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      })
        .then((dataUrl) => setPhonePairQrUrl(dataUrl))
        .catch(() => setPhonePairQrUrl(''));
    } else {
      setPhonePairQrUrl('');
    }
  }, [url]);

  const handleCopyPairingLink = () => {
    if (typeof window !== 'undefined' && url) {
      const pairUrl = `${window.location.origin}${window.location.pathname}?setup_sheet=${encodeURIComponent(url.trim())}`;
      navigator.clipboard.writeText(pairUrl);
      setCopiedPairLink(true);
      setTimeout(() => setCopiedPairLink(false), 3000);
    }
  };

  // Reset auth when modal opens
  useEffect(() => {
    if (isOpen) {
      setEnteredPassword('');
      setAuthError(null);
      setUrl(getGoogleSheetApiUrl());
      const sc = getSupabaseConfig();
      setSupabaseUrl(sc.url);
      setSupabaseAnonKey(sc.anonKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getSavedPassword = (): string => {
    return localStorage.getItem(STORAGE_KEY_ADMIN_PASS) || DEFAULT_PASSWORD;
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPassword = getSavedPassword();

    // Allow default '1234' or 'admin123' if never changed, or the custom password
    if (
      enteredPassword.trim() === correctPassword ||
      (correctPassword === DEFAULT_PASSWORD && enteredPassword.trim() === 'admin123')
    ) {
      setIsAuthenticated(true);
      setAuthError(null);
      setEnteredPassword('');
    } else {
      setAuthError('Kata laluan tidak sah. Sila cuba lagi.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError(null);
    setPassChangeSuccess(null);

    const savedPass = getSavedPassword();
    if (currentPassInput !== savedPass && !(savedPass === DEFAULT_PASSWORD && currentPassInput === 'admin123')) {
      setPassChangeError('Kata laluan semasa tidak tepat.');
      return;
    }

    if (newPassInput.trim().length < 4) {
      setPassChangeError('Kata laluan baharu mestilah sekurang-kurangnya 4 aksara.');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setPassChangeError('Pengesahan kata laluan baharu tidak sepadan.');
      return;
    }

    localStorage.setItem(STORAGE_KEY_ADMIN_PASS, newPassInput.trim());
    setPassChangeSuccess('Kata laluan pentadbir berjaya dikemaskini!');
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEnteredPassword('');
  };

  // Calculate Date Range based on selection
  const getDateRange = (): { start: Date; end: Date; title: string } => {
    if (reportType === 'mingguan') {
      const current = new Date();
      current.setDate(current.getDate() + selectedWeekOffset * 7);
      
      const day = current.getDay();
      const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
      
      const monday = new Date(current);
      monday.setDate(diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const weekLabel = selectedWeekOffset === 0 ? 'Minggu Ini' : selectedWeekOffset === -1 ? 'Minggu Lepas' : `Minggu (${monday.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })})`;
      return {
        start: monday,
        end: sunday,
        title: `LAPORAN ANALISIS KEHADIRAN PELAWAT MINGGUAN (${weekLabel.toUpperCase()})`,
      };
    }

    if (reportType === 'bulanan') {
      const start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      const monthName = start.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
      return {
        start,
        end,
        title: `LAPORAN ANALISIS KEHADIRAN PELAWAT BULANAN (${monthName.toUpperCase()})`,
      };
    }

    if (reportType === 'tahunan') {
      const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      return {
        start,
        end,
        title: `LAPORAN ANALISIS KEHADIRAN PELAWAT TAHUNAN (TAHUN ${selectedYear})`,
      };
    }

    // Custom
    const start = new Date(customStartDate + 'T00:00:00');
    const end = new Date(customEndDate + 'T23:59:59');
    return {
      start,
      end,
      title: `LAPORAN ANALISIS KEHADIRAN PELAWAT (${customStartDate} HINGGA ${customEndDate})`,
    };
  };

  const { start: previewStart, end: previewEnd } = getDateRange();
  
  // Count records for preview
  const previewCount = visitors.filter((v) => {
    const d = new Date(v.checkInTime);
    return d >= previewStart && d <= previewEnd;
  }).length;

  const handleGenerateClick = () => {
    const { start, end, title } = getDateRange();
    onGenerateReport({
      type: reportType,
      title,
      startDate: start,
      endDate: end,
      schoolName: 'SEKOLAH KEBANGSAAN MORIB',
      schoolCode: 'BBA1026',
      generatedBy: 'Pengawal Keselamatan Bertugas / Pentadbir',
    });
    onClose();
  };

  const handleSaveSheetUrl = () => {
    if (url.trim()) {
      const validation = isValidGoogleAppsScriptUrl(url);
      if (!validation.valid) {
        setTestResult({ success: false, message: validation.reason || 'Format URL tidak sah.' });
        return;
      }
    }
    setGoogleSheetApiUrl(url);
    setTestResult({ success: true, message: 'URL berjaya disimpan!' });
    if (onSyncComplete) onSyncComplete();
  };

  const handleTestSheetConnection = async () => {
    if (!url.trim()) {
      setTestResult({ success: false, message: 'Sila masukkan Web App URL Google Apps Script terlebih dahulu.' });
      return;
    }

    const validation = isValidGoogleAppsScriptUrl(url);
    if (!validation.valid) {
      setTestResult({ success: false, message: validation.reason || 'Format URL tidak sah.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    setGoogleSheetApiUrl(url);
    const cloudVisitors = await fetchVisitorsFromSheet();
    setIsTesting(false);

    if (cloudVisitors !== null) {
      setTestResult({
        success: true,
        message: `Sambungan berjaya! ${cloudVisitors.length} rekod ditemui dalam Google Sheets.`
      });
      if (onSyncComplete) onSyncComplete();
    } else {
      setTestResult({
        success: false,
        message: 'Gagal mengambil data dari Google Sheets. Sila pastikan: (1) Tetapan "Who has access" adalah "Anyone", (2) "Execute as" adalah "Me", dan (3) Kod Apps Script terkini telah di-deploy dengan versi baharu.'
      });
    }
  };

  const handleSendTestRow = async () => {
    if (!url.trim()) {
      setTestResult({ success: false, message: 'Sila masukkan Web App URL terlebih dahulu.' });
      return;
    }

    const validation = isValidGoogleAppsScriptUrl(url);
    if (!validation.valid) {
      setTestResult({ success: false, message: validation.reason || 'Format URL tidak sah.' });
      return;
    }

    setIsSendingTestRow(true);
    setTestResult(null);
    setGoogleSheetApiUrl(url);

    const testVisitor: Visitor = {
      id: `TEST-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
      name: 'UJIAN PENTADBIR SK MORIB',
      icOrPassport: '900101-10-5555',
      phone: '0123456789',
      vehiclePlate: 'WXX 1234',
      purpose: 'Ujian Sambungan Sistem Pengawal',
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: 'ACTIVE'
    };

    await addVisitorToSheet(testVisitor);

    // Wait 1.5 seconds for Google Apps Script execution
    setTimeout(async () => {
      setIsSendingTestRow(false);
      setTestResult({
        success: true,
        isSendTest: true,
        message: `Data ujian berjaya dihantar ke Google Sheets! Sila buka tab Google Sheet anda sekarang untuk melihat baris baharu "${testVisitor.name}".`
      });
      if (onSyncComplete) onSyncComplete();
    }, 1500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleExportAllCSV = () => {
    if (visitors.length === 0) return;

    const headers = ['ID', 'Nama Penuh', 'No. KP / Pasport', 'No. Telefon', 'No. Kenderaan', 'Tujuan', 'Masa Masuk', 'Masa Keluar', 'Status'];
    const csvContent = [
      headers.join(','),
      ...visitors.map(v => [
        `"${v.id}"`,
        `"${v.name}"`,
        `"${v.icOrPassport}"`,
        `"${v.phone}"`,
        `"${v.vehiclePlate || '-'}"`,
        `"${v.purpose}"`,
        `"${new Date(v.checkInTime).toLocaleString('ms-MY')}"`,
        `"${v.checkOutTime ? new Date(v.checkOutTime).toLocaleString('ms-MY') : '-'}"`,
        `"${v.status === 'ACTIVE' ? 'Dalam Kawasan' : 'Telah Keluar'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const blobUrl = URL.createObjectURL(blob);
    link.setAttribute('href', blobUrl);
    link.setAttribute('download', `Semua_Rekod_Pelawat_${now.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthsList = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* --- STATE 1: PASSWORD LOGIN SCREEN --- */}
        {!isAuthenticated ? (
          <div className="p-5 sm:p-8 flex-1 overflow-y-auto relative z-10">
            <div className="flex items-start justify-between pb-5 border-b border-slate-200/80 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-md shadow-slate-900/20">
                  <Lock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Pengesahan Pentadbir</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Sila masukkan kata laluan keselamatan untuk mengakses modul Admin</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-5 py-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Kata Laluan Pentadbir (Admin PIN / Password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="Masukkan kata laluan..."
                    autoFocus
                    className="w-full px-4 py-3.5 pr-12 bg-white border border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {authError && (
                  <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Kata laluan lalai (*default password*): <strong className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">1234</strong></span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Log Masuk Admin</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* --- STATE 2: AUTHENTICATED ADMIN DASHBOARD --- */
          <>
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-200/80 shrink-0 relative z-10">
              <div className="flex items-center gap-3 sm:gap-3.5">
                <div className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20 shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight">Panel Pentadbir SK Morib</h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase rounded-full tracking-wider border border-emerald-200">
                      Disahkan
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">Jana laporan PDF rasmi, selaras Google Sheets, dan tukar kata laluan</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs font-semibold inline-flex items-center gap-1.5"
                  title="Log Keluar Pentadbir"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Kunci Panel</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Navigation - Responsive 2x3 grid on mobile, 5 in a row on tablet/laptop */}
            <div className="p-2 sm:px-6 bg-slate-50/90 border-b border-slate-200/60 shrink-0 relative z-10">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 bg-slate-200/60 p-1.5 rounded-2xl">
                <button
                  onClick={() => setActiveAdminTab('supabase')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
                    activeAdminTab === 'supabase'
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Supabase Cloud</span>
                  <span className="hidden xl:inline-block px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md">
                    Disyorkan
                  </span>
                </button>

                <button
                  onClick={() => setActiveAdminTab('sheets')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeAdminTab === 'sheets'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Table className="w-4 h-4 shrink-0" />
                  <span className="truncate">Google Sheets</span>
                </button>

                <button
                  onClick={() => setActiveAdminTab('pdf')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeAdminTab === 'pdf'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span className="truncate">Jana PDF</span>
                </button>

                <button
                  onClick={() => setActiveAdminTab('export')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeAdminTab === 'export'
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="truncate">Eksport Data</span>
                </button>

                <button
                  onClick={() => setActiveAdminTab('security')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all col-span-2 sm:col-span-1 ${
                    activeAdminTab === 'security'
                      ? 'bg-white text-amber-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span className="truncate">Kata Laluan</span>
                </button>
              </div>
            </div>

            {/* Main Tabs Content - Single Clean Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10">

            {/* Tab 0: Pangkalan Data Supabase Cloud (Disyorkan) */}
            {activeAdminTab === 'supabase' && (
              <div className="space-y-4 relative z-10 animate-in fade-in duration-150">
                {/* Status Card */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-600 text-white rounded-xl">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-emerald-950">Pangkalan Data Berpusat Supabase (Real-Time)</h4>
                        <p className="text-[11px] text-emerald-700">Penyelesaian data serentak untuk telefon bimbit &amp; komputer riba sekolah tanpa kekangan sekatan MOE.</p>
                      </div>
                    </div>
                    {isSupabaseConfigured() ? (
                      <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-black rounded-full flex items-center gap-1 shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>Aktif &amp; Bersambung</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-500 text-white text-[11px] font-bold rounded-full">
                        Belum Dikonfigurasi
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 1: SQL Script */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                      <span>Cipta Jadual di Supabase (Salin &amp; Jalankan SQL)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Skrip Disalin!' : 'Salin Kod SQL'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold inline-flex items-center gap-0.5">Dashboard Supabase <ExternalLink className="w-3 h-3" /></a>, pilih projek anda, klik menu <strong>SQL Editor</strong> di panel sebelah kiri, tampal skrip ini dan tekan butang hijau <strong>Run</strong>.
                  </p>
                </div>

                {/* Step 2: Connection Credentials */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>Masukkan Maklumat Sambungan (Project URL &amp; anon key)</span>
                  </div>

                  {/* Visual Guide on Where to find publishable key */}
                  <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                      <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Di skrin Supabase anda sekarang:</span>
                    </div>
                    <div className="text-[11px] text-emerald-900 space-y-2 leading-relaxed">
                      <div className="p-2.5 bg-white/90 rounded-lg border border-emerald-200 text-xs">
                        <span className="text-slate-500 font-mono text-[10px] block mb-1">Di kotak "Set environment variables" Supabase:</span>
                        <div className="flex items-center justify-between font-mono text-[11px] text-emerald-950 font-bold">
                          <span>SUPABASE_PUBLISHABLE_KEY</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Salin baris ini!</span>
                        </div>
                        <span className="text-slate-600 text-[10px] block mt-0.5">
                          (Kunci ini bermula dengan perkataan <code className="font-bold text-emerald-800">sb_publishable_...</code>)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        *Klik ikon salin (dua segi empat) di sebelah kanan baris <strong>SUPABASE_PUBLISHABLE_KEY</strong> pada skrin Supabase anda dan tampalkan ke bawah.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Project URL
                      </label>
                      <input
                        type="url"
                        value={supabaseUrl}
                        onChange={(e) => {
                          setSupabaseUrl(e.target.value);
                          setSupabaseTestResult(null);
                        }}
                        placeholder="https://moxrzumujiaoeichubxy.supabase.co"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Publishable Key / Anon Key (SUPABASE_PUBLISHABLE_KEY)
                      </label>
                      <textarea
                        rows={2}
                        value={supabaseAnonKey}
                        onChange={(e) => {
                          setSupabaseAnonKey(e.target.value);
                          setSupabaseTestResult(null);
                        }}
                        placeholder="sb_publishable_... atau eyJhbGciOi..."
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestAndSaveSupabase}
                        disabled={isTestingSupabase}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
                      >
                        {isTestingSupabase ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Menguji Sambungan...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Uji &amp; Simpan Sambungan Supabase</span>
                          </>
                        )}
                      </button>

                      {isSupabaseConfigured() && (
                        <button
                          type="button"
                          onClick={handleUploadAllToSupabase}
                          disabled={isUploadingToSupabase}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                          {isUploadingToSupabase ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Memindahkan Data ({uploadProgress?.current}/{uploadProgress?.total})...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-4 h-4" />
                              <span>Pindahkan Semua Rekod ({visitors.length}) ke Supabase</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {supabaseTestResult && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-start gap-2.5 font-medium ${
                        supabaseTestResult.success
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border border-rose-200'
                      }`}
                    >
                      {supabaseTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>{supabaseTestResult.message}</div>
                    </div>
                  )}
                </div>

                {/* Step 3: Instant Phone Pairing Card */}
                {supabaseUrl && supabaseAnonKey && supabasePairQrUrl && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                        <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Pautkan Telefon Pengawal Serta-Merta (Imbas Kod QR)</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                        Automatik
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      Pengawal tidak perlu mengisi sebarang tetapan! Imbas kod QR ini pada telefon bimbit pondok pengawal untuk terus menyegerakkan sistem secara langsung dengan pangkalan data Supabase.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner shrink-0">
                        <img 
                          src={supabasePairQrUrl} 
                          alt="Kod QR Pautkan Supabase" 
                          className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                        />
                      </div>
                      <div className="space-y-2.5 text-left w-full">
                        <div className="text-xs font-bold text-slate-900">
                          Cara Penggunaan:
                        </div>
                        <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                          <li>Buka kamera telefon bimbit pengawal.</li>
                          <li>Halakan ke arah kod QR ini.</li>
                          <li>Tekan pautan yang dipaparkan — semua data akan diselaraskan serta-merta tanpa perlu memasukkan sebarang kunci.</li>
                        </ol>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleCopySupabasePairingLink}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                          >
                            {copiedSupabasePairLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSupabasePairLink ? 'Pautan Disalin!' : 'Salin Pautan Pautkan Telefon (WhatsApp)'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Help: How to view data like Google Sheets in Supabase */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Table className="w-4 h-4 text-emerald-600" />
                      <span>Bagaimana Cara Melihat Data Seperti Google Sheets di Supabase?</span>
                    </div>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Buka Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Di dalam Supabase Dashboard, klik ikon <strong>Table Editor</strong> di menu sebelah kiri dan pilih jadual <strong>visitors</strong>. Anda akan melihat semua nama pelawat, masa masuk, dan maklumat kenderaan dalam bentuk jadual baris dan lajur (seperti Google Sheets). Terdapat butang <strong>Export to CSV</strong> di bucu atas kanan untuk memuat turun fail ke Excel bila-bila masa.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 1: Pangkalan Data Google Sheets */}
            {activeAdminTab === 'sheets' && (
              <div className="space-y-4 relative z-10 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Google Apps Script Web App URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder="https://script.google.com/macros/s/AKfycby.../exec"
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSheetUrl}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan</span>
                    </button>
                  </div>
                </div>

                {/* Test Status Feedback */}
                {testResult && (
                  <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                    testResult.success 
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div className="font-semibold leading-relaxed">{testResult.message}</div>
                  </div>
                )}

                {/* Action Buttons: Test Connection & Send Test Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSendTestRow}
                    disabled={isSendingTestRow}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTestRow ? 'animate-bounce' : ''}`} />
                    <span>{isSendingTestRow ? 'Sedang Menghantar Data Ujian...' : 'Uji Hantar 1 Rekod ke Google Sheet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSheetConnection}
                    disabled={isTesting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all border border-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Menyemak Data...' : 'Semak Rekod Dalam Sheet'}</span>
                  </button>
                </div>

                {/* Instant Mobile Pairing Card (QR Code & Link) */}
                {url && isValidGoogleAppsScriptUrl(url).valid && phonePairQrUrl && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-emerald-50 border-2 border-blue-300 rounded-2xl space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-blue-950">
                        <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Pautkan Telefon Bimbit Pengawal Serta-Merta (Imbas Kod QR)</span>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                        Mudah &amp; Pantas
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      Pengawal tidak perlu menaip URL yang panjang di telefon! Imbas kod QR ini menggunakan kamera telefon bimbit untuk terus membuka sistem dengan pautan Google Sheets yang telah siap disambungkan.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-blue-200 shadow-xs">
                      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner shrink-0">
                        <img 
                          src={phonePairQrUrl} 
                          alt="Kod QR Pautkan Telefon" 
                          className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                        />
                      </div>
                      <div className="space-y-2.5 text-left w-full">
                        <div className="text-xs font-bold text-slate-900">
                          Cara Penggunaan:
                        </div>
                        <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                          <li>Buka aplikasi kamera telefon bimbit atau WhatsApp.</li>
                          <li>Halakan ke arah kod QR di sebelah.</li>
                          <li>Tekan pautan yang muncul — sistem akan terus dibuka dan diselaraskan secara automatik!</li>
                        </ol>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleCopyPairingLink}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                          >
                            {copiedPairLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPairLink ? 'Pautan Berjaya Disalin!' : 'Salin Pautan Pautkan Telefon (WhatsApp)'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Critical Troubleshooting Guide: Why data didn't enter */}
                <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Panduan Utama: Mengapa Data Tidak Masuk ke Google Sheet?</span>
                  </div>
                  <ul className="text-[11px] text-amber-950 space-y-1.5 list-disc list-inside font-medium leading-relaxed pl-1">
                    <li>
                      <strong>Punca Utama (Akaun MOE):</strong> Semasa <em>Deploy Web App</em> di Google Apps Script, tetapan <strong>"Who has access"</strong> mestilah dipilih <strong>"Anyone"</strong> (Sesiapa sahaja). Jangan pilih <em>"Only myself"</em> atau <em>"Kementerian Pendidikan Malaysia"</em> kerana Google akan menyekat penghantaran data dari aplikasi.
                    </li>
                    <li>
                      <strong>Execute as:</strong> Pastikan memilih <strong>"Me"</strong> (Akaun Google anda).
                    </li>
                    <li>
                      <strong>Kemas Kini Skrip:</strong> Setiap kali menukar kod di Apps Script, klik <strong>Deploy &gt; Manage deployments &gt; Edit (Pensel ✏️) &gt; New version &gt; Deploy</strong>.
                    </li>
                  </ul>
                </div>

                {/* Apps Script Code Copy Section */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span>Kod Google Apps Script SK Morib (Terkini &amp; Multi-Channel)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        copiedCode
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Telah Disalin!' : 'Salin Kod Apps Script'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Sila salin kod di atas dan tampal ke dalam <strong>Google Sheet &gt; Extensions &gt; Apps Script</strong> bagi menggantikan kod lama.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Jana Laporan PDF */}
            {activeAdminTab === 'pdf' && (
              <div className="space-y-5 relative z-10 animate-in fade-in duration-150">
                {/* Report Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    1. Pilih Tempoh Analisis
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setReportType('mingguan')}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        reportType === 'mingguan'
                          ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-2 ring-blue-400/20 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-semibold'
                      }`}
                    >
                      <Calendar className="w-5 h-5 mx-auto mb-1.5 opacity-80" />
                      <div className="text-xs">Mingguan</div>
                      <div className="text-[10px] text-slate-400 font-normal">7 Hari (Isnin-Ahad)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportType('bulanan')}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        reportType === 'bulanan'
                          ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-2 ring-blue-400/20 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-semibold'
                      }`}
                    >
                      <BarChart2 className="w-5 h-5 mx-auto mb-1.5 opacity-80" />
                      <div className="text-xs">Bulanan</div>
                      <div className="text-[10px] text-slate-400 font-normal">Pilihan Bulan</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportType('tahunan')}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        reportType === 'tahunan'
                          ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-2 ring-blue-400/20 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-semibold'
                      }`}
                    >
                      <FileText className="w-5 h-5 mx-auto mb-1.5 opacity-80" />
                      <div className="text-xs">Tahunan</div>
                      <div className="text-[10px] text-slate-400 font-normal">Pilihan Tahun</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportType('kustom')}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        reportType === 'kustom'
                          ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-2 ring-blue-400/20 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-semibold'
                      }`}
                    >
                      <Sliders className="w-5 h-5 mx-auto mb-1.5 opacity-80" />
                      <div className="text-xs">Julat Tarikh</div>
                      <div className="text-[10px] text-slate-400 font-normal">Pilihan Sendiri</div>
                    </button>
                  </div>
                </div>

                {/* Filter Configuration Parameters */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Tetapan Parameter ({reportType.toUpperCase()})
                  </label>

                  {reportType === 'mingguan' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedWeekOffset(0)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedWeekOffset === 0
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Minggu Ini (Semasa)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWeekOffset(-1)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedWeekOffset === -1
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Minggu Lepas
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWeekOffset(-2)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedWeekOffset === -2
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        2 Minggu Lepas
                      </button>
                    </div>
                  )}

                  {reportType === 'bulanan' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bulan</label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        >
                          {monthsList.map((m, idx) => (
                            <option key={idx} value={idx}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tahun</label>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        >
                          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {reportType === 'tahunan' && (
                    <div className="max-w-xs">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pilih Tahun Laporan</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      >
                        {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                          <option key={y} value={y}>Tahun {y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {reportType === 'kustom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dari Tarikh</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hingga Tarikh</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary Preview Box */}
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">Status Rekod Untuk Laporan:</span>
                    <span className="text-xs text-blue-700">
                      {previewStart.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })} hingga {previewEnd.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-blue-800 font-mono">{previewCount}</span>
                    <span className="text-xs text-blue-600 ml-1 font-medium">pelawat</span>
                  </div>
                </div>

                {/* Main Action Button */}
                <button
                  type="button"
                  onClick={handleGenerateClick}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/25 hover:scale-[1.01]"
                >
                  <Printer className="w-5 h-5" />
                  <span>Jana & Cetak PDF Rasmi Sekarang</span>
                </button>
              </div>
            )}

            {/* Tab 3: Eksport Data */}
            {activeAdminTab === 'export' && (
              <div className="space-y-5 relative z-10 animate-in fade-in duration-150">
                <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Sandaran Pangkalan Data Penuh</h4>
                      <p className="text-xs text-slate-500 font-medium">Terdapat {visitors.length} jumlah rekod pelawat disimpan</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleExportAllCSV}
                      disabled={visitors.length === 0}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Muat Turun Semua Rekod (CSV)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Tukar Kata Laluan */}
            {activeAdminTab === 'security' && (
              <div className="space-y-4 relative z-10 animate-in fade-in duration-150">
                <form onSubmit={handleChangePassword} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Kemaskini Kata Laluan Pentadbir</span>
                  </div>

                  {passChangeSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{passChangeSuccess}</span>
                    </div>
                  )}

                  {passChangeError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{passChangeError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Kata Laluan Semasa
                    </label>
                    <input
                      type="password"
                      value={currentPassInput}
                      onChange={(e) => setCurrentPassInput(e.target.value)}
                      placeholder="Masukkan kata laluan sedia ada (lalai: 1234)"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Kata Laluan Baharu
                      </label>
                      <input
                        type="password"
                        value={newPassInput}
                        onChange={(e) => setNewPassInput(e.target.value)}
                        placeholder="Sekurang-kurangnya 4 aksara"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Sahkan Kata Laluan Baharu
                      </label>
                      <input
                        type="password"
                        value={confirmPassInput}
                        onChange={(e) => setConfirmPassInput(e.target.value)}
                        placeholder="Ulang kata laluan baharu"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Kata Laluan Baharu
                  </button>
                </form>
              </div>
            )}

            </div>

            {/* Pinned/Sticky Modal Footer - Always visible on all devices */}
            <div className="p-3 sm:px-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0 relative z-10">
              <span className="text-[11px] text-slate-500 font-mono">SK MORIB (BBA1026) ADMIN ACCESS</span>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-95 min-h-[42px]"
              >
                Tutup
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
