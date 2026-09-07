import React, { useState } from 'react';
import { LogOut, CheckCircle2, Clock, Car, QrCode, Phone, CreditCard, LayoutGrid, Table as TableIcon, ChevronRight } from 'lucide-react';
import { Visitor } from '../types';

interface VisitorListProps {
  visitors: Visitor[];
  onCheckOut: (id: string) => void;
  searchTerm: string;
  onSelectVisitor?: (visitor: Visitor) => void;
  onShowPass?: (visitor: Visitor) => void;
}

export default function VisitorList({ visitors, onCheckOut, searchTerm, onSelectVisitor, onShowPass }: VisitorListProps) {
  // Allow user on tablet/mobile to switch between card view and table view
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.icOrPassport.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.phone && v.phone.includes(searchTerm)) ||
    (v.purpose && v.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ms-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateDuration = (checkInIso: string, checkOutIso?: string | null) => {
    const start = new Date(checkInIso).getTime();
    const end = checkOutIso ? new Date(checkOutIso).getTime() : Date.now();
    const diffMins = Math.max(1, Math.round((end - start) / 60000));
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}j ${mins}m`;
  };

  const showCards = viewMode === 'cards' || (viewMode === 'auto');
  const showTable = viewMode === 'table' || (viewMode === 'auto');

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white transition-all duration-300 overflow-hidden flex flex-col h-full relative">
      
      {/* View switcher bar for tablet & mobile */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/60 flex items-center justify-between gap-3 text-xs text-slate-500">
        <div className="font-semibold text-slate-700">
          Menunjukkan <span className="font-bold text-blue-600 font-mono">{filteredVisitors.length}</span> rekod
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1.5 transition-all ${
              viewMode === 'cards' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Paparan Kad (Sesuai untuk Telefon Bimbit)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paparan Kad</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Paparan Jadual (Sesuai untuk Komputer / Laptop)"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paparan Jadual</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('auto')}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] transition-all ${
              viewMode === 'auto' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="Paparan Automatik Mengikut Peranti"
          >
            Auto
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {filteredVisitors.length === 0 ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center my-auto">
          <div className="p-4 bg-white/70 rounded-full mb-3 border border-slate-200 shadow-sm">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-700 text-base">Tiada rekod pelawat ditemui.</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {searchTerm ? 'Cuba carian lain atau kosongkan kotak carian.' : 'Belum ada pendaftaran pelawat hari ini.'}
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* 1. MOBILE CARD VIEW (Optimized for Smartphone & Touch)    */}
          {/* ========================================================= */}
          <div className={`p-3 sm:p-4 space-y-3.5 ${showCards ? (viewMode === 'cards' ? 'block' : 'block md:hidden') : 'hidden'}`}>
            {filteredVisitors.map((visitor, index) => {
              const isActive = visitor.status === 'ACTIVE';
              return (
                <div
                  key={`card-${visitor.id}-${index}`}
                  onClick={() => onSelectVisitor?.(visitor)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden"
                >
                  {/* Top Status & Title Row */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-black text-slate-900 text-base leading-snug truncate">
                          {visitor.name}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </div>
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        {visitor.purpose}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                          <span>Dalam</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Keluar</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges / Info Row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs py-2 border-y border-slate-100 mb-3 font-mono">
                    {/* IC / Passport */}
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg text-slate-700 border border-slate-200/80">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>{visitor.icOrPassport}</span>
                    </div>

                    {/* Vehicle Plate */}
                    {visitor.vehiclePlate && visitor.vehiclePlate !== '-' && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold tracking-wider uppercase shadow-xs">
                        <Car className="w-3 h-3 text-slate-300" />
                        <span>{visitor.vehiclePlate}</span>
                      </div>
                    )}

                    {/* Phone with Click-to-Call */}
                    {visitor.phone && (
                      <a
                        href={`tel:${visitor.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold border border-blue-200 transition-colors"
                        title="Klik untuk hubungi pelawat secara terus"
                      >
                        <Phone className="w-3 h-3 text-blue-500" />
                        <span>{visitor.phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Timing details */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Masuk: <strong className="text-slate-700 font-mono">{formatTime(visitor.checkInTime)}</strong></span>
                    </div>

                    <div>
                      {isActive ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200/60">
                          Tempoh: {calculateDuration(visitor.checkInTime)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">
                          Keluar: {visitor.checkOutTime ? formatTime(visitor.checkOutTime) : '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Touch Action Buttons (min 44px height for mobile thumb accessibility) */}
                  <div className="flex items-center gap-2 pt-1">
                    {onShowPass && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowPass(visitor);
                        }}
                        className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 bg-slate-100 hover:bg-blue-50 active:bg-blue-100 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-95 whitespace-nowrap"
                        title="Papar Pas QR"
                      >
                        <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">Pas QR</span>
                      </button>
                    )}

                    {isActive ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheckOut(visitor.id);
                        }}
                        className="flex-[1.4] min-w-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
                        title="Daftar keluar pelawat"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span className="truncate">Daftar Keluar</span>
                      </button>
                    ) : (
                      <div className="flex-1 min-w-0 min-h-[44px] flex items-center justify-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200/50">
                        Lawatan Selesai
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* 2. DESKTOP / TABLET TABLE VIEW (Sticky action buttons)    */}
          {/* ========================================================= */}
          <div className={`overflow-x-auto relative z-10 ${showTable ? (viewMode === 'table' ? 'block' : 'hidden md:block') : 'hidden'}`}>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold tracking-wide uppercase text-xs">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5">Nama &amp; Maklumat Pelawat</th>
                  <th className="px-4 sm:px-6 py-3.5">Tujuan Lawatan</th>
                  <th className="px-4 sm:px-6 py-3.5">Masa Masuk</th>
                  <th className="px-4 sm:px-6 py-3.5">Status Kawasan</th>
                  {/* Sticky right column so actions are NEVER hidden on any laptop or small screen */}
                  <th className="px-4 sm:px-6 py-3.5 text-right sticky right-0 bg-slate-50/95 backdrop-blur-xs shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] z-20">
                    Tindakan Pantas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.map((visitor, index) => {
                  const isActive = visitor.status === 'ACTIVE';
                  return (
                    <tr 
                      key={`table-${visitor.id}-${index}`} 
                      onClick={() => onSelectVisitor?.(visitor)}
                      className="hover:bg-blue-50/50 transition-colors group/row cursor-pointer"
                      title="Klik untuk lihat butiran penuh &amp; sejarah pelawat"
                    >
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{visitor.name}</span>
                          <span className="text-[11px] text-blue-600 font-normal opacity-0 group-hover/row:opacity-100 transition-opacity">
                            (Papar)
                          </span>
                        </div>
                        <div className="text-slate-500 text-xs mt-1 flex flex-wrap items-center gap-2 font-mono">
                          <span className="text-slate-600 font-medium">{visitor.icOrPassport}</span>
                          {visitor.vehiclePlate && visitor.vehiclePlate !== '-' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white rounded text-[11px] font-bold tracking-wider uppercase shadow-xs">
                              <Car className="w-3 h-3" />
                              <span>{visitor.vehiclePlate}</span>
                            </span>
                          )}
                          {visitor.phone && (
                            <a
                              href={`tel:${visitor.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              title="Panggil nombor telefon"
                            >
                              📞 {visitor.phone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-slate-700 font-medium max-w-xs truncate">
                        {visitor.purpose}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2 text-slate-600 font-mono">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{formatTime(visitor.checkInTime)}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                            Dalam Kawasan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Telah Keluar <span className="font-mono font-normal ml-1 text-slate-500">{visitor.checkOutTime && `(${formatTime(visitor.checkOutTime)})`}</span>
                          </span>
                        )}
                      </td>
                      {/* Sticky Right Column for Actions */}
                      <td className="px-4 sm:px-6 py-3.5 text-right sticky right-0 bg-white/95 group-hover/row:bg-blue-50/95 backdrop-blur-xs shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] z-10">
                        <div className="flex items-center justify-end gap-2">
                          {onShowPass && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onShowPass(visitor);
                              }}
                              className="p-2.5 bg-white hover:bg-blue-50 text-blue-600 rounded-xl border border-slate-200 hover:border-blue-300 shadow-xs transition-all active:scale-95"
                              title="Papar Pas QR Pelawat"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}
                          {isActive ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCheckOut(visitor.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95"
                              title="Daftar keluar sekarang"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Daftar Keluar</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium px-2">Selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
