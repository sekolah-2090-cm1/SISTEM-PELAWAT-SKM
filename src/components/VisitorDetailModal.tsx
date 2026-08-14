import React, { useEffect } from 'react';
import { X, User, Phone, CreditCard, Car, FileText, Clock, CheckCircle2, History, AlertCircle, LogOut } from 'lucide-react';
import { Visitor } from '../types';

interface VisitorDetailModalProps {
  visitor: Visitor | null;
  allVisitors: Visitor[];
  onClose: () => void;
  onCheckOut: (id: string) => void;
}

export default function VisitorDetailModal({ visitor, allVisitors, onClose, onCheckOut }: VisitorDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!visitor) return null;

  // Find all historical visits for this person (by IC/Passport or phone)
  const historyList = allVisitors
    .filter(v => v.icOrPassport === visitor.icOrPassport || (visitor.phone && v.phone === visitor.phone))
    .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeOnly = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('ms-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-6 sm:p-8 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-200/70 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl border border-blue-200/50">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">{visitor.name}</h3>
                {visitor.status === 'ACTIVE' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shadow-sm uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                    Dalam Kawasan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Telah Keluar
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">ID Rekod: {visitor.id.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. Kad Pengenalan / Pasport</div>
                <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{visitor.icOrPassport}</div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-start gap-3">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. Telefon</div>
                <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{visitor.phone || '-'}</div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-start gap-3">
              <Car className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. Kenderaan</div>
                <div className="text-sm font-bold text-slate-800 font-mono uppercase mt-0.5">
                  {visitor.vehiclePlate || 'Tiada Kenderaan / Berjalan Kaki'}
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-start gap-3">
              <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tujuan Lawatan</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{visitor.purpose}</div>
              </div>
            </div>
          </div>

          {/* Time log box */}
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu Masuk</div>
                <div className="text-sm font-bold text-slate-800">{formatDateTime(visitor.checkInTime)}</div>
              </div>
            </div>

            <div className="hidden sm:block text-slate-300">→</div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu Keluar</div>
                <div className="text-sm font-bold text-slate-800">
                  {visitor.checkOutTime ? formatDateTime(visitor.checkOutTime) : (
                    <span className="text-amber-600 font-medium">Masih di dalam sekolah</span>
                  )}
                </div>
              </div>
            </div>

            {visitor.status === 'ACTIVE' && (
              <button
                onClick={() => {
                  onCheckOut(visitor.id);
                  onClose();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Daftar Keluar Sekarang
              </button>
            )}
          </div>

          {/* Visitor History Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                <History className="w-5 h-5 text-blue-600" />
                <span>Sejarah Lawatan Individu</span>
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
                {historyList.length} kali rekod lawatan
              </span>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-inner max-h-52 overflow-y-auto">
              {historyList.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">Tiada rekod lawatan lain.</div>
              ) : (
                historyList.map((item, idx) => (
                  <div key={item.id} className={`p-3.5 text-xs flex items-center justify-between gap-3 ${item.id === visitor.id ? 'bg-blue-50/50 font-medium' : 'hover:bg-slate-50/50'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-200/70 text-slate-600 font-bold flex items-center justify-center text-[11px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">{item.purpose}</div>
                        <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                          {new Date(item.checkInTime).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })} • {formatTimeOnly(item.checkInTime)} - {formatTimeOnly(item.checkOutTime)}
                        </div>
                      </div>
                    </div>
                    <div>
                      {item.status === 'ACTIVE' ? (
                        <span className="text-amber-600 font-semibold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">Aktif</span>
                      ) : (
                        <span className="text-slate-500 px-2 py-0.5 rounded bg-slate-100">Selesai</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
