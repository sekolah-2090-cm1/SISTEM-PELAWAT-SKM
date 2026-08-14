import React, { useState } from 'react';
import { X, Table, Check, ExternalLink, RefreshCw, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { getGoogleSheetApiUrl, setGoogleSheetApiUrl, fetchVisitorsFromSheet, isValidGoogleAppsScriptUrl } from '../services/sheetsService';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export default function SheetSettingsModal({ isOpen, onClose, onSyncComplete }: SheetSettingsModalProps) {
  const [url, setUrl] = useState(getGoogleSheetApiUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
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

  const handleTestConnection = async () => {
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

    // Temporarily save url to test
    setGoogleSheetApiUrl(url);

    const visitors = await fetchVisitorsFromSheet();
    setIsTesting(false);

    if (visitors !== null) {
      setTestResult({
        success: true,
        message: `Sambungan berjaya! ${visitors.length} rekod ditemui dalam Google Sheets.`
      });
      if (onSyncComplete) onSyncComplete();
    } else {
      setTestResult({
        success: false,
        message: 'Gagal menyambung (Failed to fetch). Sila pastikan Web App telah di-deploy dengan tetapan "Who has access: Anyone" (bukan "Only myself" atau terhad kepada organisasi).'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-6 sm:p-8 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-200/50">
              <Table className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Tetapan Google Sheets Backend</h3>
              <p className="text-xs text-slate-500 font-medium">Sambungan pangkalan data awan percuma</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5">
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
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Format URL wajib bermula dengan <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">https://script.google.com/macros/s/.../exec</code>
            </p>
          </div>

          {/* Test Status feedback */}
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

          {/* Setup Guide Summary */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-2 text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Cara Betul Deploy di Google Sheets (Elak Ralat Fetch):
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
              <li>Di Google Sheet anda, klik <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Klik butang biru <strong>Deploy &gt; New deployment</strong>.</li>
              <li>Pilih jenis <strong>Web app</strong> (ikon gear).</li>
              <li><strong>PENTING:</strong> Di bahagian <em>Who has access</em>, pilih <strong>Anyone</strong> (Sesiapa sahaja).</li>
              <li>Klik <strong>Deploy</strong>, benarkan akses, dan salin URL Web App yang berakhir dengan <code className="font-mono bg-slate-200 px-1 rounded">/exec</code>.</li>
            </ol>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Menguji Sambungan...' : 'Uji Sambungan'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition-all"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                handleSave();
                if (isValidGoogleAppsScriptUrl(url).valid || !url.trim()) {
                  onClose();
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-700/20"
            >
              <Check className="w-4 h-4" />
              Simpan Tetapan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

