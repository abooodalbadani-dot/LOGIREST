'use client';

export type AudioSoundType = 'success' | 'error' | 'scan' | 'click';

export function useAudioFeedback() {
  const playSound = (type: AudioSoundType) => {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      
      const playTone = (frequency: number, oscillatorType: OscillatorType, duration: number, startTime: number, volume: number = 0.1) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = oscillatorType;
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gain.gain.setValueAtTime(volume, startTime);
        // Exponential decay to create a clean, natural fade-out
        gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;

      switch (type) {
        case 'success':
          // Elegant C5 to E5 high-fidelity dual-tone chime
          playTone(523.25, 'sine', 0.25, now, 0.1);
          playTone(659.25, 'sine', 0.35, now + 0.08, 0.08);
          break;
        case 'error':
          // Low-frequency warning tone sequence
          playTone(180, 'triangle', 0.15, now, 0.15);
          playTone(150, 'triangle', 0.2, now + 0.1, 0.15);
          break;
        case 'scan':
          // Crisp, high-frequency barcode scanner ping
          playTone(1200, 'sine', 0.08, now, 0.1);
          break;
        case 'click':
          // Ultra-short tactile click feedback sound
          playTone(800, 'sine', 0.03, now, 0.05);
          break;
      }
    } catch (e) {
      console.warn('Audio feedback failed to execute:', e);
    }
  };

  return { playSound };
}
