import React, { useState } from 'react';
import { UserPlus, Sparkles, Building, GraduationCap, Users, Wrench, MoreHorizontal, Check } from 'lucide-react';
import { Visitor } from '../types';

interface VisitorFormProps {
  onSubmit: (visitor: Omit<Visitor, 'id' | 'checkInTime' | 'checkOutTime' | 'status'>) => void;
}

const COMMON_PURPOSES = [
  { id: 'Urusan Pejabat', label: 'Urusan Pejabat', icon: Building },
  { id: 'Berjumpa Guru', label: 'Berjumpa Guru', icon: GraduationCap },
  { id: 'Menjemput Anak', label: 'Menjemput Anak', icon: Users },
  { id: 'Penyelenggaraan/Kontraktor', label: 'Kontraktor', icon: Wrench },
  { id: 'Lain-lain', label: 'Lain-lain', icon: MoreHorizontal },
];

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
      name: formData.name.trim(),
      icOrPassport: formData.icOrPassport.trim(),
      phone: formData.phone.trim(),
      vehiclePlate: formData.vehiclePlate.trim().toUpperCase(),
      purpose: formData.purpose === 'Lain-lain' 
        ? (formData.otherPurpose.trim() || 'Lain-lain') 
        : (formData.purpose || 'Urusan Am')
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'vehiclePlate' ? value.toUpperCase() : value
    }));
  };

  const handlePurposeSelect = (purposeVal: string) => {
    setFormData(prev => ({
      ...prev,
      purpose: purposeVal,
      otherPurpose: purposeVal !== 'Lain-lain' ? '' : prev.otherPurpose
    }));
  };

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-sm border border-white overflow-hidden relative">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 sm:px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Pendaftaran Pelawat Baru</h2>
            <p className="text-xs text-blue-100 hidden sm:block">Sila lengkapkan butiran pelawat untuk rekod keselamatan</p>
          </div>
        </div>
        <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
          BBA1026
        </span>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
        {/* Nama Penuh */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Nama Penuh Pelawat <span className="text-rose-500">*</span>
          </label>
          <input
            required
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-slate-900 placeholder-slate-400 font-medium text-base sm:text-sm"
            placeholder="Contoh: Ahmad bin Abu"
            autoComplete="name"
          />
        </div>

        {/* IC & Phone Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              No. KP / Pasport <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              name="icOrPassport"
              value={formData.icOrPassport}
              onChange={handleChange}
              className="w-full px-4 py-3 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-slate-900 placeholder-slate-400 font-mono text-base sm:text-sm"
              placeholder="Contoh: 801210-10-1234"
              inputMode="text"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              No. Telefon Bimbit <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-slate-900 placeholder-slate-400 font-mono text-base sm:text-sm"
              placeholder="Contoh: 012-3456789"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </div>

        {/* Vehicle Plate & Purpose Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              No. Pendaftaran Kenderaan <span className="text-slate-400 font-normal lowercase">(jika bawa kenderaan)</span>
            </label>
            <input
              type="text"
              name="vehiclePlate"
              value={formData.vehiclePlate}
              onChange={handleChange}
              className="w-full px-4 py-3 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-slate-900 placeholder-slate-400 font-mono uppercase text-base sm:text-sm font-bold tracking-wider"
              placeholder="Contoh: WXY 1234 (atau biarkan kosong)"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Tujuan Lawatan <span className="text-rose-500">*</span>
            </label>
            {/* Quick Touch Chips for Mobile */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_PURPOSES.map(cp => {
                const Icon = cp.icon;
                const isSelected = formData.purpose === cp.id;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => handlePurposeSelect(cp.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cp.label}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* If Lain-lain selected or custom entry */}
            {formData.purpose === 'Lain-lain' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  required
                  type="text"
                  name="otherPurpose"
                  value={formData.otherPurpose}
                  onChange={handleChange}
                  className="w-full px-4 py-3 sm:py-2.5 bg-white border-2 border-blue-400 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 placeholder-slate-400 text-base sm:text-sm"
                  placeholder="Sila nyatakan tujuan lawatan di sini..."
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          className="w-full min-h-[50px] bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold py-3.5 px-5 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2.5 text-base"
        >
          <UserPlus className="w-5 h-5 stroke-[2.5]" />
          <span>Daftar Masuk Pelawat Sekarang</span>
        </button>
      </form>
    </div>
  );
}
