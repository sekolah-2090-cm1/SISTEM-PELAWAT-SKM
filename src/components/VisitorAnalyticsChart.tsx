import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import { Visitor } from '../types';
import { Calendar, Users, TrendingUp } from 'lucide-react';

interface VisitorAnalyticsChartProps {
  visitors: Visitor[];
}

export default function VisitorAnalyticsChart({ visitors }: VisitorAnalyticsChartProps) {
  // Generate data for the last 7 days (including today)
  const last7DaysData = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    d.setHours(0, 0, 0, 0);

    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayVisitors = visitors.filter(v => {
      const vDate = new Date(v.checkInTime);
      return vDate >= d && vDate < nextDay;
    });

    const dayName = d.toLocaleDateString('ms-MY', { weekday: 'short' });
    const dayDate = d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });

    return {
      label: `${dayName}, ${dayDate}`,
      shortLabel: `${dayName} (${d.getDate()})`,
      dateKey: d.toISOString().split('T')[0],
      jumlah: dayVisitors.length,
      selesai: dayVisitors.filter(v => v.status === 'CHECKED_OUT').length,
      aktif: dayVisitors.filter(v => v.status === 'ACTIVE').length,
      isToday: index === 6
    };
  });

  const total7Days = last7DaysData.reduce((acc, curr) => acc + curr.jumlah, 0);
  const avgPerDay = (total7Days / 7).toFixed(1);

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl border border-white transition-all duration-300 relative group overflow-hidden">
      {/* Glow subtle */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Kekerapan Pelawat 7 Hari Terakhir</h3>
              <p className="text-xs text-slate-500 font-medium">Carta perbandingan kehadiran harian di pondok pengawal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Purata Harian</span>
            <span className="text-lg font-bold text-blue-600 font-mono">{avgPerDay}</span>
            <span className="text-xs text-slate-500 ml-1">pelawat/hari</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Jumlah (7 Hari)</span>
            <span className="text-lg font-bold text-indigo-600 font-mono">{total7Days}</span>
            <span className="text-xs text-slate-500 ml-1">orang</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-72 sm:h-80 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={last7DaysData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.6} />
            <XAxis 
              dataKey="shortLabel" 
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis 
              allowDecimals={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 text-xs">
                      <div className="font-bold text-slate-800 text-sm mb-1.5 flex items-center justify-between gap-3">
                        <span>{data.label}</span>
                        {data.isToday && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Hari Ini</span>
                        )}
                      </div>
                      <div className="space-y-1 text-slate-600 pt-1 border-t border-slate-100">
                        <div className="flex justify-between gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Jumlah Pelawat:
                          </span>
                          <span className="font-bold text-slate-900 font-mono">{data.jumlah} orang</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Telah Keluar:
                          </span>
                          <span className="font-semibold text-emerald-700 font-mono">{data.selesai}</span>
                        </div>
                        {data.aktif > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              Masih Dalam Kawasan:
                            </span>
                            <span className="font-semibold text-amber-700 font-mono">{data.aktif}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="jumlah" 
              name="Jumlah Pelawat"
              radius={[8, 8, 0, 0]}
              animationDuration={800}
            >
              {last7DaysData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isToday ? '#2563eb' : '#60a5fa'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Status Hint */}
      <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-600"></div>
            <span className="font-medium text-slate-700">Hari Ini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-400"></div>
            <span className="font-medium text-slate-600">Hari Sebelumnya</span>
          </div>
        </div>
        <span className="hidden sm:inline italic text-slate-400">Sentuh atau layangkan tetikus pada bar untuk butiran</span>
      </div>
    </div>
  );
}
