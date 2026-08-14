/**
 * Audio feedback utility using Web Audio API
 */
export function playSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First high tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
    
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start();
    osc1.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // AudioContext might be blocked until user gesture, safely ignore
  }
}

export function playErrorBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.setValueAtTime(180, ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

/**
 * Parses scanned QR code string into a Visitor ID
 */
export function parseVisitorIdFromQR(qrData: string): string | null {
  if (!qrData || typeof qrData !== 'string') return null;
  const trimmed = qrData.trim();

  // Pattern 1: JSON payload {"id": "..."}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.id) return String(parsed.id).trim();
      if (parsed.visitorId) return String(parsed.visitorId).trim();
    } catch (e) {}
  }

  // Pattern 2: Prefix format SKM-PASS:UUID or PASS:UUID or SKM:UUID
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart) return lastPart;
    }
  }

  // Pattern 3: URL with visitorId query parameter
  if (trimmed.includes('visitorId=') || trimmed.includes('id=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed}`);
      const idParam = url.searchParams.get('visitorId') || url.searchParams.get('id');
      if (idParam) return idParam.trim();
    } catch (e) {}
  }

  // Pattern 4: Raw ID string (UUID or timestamp ID or custom alphanumeric string)
  return trimmed;
}
