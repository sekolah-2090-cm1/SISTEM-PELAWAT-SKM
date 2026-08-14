import React, { useState } from 'react';
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
  Info, 
  ChevronRight,
  Database,
  Sliders,
  BarChart2
} from 'lucide-react';
import { Visitor } from '../types';
import { 
  getGoogleSheetApiUrl, 
  setGoogleSheetApiUrl, 
  fetchVisitorsFromSheet, 
  isValidGoogleAppsScriptUrl,
  GOOGLE_APPS_SCRIPT_TEMPLATE 
} from '../services/sheetsService';
import { ReportConfig } from './ReportPrintView';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitors: Visitor[];
  onGenerateReport: (config: ReportConfig) => void;
  onSyncComplete?: () => void;
}

export default function AdminModal({ 
  isOpen, 
  onClose, 
  visitors, 
  onGenerateReport,
  onSyncComplete 
}: AdminModalProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'pdf' | 'sheets' | 'export'>('pdf');
  
  // PDF Report State
  const [reportType, setReportType] = useState<'mingguan' | 'bulanan' | 'tahunan' | 'kustom'>('bulanan');
  const now = new Date();
  
  // Date pickers
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = this week, -1 = last week
  const [customStartDate, setCustomStartDate] = useState<string>(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(now.toISOString().split('T')[0]);

  // Google Sheets state
  const [url, setUrl] = useState(getGoogleSheetApiUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);

  if (!isOpen) return null;

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

  const { start: previewStart, end: previewEnd, title: previewTitle } = getDateRange();
  
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
        message: 'Gagal menyambung. Sila pastikan Google Apps Script telah di-deploy dengan tetapan "Who has access: Anyone" dan kod Apps Script terkini telah ditampal.'
      });
    }
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
      <div className="relative w-full max-w-3xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-6 sm:p-8 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-200/80 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Panel Pentadbir & Pengurusan</h3>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] uppercase rounded-full tracking-wider">
                  Admin Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Jana laporan PDF rasmi, selaras Google Sheets, dan pengurusan arkib</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 my-5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 relative z-10">
          <button
            onClick={() => setActiveAdminTab('pdf')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeAdminTab === 'pdf'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Jana Laporan PDF</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('sheets')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeAdminTab === 'sheets'
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeAdminTab === 'export'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Eksport Data</span>
          </button>
        </div>

        {/* Tab 1: Jana Laporan PDF */}
        {activeAdminTab === 'pdf' && (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 relative z-10 animate-in fade-in duration-150">
            
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

        {/* Tab 2: Pangkalan Data Google Sheets */}
        {activeAdminTab === 'sheets' && (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 relative z-10 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/AKfycby.../exec"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Pastikan URL bermula dengan <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">https://script.google.com/macros/s/.../exec</code>
              </p>
            </div>

            {/* Test Status Feedback */}
            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
                testResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {testResult.success ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div className="font-medium leading-relaxed">{testResult.message}</div>
              </div>
            )}

            {/* Actions for Sheet */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestSheetConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Menguji Sambungan...' : 'Uji Sambungan Google Sheets'}
              </button>

              <button
                type="button"
                onClick={handleSaveSheetUrl}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-700/20"
              >
                <Check className="w-4 h-4" />
                Simpan Tetapan URL
              </button>
            </div>

            {/* Apps Script Code Helper & Copy Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Kod Google Apps Script Rasmi</span>
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
                Jika rekod belum masuk ke Google Sheet anda, buka Google Sheet &gt; <strong>Extensions &gt; Apps Script</strong>, padam kod lama dan tampal kod rasmi ini, kemudian klik <strong>Deploy &gt; Manage deployments &gt; Edit &gt; New version &gt; Deploy</strong>.
              </p>
            </div>

          </div>
        )}

        {/* Tab 3: Eksport Data */}
        {activeAdminTab === 'export' && (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 relative z-10 animate-in fade-in duration-150">
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

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200/70 flex justify-end relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
