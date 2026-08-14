import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Search, Clock as ClockIcon, Activity, Download, ClipboardList, BarChart3, UserPlus, Table, RefreshCw, Lock, Printer, FileText } from 'lucide-react';
import { Visitor } from './types';
import VisitorForm from './components/VisitorForm';
import VisitorList from './components/VisitorList';
import VisitorDetailModal from './components/VisitorDetailModal';
import VisitorAnalyticsChart from './components/VisitorAnalyticsChart';
import AdminModal from './components/AdminModal';
import ReportPrintView, { ReportConfig } from './components/ReportPrintView';
import { 
  getGoogleSheetApiUrl, 
  fetchVisitorsFromSheet, 
  addVisitorToSheet, 
  checkOutVisitorInSheet 
} from './services/sheetsService';

export default function App() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'pendaftaran' | 'senarai' | 'analisis'>('pendaftaran');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSheetConfig, setHasSheetConfig] = useState(false);
  const [activeReportConfig, setActiveReportConfig] = useState<ReportConfig | null>(null);

  // Check sheet configuration and load data
  const syncWithCloud = async () => {
    const apiUrl = getGoogleSheetApiUrl();
    setHasSheetConfig(!!apiUrl);
    if (!apiUrl) return;

    setIsSyncing(true);
    const cloudVisitors = await fetchVisitorsFromSheet();
    setIsSyncing(false);

    if (cloudVisitors && cloudVisitors.length > 0) {
      setVisitors(cloudVisitors);
      localStorage.setItem('school_visitors', JSON.stringify(cloudVisitors));
    }
  };

  // Load initial data from localStorage first, then sync with Cloud if available
  useEffect(() => {
    const saved = localStorage.getItem('school_visitors');
    if (saved) {
      try {
        setVisitors(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse visitors from local storage');
      }
    }

    syncWithCloud();
  }, []);

  // Save to localStorage whenever visitors change
  useEffect(() => {
    localStorage.setItem('school_visitors', JSON.stringify(visitors));
  }, [visitors]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

    // Async sync to Google Sheets
    if (getGoogleSheetApiUrl()) {
      setIsSyncing(true);
      await addVisitorToSheet(newVisitor);
      setIsSyncing(false);
    }
  };

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

    // Async sync to Google Sheets
    if (getGoogleSheetApiUrl()) {
      setIsSyncing(true);
      await checkOutVisitorInSheet(id, checkOutTime);
      setIsSyncing(false);
    }
  };

  // Compute stats
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  
  const visitorsToday = visitors.filter(
    (v) => new Date(v.checkInTime).toLocaleDateString() === todayStr
  );
  const activeVisitors = visitorsToday.filter((v) => v.status === 'ACTIVE').length;
  const totalToday = visitorsToday.length;

  // Analytics Stats
  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
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
    if (visitorsToday.length === 0) {
      return;
    }

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

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-200">
      {/* Background Blobs for Glassmorphism Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-30 border-b border-white/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-20 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:py-0 gap-4 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
              <img src="https://i.postimg.cc/bwhChtbs/SKM.png" alt="Logo Sekolah" className="w-10 h-10 object-contain drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight text-slate-800">Sistem Kawalan Pengawal</h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-100 text-blue-700 font-mono font-bold text-[11px] rounded-md border border-blue-200">
                  BBA1026
                </span>
              </div>
              <p className="text-blue-600 text-xs sm:text-sm font-semibold tracking-wide uppercase">SK Morib • Pendaftaran Pelawat</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Admin Hub Button (Contains Google Sheets & PDF Generator) */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] border border-slate-700/50"
              title="Buka Panel Pentadbir: Jana PDF & Sambungan Google Sheets"
            >
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Pentadbir (Admin)</span>
              {hasSheetConfig ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Google Sheets Aktif" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Google Sheets Belum Dikonfigurasi" />
              )}
            </button>

            {/* Quick Sync Button if Configured */}
            {hasSheetConfig && (
              <button
                onClick={syncWithCloud}
                disabled={isSyncing}
                className="p-2.5 bg-white/80 hover:bg-white text-slate-600 hover:text-blue-600 border border-slate-200/80 rounded-xl shadow-sm transition-all"
                title="Segerak data dengan Google Sheets sekarang"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            {/* Clock */}
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-white shadow-sm flex-1 sm:flex-initial">
              <ClockIcon className="w-5 h-5 text-blue-500" />
              <div className="text-left sm:text-right flex-1 sm:flex-initial flex sm:block justify-between items-center sm:items-stretch">
                <div className="text-sm font-bold tracking-wider font-mono text-slate-700">
                  {currentTime.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider hidden sm:block">
                  {currentTime.toLocaleDateString('ms-MY', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white/40 p-2 rounded-2xl backdrop-blur-sm border border-white/50 shadow-sm">
          <button 
            onClick={() => setActiveTab('pendaftaran')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${activeTab === 'pendaftaran' ? 'bg-white text-blue-600 shadow-sm border border-white scale-[1.02]' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Pendaftaran</span> Pelawat
          </button>
          <button 
            onClick={() => setActiveTab('senarai')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${activeTab === 'senarai' ? 'bg-white text-blue-600 shadow-sm border border-white scale-[1.02]' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
          >
            <ClipboardList className="w-4 h-4" />
            Senarai <span className="hidden sm:inline">Terkini</span>
          </button>
          <button 
            onClick={() => setActiveTab('analisis')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${activeTab === 'analisis' ? 'bg-white text-blue-600 shadow-sm border border-white scale-[1.02]' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Analisis <span className="hidden sm:inline">Pelawat</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-500">
          
          {/* TAB 1: Pendaftaran */}
          {activeTab === 'pendaftaran' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <VisitorForm onSubmit={handleAddVisitor} />
            </div>
          )}

          {/* TAB 2: Senarai Terkini */}
          {activeTab === 'senarai' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
              {/* Quick Stats for today only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white flex items-center gap-5 relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 relative z-10">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jumlah Hari Ini</p>
                    <h3 className="text-4xl font-black text-slate-800 font-mono">{totalToday}</h3>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white flex items-center gap-5 relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-100 relative z-10">
                    <Activity className="w-8 h-8 text-amber-500" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Masih Dalam Kawasan</p>
                    <h3 className="text-4xl font-black text-slate-800 font-mono">{activeVisitors}</h3>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="bg-white/70 backdrop-blur-md p-5 rounded-t-2xl shadow-sm border border-white border-b-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-800 tracking-wide flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
                    Senarai Pelawat Hari Ini
                  </h2>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleExportCSV}
                      disabled={visitorsToday.length === 0}
                      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all border shadow-sm text-sm font-bold ${
                        visitorsToday.length === 0 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                          : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      Eksport CSV
                    </button>
                    <div className="relative w-full sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari nama, plat, IC..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-slate-200/60 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all font-medium shadow-inner"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-[500px]">
                  <VisitorList
                    visitors={visitorsToday}
                    onCheckOut={handleCheckOut}
                    searchTerm={searchTerm}
                    onSelectVisitor={setSelectedVisitor}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Analisis */}
          {activeTab === 'analisis' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <BarChart3 className="w-7 h-7 text-blue-600" />
                  Analisis Kekerapan Pelawat
                </h2>
                <div className="text-xs text-slate-500 font-medium bg-white/60 px-4 py-2 rounded-xl border border-white/60 shadow-sm backdrop-blur-sm self-start sm:self-auto">
                  Jumlah Keseluruhan Rekod: <strong className="text-slate-800 font-mono">{visitors.length}</strong> pelawat
                </div>
              </div>

              {/* 7 Days Bar Chart using Recharts */}
              <VisitorAnalyticsChart visitors={visitors} />
              
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Hari Ini */}
                <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-center items-center gap-2">
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Hari Ini</div>
                  <div className="text-5xl font-black text-slate-800 font-mono">{totalToday}</div>
                  <div className="text-xs text-slate-400 mt-2 font-medium bg-slate-100/50 px-3 py-1 rounded-full">{todayStr}</div>
                </div>

                {/* Minggu Ini */}
                <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-center items-center gap-2">
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Minggu Ini</div>
                  <div className="text-5xl font-black text-blue-600 font-mono">{totalThisWeek}</div>
                  <div className="text-xs text-slate-400 mt-2 font-medium bg-slate-100/50 px-3 py-1 rounded-full">Isnin - Ahad</div>
                </div>

                {/* Bulan Ini */}
                <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-center items-center gap-2">
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Bulan Ini</div>
                  <div className="text-5xl font-black text-indigo-600 font-mono">{totalThisMonth}</div>
                  <div className="text-xs text-slate-400 mt-2 font-medium bg-slate-100/50 px-3 py-1 rounded-full">{now.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}</div>
                </div>

                {/* Tahun Ini */}
                <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-center items-center gap-2">
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Tahun Ini</div>
                  <div className="text-5xl font-black text-purple-600 font-mono">{totalThisYear}</div>
                  <div className="text-xs text-slate-400 mt-2 font-medium bg-slate-100/50 px-3 py-1 rounded-full">{now.getFullYear()}</div>
                </div>

              </div>
              
              {/* PDF Report Generation Action Card */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
                <div className="relative z-10 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                    <Printer className="w-3.5 h-3.5" />
                    <span>Laporan Rasmi Sekolah</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                    Jana Laporan PDF Analisis Pelawat
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 leading-relaxed">
                    Hasilkan dokumen PDF rasmi lengkap dengan analisis statistik mingguan, bulanan, atau tahunan berserta ruangan pengesahan pentadbir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminOpen(true)}
                  className="relative z-10 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white hover:bg-blue-50 text-slate-900 hover:text-blue-700 font-bold text-sm rounded-2xl transition-all shadow-lg hover:scale-105 shrink-0"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Buka Penjana PDF</span>
                </button>
              </div>

              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white shadow-sm">
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Nota: Analisis ini memaparkan jumlah pelawat yang mendaftar masuk berdasarkan tarikh yang direkodkan ke dalam sistem. Data disunting dan disegerak bersama Google Sheets & storan tempatan.
                </p>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Visitor Detail Modal */}
      <VisitorDetailModal
        visitor={selectedVisitor}
        allVisitors={visitors}
        onClose={() => setSelectedVisitor(null)}
        onCheckOut={handleCheckOut}
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
        onSyncComplete={syncWithCloud}
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
