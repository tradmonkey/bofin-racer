// A quiet procedural engine: no downloads and no network requests.
export function createEngineAudio() {
  let context, oscillator, harmonic, gain, filter, muted = false;
  function unlock() {
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
        gain = context.createGain();
        gain.gain.value = 0;
        filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 450;
        filter.connect(gain);
        gain.connect(context.destination);
        oscillator = context.createOscillator();
        harmonic = context.createOscillator();
        oscillator.type = 'sawtooth';
        harmonic.type = 'triangle';
        oscillator.connect(filter);
        harmonic.connect(filter);
        oscillator.start();
        harmonic.start();
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Audio is optional; driving works when unavailable. */ }
  }
  return {
    unlock,
    toggle() { muted = !muted; return muted; },
    update(active, speed, throttle, profile) {
      if (!context || !gain) return;
      const t = context.currentTime;
      const revs = Math.min(Math.abs(speed) / profile.top, 1.5);
      const frequency = profile.tone * (1 + revs * 2.5 + (throttle ? 0.3 : 0));
      oscillator.frequency.setTargetAtTime(frequency, t, 0.12);
      harmonic.frequency.setTargetAtTime(frequency * 0.5, t, 0.12);
      filter.frequency.setTargetAtTime(240 + revs * 700 + (throttle ? 180 : 0), t, 0.15);
      gain.gain.setTargetAtTime(active && !muted ? 0.018 + revs * 0.018 : 0, t, 0.08);
    },
  };
}
