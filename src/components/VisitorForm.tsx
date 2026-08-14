import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Visitor } from '../types';

interface VisitorFormProps {
  onSubmit: (visitor: Omit<Visitor, 'id' | 'checkInTime' | 'checkOutTime' | 'status'>) => void;
}

export default function VisitorForm({ onSubmit }: VisitorFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    icOrPassport: '',
    phone: '',
    vehiclePlate: '',
    purpose: '',
    otherPurpose: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use otherPurpose if "Lain-lain" is selected
    const finalData = {
      name: formData.name,
      icOrPassport: formData.icOrPassport,
      phone: formData.phone,
      vehiclePlate: formData.vehiclePlate,
      purpose: formData.purpose === 'Lain-lain' ? formData.otherPurpose || 'Lain-lain' : formData.purpose
    };

    onSubmit(finalData);
    setFormData({
      name: '',
      icOrPassport: '',
      phone: '',
      vehiclePlate: '',
      purpose: '',
      otherPurpose: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-white hover:scale-[1.01] transition-all duration-300 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      <div className="bg-white/40 px-6 py-5 border-b border-white/50 flex items-center gap-3 relative backdrop-blur-sm z-10">
        <UserPlus className="text-blue-600 w-6 h-6 drop-shadow-sm" />
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Pendaftaran Pelawat Baru</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6 relative z-10">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Penuh</label>
          <input
            required
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/60 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium shadow-inner"
            placeholder="Contoh: Ahmad bin Abu"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">No. KP / Pasport</label>
            <input
              required
              type="text"
              name="icOrPassport"
              value={formData.icOrPassport}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/60 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium shadow-inner"
              placeholder="Contoh: 801210-10-1234"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">No. Telefon</label>
            <input
              required
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/60 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium shadow-inner"
              placeholder="Contoh: 012-3456789"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">No. Kenderaan (Jika Ada)</label>
            <input
              type="text"
              name="vehiclePlate"
              value={formData.vehiclePlate}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/60 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium uppercase shadow-inner"
              placeholder="Contoh: JAB 1234"
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tujuan Lawatan</label>
              <select
                required
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/60 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white transition-all text-slate-800 font-medium shadow-inner"
              >
                <option value="" disabled className="text-slate-500">Pilih Tujuan...</option>
                <option value="Urusan Pejabat">Urusan Pejabat</option>
                <option value="Berjumpa Guru">Berjumpa Guru</option>
                <option value="Menjemput Anak">Menjemput Anak (Kecemasan)</option>
                <option value="Penyelenggaraan/Kontraktor">Penyelenggaraan / Kontraktor</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>
            
            {formData.purpose === 'Lain-lain' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  required
                  type="text"
                  name="otherPurpose"
                  value={formData.otherPurpose}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-slate-800 placeholder-slate-400 font-medium shadow-sm"
                  placeholder="Sila nyatakan tujuan..."
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-2 border border-blue-400/30"
        >
          <UserPlus className="w-5 h-5" />
          Daftar Masuk Pelawat
        </button>
      </form>
    </div>
  );
}
