import React from 'react';
import { Visitor } from '../types';
import { Printer, ArrowLeft, Download, ShieldCheck, Calendar, Users, CheckCircle2, Clock } from 'lucide-react';

export interface ReportConfig {
  type: 'mingguan' | 'bulanan' | 'tahunan' | 'kustom';
  title: string;
  startDate: Date;
  endDate: Date;
  schoolName: string;
  schoolCode: string;
  generatedBy: string;
}

interface ReportPrintViewProps {
  config: ReportConfig;
  visitors: Visitor[];
  onClose: () => void;
}

export default function ReportPrintView({ config, visitors, onClose }: ReportPrintViewProps) {
  // Filter visitors within the date range
  const filteredVisitors = visitors.filter((v) => {
    const vDate = new Date(v.checkInTime);
    return vDate >= config.startDate && vDate <= config.endDate;
  }).sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());

  // Statistics calculation
  const totalVisitors = filteredVisitors.length;
  const checkedOutCount = filteredVisitors.filter((v) => v.status === 'CHECKED_OUT').length;
  const activeCount = filteredVisitors.filter((v) => v.status === 'ACTIVE').length;

  // Calculate day difference for average
  const diffTime = Math.abs(config.endDate.getTime() - config.startDate.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const avgDaily = (totalVisitors / diffDays).toFixed(1);

  // Group by Purpose
  const purposeCounts: Record<string, number> = {};
  filteredVisitors.forEach((v) => {
    const p = v.purpose.trim() || 'Lain-lain';
    purposeCounts[p] = (purposeCounts[p] || 0) + 1;
  });

  const handlePrint = () => {
    window.print();
  };

  const formatDateRange = () => {
    const startStr = config.startDate.toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const endStr = config.endDate.toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return startStr === endStr ? startStr : `${startStr} hingga ${endStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md overflow-y-auto print:static print:bg-white print:overflow-visible">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="sticky top-0 z-20 bg-slate-800 text-white p-4 flex items-center justify-between shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-xl transition-colors inline-flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <div>
            <h2 className="font-bold text-sm sm:text-base leading-tight">Pra-tonton Laporan PDF ({config.title})</h2>
            <p className="text-xs text-slate-300 font-medium">Tempoh: {formatDateRange()} ({totalVisitors} rekod)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-105"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Main A4 Printable Document Container */}
      <div className="p-4 sm:p-8 flex justify-center print:p-0">
        <div className="w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl p-8 sm:p-12 print:shadow-none print:p-6 print:max-w-none print:w-full min-h-[297mm] flex flex-col justify-between rounded-2xl print:rounded-none">
          
          <div>
            {/* School Official Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5 mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="https://i.postimg.cc/bwhChtbs/SKM.png" 
                  alt="Logo Sekolah" 
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900">
                    SEKOLAH KEBANGSAAN MORIB
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    KEMENTERIAN PENDIDIKAN MALAYSIA
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    KOD SEKOLAH: {config.schoolCode || 'BBA1026'} • SISTEM KAWALAN KESELAMATAN PENGAWAL
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded border border-slate-300 uppercase tracking-wider">
                  DOKUMEN RASMI
                </span>
              </div>
            </div>

            {/* Document Title & Period Metadata */}
            <div className="text-center my-6">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                {config.title}
              </h2>
              <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700 border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Tempoh Laporan: <strong>{formatDateRange()}</strong></span>
              </div>
            </div>

            {/* Executive Summary Metrics Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Jumlah Pelawat</span>
                <span className="text-2xl font-black text-slate-900 font-mono">{totalVisitors}</span>
                <span className="text-[10px] text-slate-500 block">orang</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Purata Harian</span>
                <span className="text-2xl font-black text-blue-700 font-mono">{avgDaily}</span>
                <span className="text-[10px] text-slate-500 block">pelawat/hari</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Selesai Keluar</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">{checkedOutCount}</span>
                <span className="text-[10px] text-slate-500 block">rekod</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Masih Dalam Kawasan</span>
                <span className="text-2xl font-black text-amber-700 font-mono">{activeCount}</span>
                <span className="text-[10px] text-slate-500 block">semasa dijana</span>
              </div>
            </div>

            {/* Breakdown by Purpose */}
            {Object.keys(purposeCounts).length > 0 && (
              <div className="mb-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pecahan Kategori Tujuan Lawatan:
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(purposeCounts).map(([purpose, count]) => (
                    <span 
                      key={purpose} 
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-2xs"
                    >
                      {purpose}: <strong className="font-mono text-blue-600">{count}</strong> ({Math.round((count / totalVisitors) * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Table */}
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Senarai Terperinci Kehadiran Pelawat ({filteredVisitors.length} Rekod)</span>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-2.5 text-center w-8 border-r border-slate-300">Bil</th>
                      <th className="p-2.5 border-r border-slate-300">Nama Pelawat</th>
                      <th className="p-2.5 border-r border-slate-300">No. KP / Pasport</th>
                      <th className="p-2.5 border-r border-slate-300">No. Telefon</th>
                      <th className="p-2.5 border-r border-slate-300">No. Kenderaan</th>
                      <th className="p-2.5 border-r border-slate-300">Tujuan</th>
                      <th className="p-2.5 border-r border-slate-300">Waktu Masuk</th>
                      <th className="p-2.5 border-r border-slate-300">Waktu Keluar</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredVisitors.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400 font-medium italic">
                          Tiada rekod pelawat didaftarkan dalam tempoh ini.
                        </td>
                      </tr>
                    ) : (
                      filteredVisitors.map((v, index) => (
                        <tr key={`${v.id}-${index}`} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                          <td className="p-2 text-center font-mono font-medium text-slate-500 border-r border-slate-200">
                            {index + 1}
                          </td>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                            {v.name}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-r border-slate-200 text-[11px]">
                            {v.icOrPassport}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-r border-slate-200 text-[11px]">
                            {v.phone || '-'}
                          </td>
                          <td className="p-2 font-mono uppercase text-slate-700 border-r border-slate-200 text-[11px]">
                            {v.vehiclePlate || '-'}
                          </td>
                          <td className="p-2 text-slate-800 border-r border-slate-200">
                            {v.purpose}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-r border-slate-200 text-[10px]">
                            {new Date(v.checkInTime).toLocaleString('ms-MY', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-r border-slate-200 text-[10px]">
                            {v.checkOutTime ? new Date(v.checkOutTime).toLocaleString('ms-MY', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : '-'}
                          </td>
                          <td className="p-2 text-center text-[10px]">
                            {v.status === 'ACTIVE' ? (
                              <span className="font-bold text-amber-700">Aktif</span>
                            ) : (
                              <span className="font-semibold text-emerald-700">Keluar</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Official Sign-off & Signatures Footer (Print-optimized) */}
          <div className="mt-12 pt-6 border-t-2 border-slate-300">
            <div className="grid grid-cols-2 gap-12 text-xs text-slate-800">
              <div>
                <p className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider mb-1">Disediakan oleh:</p>
                <div className="h-16 border-b border-dashed border-slate-400"></div>
                <p className="mt-2 font-bold text-slate-900">Nama: ....................................................</p>
                <p className="text-slate-600 text-[11px]">Jawatan: Pengawal Keselamatan Bertugas</p>
                <p className="text-slate-600 text-[11px]">Tarikh: {new Date().toLocaleDateString('ms-MY')}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider mb-1">Disahkan oleh Pentadbir Sekolah:</p>
                <div className="h-16 border-b border-dashed border-slate-400"></div>
                <p className="mt-2 font-bold text-slate-900">Nama: ....................................................</p>
                <p className="text-slate-600 text-[11px]">Jawatan: Guru Besar / PK Pentadbiran</p>
                <p className="text-slate-600 text-[11px]">Tarikh & Cop Rasmi: ................................</p>
              </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-2">
              Laporan Dijana Secara Digital Oleh Sistem Kawalan Pengawal SKM pada {new Date().toLocaleString('ms-MY')}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
