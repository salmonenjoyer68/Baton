import { NOTE_HZ } from "./sounds";

const BPM = 110;
const BEAT_SECONDS = 60 / BPM;
const LOOP_BEATS = 8;
const LOOKAHEAD_SECONDS = 0.12;
const TICK_MS = 25;
const NOISE_SECONDS = 1;
const NOISE_OFFSETS = 0.1;
const MASTER_GAIN = 0.18;

export class AudioEngine {
  constructor(onBeat) {
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.timer = null;
    this.frameRequest = null;
    this.origin = null;
    this.nextBeat = 0;
    this.beat = 0;
    this.reportedBeat = -1;
    this.running = false;
    this.layers = new Map();
    this.pendingLayers = new Map();
    this.onBeat = onBeat;
  }

  async start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_GAIN;
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    }
    await this.context.resume();
    if (this.running) return;
    if (this.origin === null) {
      this.origin = this.context.currentTime + 0.05;
      this.nextBeat = this.origin;
      this.beat = 0;
    }
    this.running = true;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.reportBeat();
  }

  pause() {
    this.running = false;
    window.clearInterval(this.timer);
    window.cancelAnimationFrame(this.frameRequest);
    this.timer = null;
    this.frameRequest = null;
    this.reportedBeat = -1;
    if (this.context) this.context.suspend();
  }

  // A layer is `{ sound, muted, solo }` or null. Replacing a slot with a
  // different sound waits for the loop boundary; mute/solo of the sound that is
  // already playing applies immediately, as does removal.
  setLayer(slot, layer) {
    if (!layer) {
      this.pendingLayers.delete(slot);
      this.layers.delete(slot);
      return;
    }
    const active = this.layers.get(slot);
    if (active && active.sound.id === layer.sound.id) {
      this.layers.set(slot, { ...active, muted: layer.muted, solo: layer.solo });
      this.pendingLayers.delete(slot);
      return;
    }
    this.pendingLayers.set(slot, layer);
  }

  schedule() {
    if (!this.context || !this.running) return;
    const now = this.context.currentTime;
    // A throttled or backgrounded ticker can fall behind the audio clock.
    // Skip forward on the grid rather than scheduling notes in the past.
    if (now - this.nextBeat > BEAT_SECONDS) {
      const skipped = Math.ceil((now - this.nextBeat) / BEAT_SECONDS);
      this.nextBeat += skipped * BEAT_SECONDS;
      this.beat = (this.beat + skipped) % LOOP_BEATS;
    }
    const horizon = now + LOOKAHEAD_SECONDS;
    while (this.nextBeat < horizon) {
      const beat = this.beat;
      if (beat === 0 && this.pendingLayers.size) {
        for (const [slot, layer] of this.pendingLayers) {
          if (layer) this.layers.set(slot, layer);
          else this.layers.delete(slot);
        }
        this.pendingLayers.clear();
      }
      const active = [...this.layers.values()];
      const hasSolo = active.some((layer) => layer.solo);
      for (const layer of active) {
        if (layer.muted || (hasSolo && !layer.solo)) continue;
        const velocity = layer.sound.steps[beat];
        if (velocity) this.playSound(layer.sound, this.nextBeat, velocity);
      }
      this.nextBeat += BEAT_SECONDS;
      this.beat = (this.beat + 1) % LOOP_BEATS;
    }
  }

  // Visual beat, read straight off the audio clock so the UI cannot drift.
  reportBeat() {
    this.frameRequest = null;
    if (!this.running || !this.context) return;
    const now = this.context.currentTime;
    if (now >= this.origin) {
      const beat = Math.floor((now - this.origin) / BEAT_SECONDS) % LOOP_BEATS;
      if (beat !== this.reportedBeat) {
        this.reportedBeat = beat;
        this.onBeat(beat);
      }
    }
    this.frameRequest = window.requestAnimationFrame(() => this.reportBeat());
  }

  createNoiseBuffer() {
    const length = Math.ceil(this.context.sampleRate * NOISE_SECONDS);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  playSound(sound, time, velocity) {
    const { tone, noise } = sound;
    const duration = Math.max(tone ? tone.duration : 0, noise ? noise.duration : 0);
    const envelope = this.context.createGain();
    const peak = (sound.gain ?? 0.3) * velocity * 0.26;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(peak, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    envelope.connect(this.master);
    if (tone) this.playTone(tone, time, envelope);
    if (noise) this.playNoise(noise, time, envelope);
  }

  playTone(tone, time, destination) {
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    oscillator.type = tone.wave ?? "sine";
    oscillator.frequency.setValueAtTime(NOTE_HZ[tone.note], time);
    if (tone.glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(NOTE_HZ[tone.glideTo], time + (tone.glide ?? 0.1));
    }
    let output = oscillator;
    if (tone.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = tone.filter.type;
      filter.frequency.setValueAtTime(tone.filter.frequency, time);
      filter.Q.value = tone.filter.q ?? 1;
      oscillator.connect(filter);
      output = filter;
    }
    output.connect(destination);
    oscillator.start(time);
    oscillator.stop(time + tone.duration);
  }

  playNoise(noise, time, destination) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    filter.type = noise.filter;
    filter.frequency.setValueAtTime(noise.frequency, time);
    filter.Q.value = noise.q ?? 1;
    if (noise.glideTo) {
      filter.frequency.exponentialRampToValueAtTime(noise.glideTo, time + (noise.glide ?? 0.2));
    }
    source.buffer = this.noiseBuffer;
    source.connect(filter).connect(destination);
    source.start(time, Math.random() * NOISE_OFFSETS);
    source.stop(time + noise.duration);
  }
}

export { BPM, LOOP_BEATS, BEAT_SECONDS };
