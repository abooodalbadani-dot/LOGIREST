// Web Audio API Synthesizer Alerts for Warehouse Scanning Operations
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('ops_audio_enabled') !== 'false';
}

export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ops_audio_enabled', enabled ? 'true' : 'false');
}

function playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', slideToFreq?: number) {
  if (!isAudioEnabled()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // Resume context if suspended (browser autoplay policy security)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  if (slideToFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(slideToFreq, ctx.currentTime + durationMs / 1000);
  }
  
  gainNode.gain.setValueAtTime(0.05, ctx.currentTime); // Keep it subtle and low volume
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000); // Smooth decay
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationMs / 1000);
}

export const audioAlerts = {
  playScanSuccess() {
    playTone(880, 80, 'sine'); // High pitch, sharp, clear
  },
  
  playScanDuplicate() {
    // Double beep
    playTone(440, 50, 'triangle');
    setTimeout(() => {
      playTone(440, 50, 'triangle');
    }, 100);
  },
  
  playScanBlocked() {
    playTone(180, 200, 'sawtooth'); // Deep low buzz
  },
  
  playScanInvalid() {
    playTone(600, 150, 'sine', 300); // Descending pitch
  }
};
