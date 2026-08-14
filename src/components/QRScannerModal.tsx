import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Camera, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Clock, 
  User, 
  Car, 
  ArrowRight, 
  QrCode, 
  Sparkles,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Check,
  AlertCircle
} from 'lucide-react';
import jsQR from 'jsqr';
import { Visitor } from '../types';
import { playSuccessBeep, playErrorBeep, parseVisitorIdFromQR } from '../utils/audioAndQR';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitors: Visitor[];
  onCheckOut: (id: string) => void;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  visitors,
  onCheckOut
}: QRScannerModalProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Scanning State
  const [isScanning, setIsScanning] = useState(true);
  const [scannedResult, setScannedResult] = useState<{
    visitor: Visitor | null;
    status: 'SUCCESS' | 'ALREADY_CHECKED_OUT' | 'NOT_FOUND';
    rawCode: string;
    checkOutTime?: string;
  } | null>(null);

  // Manual fallback input
  const [manualQuery, setManualQuery] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    setIsTorchOn(false);
  }, []);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setHasCameraPermission(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak disokong oleh pelayar web ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      setHasCameraPermission(true);

      // Check if torch/flash is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() || {}) as any;
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        isProcessingRef.current = false;
        requestScan();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Kebenaran akses kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Tiada peranti kamera dikesan pada peranti ini.');
      } else {
        setCameraError(err.message || 'Gagal memulakan kamera.');
      }
    }
  }, [facingMode, stopCamera]);

  // Scan loop using requestAnimationFrame + jsQR
  const requestScan = useCallback(() => {
    if (!isOpen || !isScanning) return;

    const tick = () => {
      if (!isOpen) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingRef.current) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data && code.data.trim()) {
            isProcessingRef.current = true;
            handleDetectedCode(code.data.trim());
            return;
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);
  }, [isOpen, isScanning]);

  // Handle scanned code
  const handleDetectedCode = (rawCode: string) => {
    const visitorId = parseVisitorIdFromQR(rawCode);
    if (!visitorId) {
      isProcessingRef.current = false;
      return;
    }

    // Try finding visitor by ID or by IC or by vehicle plate
    const matchedVisitor = visitors.find(
      (v) => v.id === visitorId || 
             v.icOrPassport.toLowerCase() === visitorId.toLowerCase() ||
             (visitorId.length > 5 && v.id.startsWith(visitorId))
    );

    if (matchedVisitor) {
      if (matchedVisitor.status === 'ACTIVE') {
        // Successful checkout!
        const nowOut = new Date().toISOString();
        if (soundEnabled) playSuccessBeep();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        onCheckOut(matchedVisitor.id);
        setScannedResult({
          visitor: { ...matchedVisitor, status: 'CHECKED_OUT', checkOutTime: nowOut },
          status: 'SUCCESS',
          rawCode,
          checkOutTime: nowOut
        });
        setIsScanning(false);
      } else {
        // Already checked out
        if (soundEnabled) playErrorBeep();
        setScannedResult({
          visitor: matchedVisitor,
          status: 'ALREADY_CHECKED_OUT',
          rawCode,
          checkOutTime: matchedVisitor.checkOutTime || undefined
        });
        setIsScanning(false);
      }
    } else {
      // Visitor not found in list
      if (soundEnabled) playErrorBeep();
      setScannedResult({
        visitor: null,
        status: 'NOT_FOUND',
        rawCode
      });
      setIsScanning(false);
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setIsTorchOn(nextTorch);
      } catch (e) {
        console.warn('Gagal menukar lampu suluh:', e);
      }
    }
  };

  // Switch Camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Reset to scan again
  const handleScanNext = () => {
    setScannedResult(null);
    setIsScanning(true);
    isProcessingRef.current = false;
    requestScan();
  };

  // Manual query submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    handleDetectedCode(manualQuery.trim());
    setManualQuery('');
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setIsScanning(true);
      setManualQuery('');
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Restart scan loop when isScanning changes to true
  useEffect(() => {
    if (isScanning && isOpen && hasCameraPermission) {
      requestScan();
    }
  }, [isScanning, isOpen, hasCameraPermission, requestScan]);

  if (!isOpen) return null;

  // Format visit duration calculation
  const calculateDuration = (checkIn: string, checkOut: string) => {
    const inTime = new Date(checkIn).getTime();
    const outTime = new Date(checkOut).getTime();
    const diffMs = Math.max(0, outTime - inTime);
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours} jam ${mins} minit`;
    }
    return `${mins || 1} minit`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Scanner Container */}
      <div className="relative w-full max-w-xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Hidden Canvas for QR decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">Pengimbas Pas Pelawat QR</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase rounded-full border border-emerald-500/30">
                  Kamera Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Imbas kod QR pada pas untuk daftar keluar automatik</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title={soundEnabled ? 'Bunyi Aktif' : 'Bunyi Dimatikan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- SCANNER VIEWPORT OR RESULT CARD --- */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* STATE 1: ACTIVE SCANNER VIEW */}
          {isScanning && (
            <div className="space-y-4">
              {/* Video Viewport Box */}
              <div className="relative w-full aspect-square sm:aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
                
                {/* Real-time Video stream */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Animated Scanner Reticle Overlay */}
                {hasCameraPermission && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    {/* Viewfinder Target Box */}
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-blue-400/60 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                      
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-blue-400 rounded-tl-2xl"></div>
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-blue-400 rounded-tr-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-blue-400 rounded-bl-2xl"></div>
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-blue-400 rounded-br-2xl"></div>

                      {/* Moving Laser Beam */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#60a5fa] animate-laser-scan"></div>
                      
                      <div className="absolute bottom-3 inset-x-0 text-center">
                        <span className="px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-full text-[11px] font-bold text-blue-300 border border-blue-500/30">
                          Arahkan Kod QR ke Sini
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Camera Permission Loading or Error */}
                {hasCameraPermission === null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 p-6 text-center">
                    <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-sm font-semibold text-slate-300">Menyambung ke kamera peranti...</p>
                  </div>
                )}

                {hasCameraPermission === false && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/95 p-6 text-center">
                    <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-sm text-white">Kamera Tidak Dapat Diakses</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      {cameraError || 'Sila pastikan kebenaran kamera telah dibenarkan dalam pelayar anda.'}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Cuba Semula</span>
                    </button>
                  </div>
                )}

                {/* Camera Controls Overlay (Torch & Camera Switch) */}
                {hasCameraPermission && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-xl backdrop-blur-md transition-all border ${
                          isTorchOn 
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/40 font-bold' 
                            : 'bg-slate-900/80 text-white border-white/20 hover:bg-slate-800'
                        }`}
                        title={isTorchOn ? 'Tutup Lampu' : 'Buka Lampu Suluh'}
                      >
                        {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={switchCamera}
                      className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl backdrop-blur-md transition-all border border-white/20"
                      title="Tukar Kamera Depan / Belakang"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Input Fallback */}
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Atau Masukkan ID / No. Kad Pengenalan Secara Manual
                </label>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="Contoh: No. KP (801210-10-1234) atau ID..."
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    <span>Semak &amp; Keluar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STATE 2: SCAN RESULT CONFIRMATION CARD */}
          {!isScanning && scannedResult && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              
              {/* SUCCESS CHECKOUT RESULT */}
              {scannedResult.status === 'SUCCESS' && scannedResult.visitor && (
                <div className="bg-gradient-to-b from-emerald-950/80 to-slate-900 rounded-2xl border-2 border-emerald-500/80 p-6 shadow-2xl relative overflow-hidden">
                  
                  {/* Glow background accent */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>

                  <div className="flex items-center gap-3.5 pb-4 border-b border-emerald-500/30">
                    <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-400 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider">
                          Berjaya
                        </span>
                        <h3 className="text-xl font-black text-white tracking-tight">Daftar Keluar Lengkap</h3>
                      </div>
                      <p className="text-xs text-emerald-300 font-semibold mt-0.5">Status pelawat telah ditukar ke 'Telah Keluar'</p>
                    </div>
                  </div>

                  {/* Visitor summary grid */}
                  <div className="my-5 bg-slate-950/60 rounded-xl p-4 border border-emerald-500/20 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Nama Pelawat:</span>
                      <span className="font-bold text-white text-sm">{scannedResult.visitor.name}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">No. KP / Pasport:</span>
                      <span className="font-mono font-bold text-slate-200">{scannedResult.visitor.icOrPassport}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">No. Kenderaan:</span>
                      <span className="font-mono font-bold uppercase text-amber-400">
                        {scannedResult.visitor.vehiclePlate || 'Tiada Kenderaan'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Tujuan Lawatan:</span>
                      <span className="font-medium text-slate-300">{scannedResult.visitor.purpose}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">WAKTU MASUK</span>
                        <span className="font-mono font-bold text-blue-400 text-xs">
                          {new Date(scannedResult.visitor.checkInTime).toLocaleTimeString('ms-MY', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>

                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-emerald-400 block font-semibold">WAKTU KELUAR</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {new Date(scannedResult.checkOutTime || new Date().toISOString()).toLocaleTimeString('ms-MY', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-center pt-1 text-[11px] text-slate-400">
                      Tempoh Berada Di Sekolah:{' '}
                      <strong className="text-white font-bold">
                        {calculateDuration(scannedResult.visitor.checkInTime, scannedResult.checkOutTime || new Date().toISOString())}
                      </strong>
                    </div>
                  </div>

                </div>
              )}

              {/* ALREADY CHECKED OUT WARNING */}
              {scannedResult.status === 'ALREADY_CHECKED_OUT' && scannedResult.visitor && (
                <div className="bg-amber-950/60 rounded-2xl border-2 border-amber-500/80 p-6 shadow-xl">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-amber-500/30">
                    <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-full">
                        Perhatian
                      </span>
                      <h3 className="text-lg font-black text-white mt-1">Pelawat Telah Mendaftar Keluar</h3>
                      <p className="text-xs text-amber-300">Rekod pelawat ini telah diselesaikan sebelum ini.</p>
                    </div>
                  </div>

                  <div className="my-4 bg-slate-950/60 rounded-xl p-4 border border-amber-500/20 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Nama Pelawat:</span>
                      <span className="font-bold text-white">{scannedResult.visitor.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Waktu Keluar Terdahulu:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {scannedResult.checkOutTime ? new Date(scannedResult.checkOutTime).toLocaleTimeString('ms-MY', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* NOT FOUND ERROR */}
              {scannedResult.status === 'NOT_FOUND' && (
                <div className="bg-rose-950/60 rounded-2xl border-2 border-rose-500/80 p-6 shadow-xl text-center space-y-3">
                  <div className="w-12 h-12 mx-auto bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center border border-rose-500/40">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-white">Rekod Pelawat Tidak Ditemui</h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Kod QR yang diimbas ({scannedResult.rawCode.slice(0, 30)}...) tidak sepadan dengan mana-mana rekod pelawat aktif dalam sistem.
                  </p>
                </div>
              )}

              {/* Action Buttons for Next Scan */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Imbas Pas Seterusnya</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>SK MORIB PONDOK KAWALAN</span>
          <span>Tekan ESC atau Tutup untuk keluar</span>
        </div>

      </div>
    </div>
  );
}
