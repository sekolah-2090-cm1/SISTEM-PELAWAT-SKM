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
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-0 print:rounded-none print:w-full print:max-w-none">
        
        {/* Modal Top Actions (hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Pas Pelawat Rasmi (Kod QR)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Container */}
        <div ref={printRef} className="p-6 sm:p-8 flex flex-col items-center text-center print:p-8">
          {/* Pass Badge Frame */}
          <div className="w-full border-2 border-dashed border-slate-300 rounded-3xl p-6 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden print:border-slate-800 print:bg-white">
            
            {/* Top School Header */}
            <div className="flex items-center justify-center gap-3 pb-4 border-b border-slate-200">
              <img 
                src="https://i.postimg.cc/bwhChtbs/SKM.png" 
                alt="Logo SK Morib" 
                className="w-12 h-12 object-contain"
              />
              <div className="text-left">
                <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight leading-tight">
                  SEKOLAH KEBANGSAAN MORIB
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 font-mono uppercase">
                  <span>KOD SEKOLAH: BBA1026</span>
                  <span>•</span>
                  <span>PAS PELAWAT</span>
                </div>
              </div>
            </div>

            {/* Status Pill */}
            <div className="my-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                visitor.status === 'ACTIVE'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {visitor.status === 'ACTIVE' ? 'Status: Dalam Kawasan' : 'Status: Telah Selesai'}
              </span>
            </div>

            {/* QR Code Frame */}
            <div className="my-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm inline-block mx-auto">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Kod QR Pas Pelawat" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-semibold">Menjana Kod QR...</span>
                </div>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-500 mt-1 mb-4">
              Imbas kod ini di Pondok Pengawal semasa keluar untuk daftar keluar automatik.
            </p>

            {/* Visitor Details Block */}
            <div className="bg-white/90 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Nama Pelawat:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px]">{visitor.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">No. KP / Pasport:</span>
                <span className="font-mono font-bold text-slate-800">{visitor.icOrPassport}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">No. Kenderaan:</span>
                <span className="font-mono font-bold uppercase text-slate-800">{visitor.vehiclePlate || 'TIADA'}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
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
            <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-500 leading-tight">
              Sila pakai pas ini sepanjang masa berada di dalam kawasan sekolah. Pulangkan kepada pengawal sebelum meninggalkan sekolah.
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions (hidden when printing) */}
        <div className="flex flex-wrap gap-2.5 p-5 bg-slate-50 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Simpan Imej QR</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPass}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Pas Pelawat</span>
          </button>
        </div>

      </div>
    </div>
  );
}
