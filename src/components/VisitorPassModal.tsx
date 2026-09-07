import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, QrCode, Download, ShieldCheck, Clock, User, Car, FileText, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { Visitor } from '../types';

interface VisitorPassModalProps {
  visitor: Visitor | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VisitorPassModal({ visitor, isOpen, onClose }: VisitorPassModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visitor && isOpen) {
      // Encode standard format: SKM-PASS:<ID>
      const qrPayload = `SKM-PASS:${visitor.id}`;
      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Gagal menjana Kod QR:', err));
    }
  }, [visitor, isOpen]);

  if (!isOpen || !visitor) return null;

  const handlePrintPass = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `PAS_QR_${visitor.name.replace(/\s+/g, '_')}_${visitor.id.slice(0, 6)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      {/* Backdrop (hidden when printing) */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-0 print:rounded-none print:w-full print:max-w-none print:max-h-none print:overflow-visible">
        
        {/* Modal Top Actions (hidden when printing) */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/80 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
            <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Pas Pelawat Rasmi (Kod QR)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Container - Scrollable on small screens */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center text-center print:p-8 print:overflow-visible">
          {/* Pass Badge Frame */}
          <div className="w-full border-2 border-dashed border-slate-300 rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden print:border-slate-800 print:bg-white">
            
            {/* Top School Header */}
            <div className="flex items-center justify-center gap-3 pb-3 sm:pb-4 border-b border-slate-200">
              <img 
                src="https://i.postimg.cc/bwhChtbs/SKM.png" 
                alt="Logo SK Morib" 
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
              />
              <div className="text-left">
                <h3 className="font-black text-sm sm:text-lg text-slate-900 tracking-tight leading-tight">
                  SEKOLAH KEBANGSAAN MORIB
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-blue-700 font-mono uppercase">
                  <span>KOD: BBA1026</span>
                  <span>•</span>
                  <span>PAS PELAWAT</span>
                </div>
              </div>
            </div>

            {/* Status Pill */}
            <div className="my-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                visitor.status === 'ACTIVE'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {visitor.status === 'ACTIVE' ? 'Status: Dalam Kawasan' : 'Status: Telah Selesai'}
              </span>
            </div>

            {/* QR Code Frame */}
            <div className="my-1.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs inline-block mx-auto">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Kod QR Pas Pelawat" 
                  className="w-40 h-40 sm:w-52 sm:h-52 object-contain mx-auto"
                />
              ) : (
                <div className="w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center bg-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-semibold">Menjana Kod QR...</span>
                </div>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-500 mt-1 mb-3">
              Imbas kod ini di Pondok Pengawal semasa keluar untuk daftar keluar automatik.
            </p>

            {/* Visitor Details Block */}
            <div className="bg-white/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-start border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Nama:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px]">{visitor.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">No. KP:</span>
                <span className="font-mono font-bold text-slate-800">{visitor.icOrPassport}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Kenderaan:</span>
                <span className="font-mono font-bold uppercase text-slate-800">{visitor.vehiclePlate || 'TIADA'}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Tujuan:</span>
                <span className="font-semibold text-slate-800 text-right">{visitor.purpose}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Masa Masuk:</span>
                <span className="font-mono font-bold text-blue-700">
                  {new Date(visitor.checkInTime).toLocaleString('ms-MY', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
            </div>

            {/* Footer warning on badge */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 text-[10px] text-slate-500 leading-tight">
              Sila pakai pas ini sepanjang masa berada di dalam kawasan sekolah. Pulangkan kepada pengawal sebelum meninggalkan sekolah.
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions (Always pinned and visible on laptop and mobile) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 shrink-0 print:hidden">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition-all active:scale-95 min-h-[42px]"
          >
            <Download className="w-4 h-4 shrink-0 text-slate-600" />
            <span className="truncate">Simpan QR</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPass}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 min-h-[42px]"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="truncate">Cetak Pas</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 font-semibold text-xs rounded-xl transition-all active:scale-95 min-h-[42px]"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
