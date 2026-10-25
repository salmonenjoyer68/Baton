const BPM = 110;
const BEAT_SECONDS = 60 / BPM;
const LOOP_BEATS = 8;

const NOTES = [130.81, 155.56, 174.61, 196, 233.08, 261.63];

export class AudioEngine {
  constructor(onBeat) {
    this.context = null;
    this.master = null;
    this.timer = null;
    this.nextBeat = 0;
    this.beat = 0;
    this.running = false;
    this.layers = new Map();
    this.pendingLayers = new Map();
    this.onBeat = onBeat;
  }

  async start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
    if (!this.running) {
      this.running = true;
      this.nextBeat = this.context.currentTime + 0.05;
      this.beat = 0;
      this.schedule();
      this.timer = window.setInterval(() => this.schedule(), 25);
    }
  }

  pause() {
    this.running = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    if (this.context) this.context.suspend();
  }

  setLayer(slot, sound, muted, solo) {
    this.pendingLayers.set(slot, { sound, muted, solo });
  }

  removeLayer(slot) {
    this.pendingLayers.set(slot, null);
  }

  schedule() {
    if (!this.context || !this.running) return;
    const horizon = this.context.currentTime + 0.12;
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
        if (!layer.muted && (!hasSolo || layer.solo)) {
          this.playSound(layer.sound, this.nextBeat, beat);
        }
      }
      window.setTimeout(() => this.onBeat(beat), Math.max(0, (this.nextBeat - this.context.currentTime) * 1000));
      this.nextBeat += BEAT_SECONDS;
      this.beat = (this.beat + 1) % LOOP_BEATS;
    }
  }

  playSound(sound, time, beat) {
    const type = sound.type;
    const ctx = this.context;
    const output = ctx.createGain();
    output.connect(this.master);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(type === "voice" ? 0.14 : 0.24, time + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + (type === "effect" ? 0.55 : 0.25));
    envelope.connect(output);

    if (type === "noise") {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      filter.type = sound.name.includes("hat") ? "highpass" : "bandpass";
      filter.frequency.value = sound.name.includes("hat") ? 5000 : 1200;
      source.buffer = buffer;
      source.connect(filter).connect(envelope);
      source.start(time);
      source.stop(time + 0.6);
      return;
    }

    const oscillator = ctx.createOscillator();
    oscillator.type = type === "voice" ? "triangle" : type === "effect" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(NOTES[(sound.note + beat) % NOTES.length], time);
    if (type === "effect") oscillator.frequency.exponentialRampToValueAtTime(NOTES[(sound.note + 2) % NOTES.length] * 2, time + 0.5);
    oscillator.connect(envelope);
    oscillator.start(time);
    oscillator.stop(time + (type === "effect" ? 0.6 : 0.3));
  }
}

export { BPM, LOOP_BEATS };
