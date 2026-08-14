import React from 'react';
import { LogOut, CheckCircle2, Clock, Car, QrCode } from 'lucide-react';
import { Visitor } from '../types';

interface VisitorListProps {
  visitors: Visitor[];
  onCheckOut: (id: string) => void;
  searchTerm: string;
  onSelectVisitor?: (visitor: Visitor) => void;
  onShowPass?: (visitor: Visitor) => void;
}

export default function VisitorList({ visitors, onCheckOut, searchTerm, onSelectVisitor, onShowPass }: VisitorListProps) {
  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.icOrPassport.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ms-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-white hover:scale-[1.01] transition-all duration-300 overflow-hidden flex flex-col h-full relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      <div className="overflow-x-auto relative z-10">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/40 border-b border-white/50 text-slate-600 font-semibold tracking-wide uppercase text-xs backdrop-blur-sm">
            <tr>
              <th className="px-6 py-5">Nama & Maklumat</th>
              <th className="px-6 py-5">Tujuan</th>
              <th className="px-6 py-5">Masa Masuk</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {filteredVisitors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-4 bg-white/50 rounded-full mb-3 border border-white shadow-sm">
                      <Clock className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium">Tiada rekod pelawat ditemui.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVisitors.map((visitor, index) => (
                <tr 
                  key={`${visitor.id}-${index}`} 
                  onClick={() => onSelectVisitor?.(visitor)}
                  className="hover:bg-blue-50/60 transition-colors group/row cursor-pointer"
                  title="Klik untuk lihat butiran penuh & sejarah pelawat"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span>{visitor.name}</span>
                      <span className="text-[11px] text-blue-500 font-normal opacity-0 group-hover/row:opacity-100 transition-opacity">
                        (Lihat)
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs mt-1.5 flex items-center gap-3 font-mono">
                      <span>{visitor.icOrPassport}</span>
                      {visitor.vehiclePlate && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/60 border border-slate-200 rounded text-slate-600 shadow-sm">
                          <Car className="w-3 h-3" />
                          <span className="uppercase tracking-wider font-semibold">{visitor.vehiclePlate}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{visitor.purpose}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500 font-mono">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {formatTime(visitor.checkInTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {visitor.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shadow-sm uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                        Dalam Kawasan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-slate-500" />
                        Telah Keluar <span className="font-mono lowercase font-normal ml-1 text-slate-500">{visitor.checkOutTime && `(${formatTime(visitor.checkOutTime)})`}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onShowPass && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowPass(visitor);
                          }}
                          className="p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg border border-slate-200 hover:border-blue-200 shadow-sm transition-all opacity-80 group-hover/row:opacity-100"
                          title="Papar Pas QR Pelawat"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                      {visitor.status === 'ACTIVE' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCheckOut(visitor.id);
                          }}
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-semibold text-xs rounded-lg transition-all border border-slate-200 hover:border-amber-200 shadow-sm opacity-0 group-hover/row:opacity-100 focus:opacity-100 sm:opacity-100 hover:shadow"
                        >
                          <LogOut className="w-3.5 h-3.5 text-amber-500" />
                          <span>Daftar Keluar</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium px-2">Selesai</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
