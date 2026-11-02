// Sound model. One entry per sound: an 8-beat pattern plus the synthesis recipe
// that plays it. A sound is swapped for a sample by editing its entry only —
// nothing in the engine or the UI knows about individual sounds.

// C minor pentatonic (C, Eb, F, G, Bb) across three octaves. Every pitched
// recipe must name a note from this table so any combination stays musical.
export const NOTE_HZ = {
  C1: 32.7,
  Eb1: 38.89,
  "C2": 65.41,
  Eb2: 77.78,
  F2: 87.31,
  G2: 98.0,
  Bb2: 116.54,
  C3: 130.81,
  Eb3: 155.56,
  F3: 174.61,
  G3: 196.0,
  Bb3: 233.08,
  C4: 261.63,
  Eb4: 311.13,
  F4: 349.23,
  G4: 392.0,
  Bb4: 466.16,
  C5: 523.25,
  C6: 1046.5
};

export const CATEGORIES = [
  { id: "beats", label: "Beats" },
  { id: "melody", label: "Bass + Melody" },
  { id: "effects", label: "Effects" },
  { id: "voices", label: "Voices" }
];

// `steps` holds one velocity (0 = silent) per beat of the loop.
// `tone` and `noise` are optional; a sound may use either or both.
export const SOUNDS = [
  // Beats
  {
    id: "beats-kick",
    name: "Kick bloom",
    category: "beats",
    steps: [1, 0, 0, 0, 0.85, 0, 0, 0],
    gain: 0.95,
    tone: { wave: "sine", note: "C2", glideTo: "C1", glide: 0.12, duration: 0.36 }
  },
  {
    id: "beats-clap",
    name: "Clap snap",
    category: "beats",
    steps: [0, 0, 1, 0, 0, 0, 1, 0],
    gain: 0.5,
    noise: { filter: "bandpass", frequency: 1800, q: 1.4, duration: 0.16 }
  },
  {
    id: "beats-hat",
    name: "Hi-hat fizz",
    category: "beats",
    steps: [1, 1, 1, 1, 1, 1, 1, 1],
    gain: 0.26,
    noise: { filter: "highpass", frequency: 7500, q: 0.7, duration: 0.07 }
  },
  {
    id: "beats-conga",
    name: "Conga pop",
    category: "beats",
    steps: [0, 1, 0, 0, 1, 0, 0, 1],
    gain: 0.6,
    tone: { wave: "triangle", note: "G3", glideTo: "F3", glide: 0.06, duration: 0.22 }
  },
  {
    id: "beats-shaker",
    name: "Shaker sun",
    category: "beats",
    steps: [0, 1, 0, 1, 0, 1, 0, 1],
    gain: 0.34,
    noise: { filter: "highpass", frequency: 4200, q: 0.9, duration: 0.1 }
  },

  // Bass + Melody
  {
    id: "melody-bass",
    name: "Moon bass",
    category: "melody",
    steps: [1, 0, 0, 0, 0, 0, 1, 0],
    gain: 0.55,
    tone: { wave: "sine", note: "C3", duration: 0.5 }
  },
  {
    id: "melody-pluck",
    name: "Palm pluck",
    category: "melody",
    steps: [1, 0, 1, 0, 1, 0, 1, 0],
    gain: 0.4,
    tone: { wave: "triangle", note: "Eb3", filter: { type: "lowpass", frequency: 1200, q: 2 }, duration: 0.3 }
  },
  {
    id: "melody-lead",
    name: "Lagoon lead",
    category: "melody",
    steps: [0, 0, 1, 0, 0, 1, 0, 1],
    gain: 0.26,
    tone: { wave: "sawtooth", note: "G3", filter: { type: "lowpass", frequency: 1800, q: 4 }, duration: 0.28 }
  },
  {
    id: "melody-keys",
    name: "Tide keys",
    category: "melody",
    steps: [1, 0, 0, 1, 0, 0, 1, 0],
    gain: 0.22,
    tone: { wave: "square", note: "F3", filter: { type: "lowpass", frequency: 900, q: 1 }, duration: 0.4 }
  },
  {
    id: "melody-sub",
    name: "Coconut sub",
    category: "melody",
    steps: [1, 0, 0, 0, 0, 0, 1, 0],
    gain: 0.5,
    tone: { wave: "sine", note: "Bb2", glideTo: "C2", glide: 0.3, duration: 0.45 }
  },

  // Effects
  {
    id: "effects-riser",
    name: "Sunrise sweep",
    category: "effects",
    steps: [1, 0, 0, 0, 0, 0, 0, 0],
    gain: 0.18,
    tone: { wave: "sawtooth", note: "Eb3", glideTo: "C5", glide: 0.8, duration: 0.9 }
  },
  {
    id: "effects-wash",
    name: "Wave wash",
    category: "effects",
    steps: [0, 0, 0, 0, 1, 0, 0, 0],
    gain: 0.3,
    noise: { filter: "lowpass", frequency: 1600, q: 2, glideTo: 320, glide: 0.7, duration: 0.9 }
  },
  {
    id: "effects-stab",
    name: "Spark stab",
    category: "effects",
    steps: [1, 0, 0, 1, 0, 0, 1, 0],
    gain: 0.3,
    tone: { wave: "square", note: "C4", filter: { type: "lowpass", frequency: 2400, q: 3 }, duration: 0.22 }
  },
  {
    id: "effects-shimmer",
    name: "Heat shimmer",
    category: "effects",
    steps: [0, 0, 1, 0, 0, 0, 1, 0],
    gain: 0.12,
    tone: { wave: "sine", note: "C6", duration: 0.8 }
  },
  {
    id: "effects-burst",
    name: "Star burst",
    category: "effects",
    steps: [1, 0, 0, 0, 0, 1, 0, 0],
    gain: 0.24,
    noise: { filter: "bandpass", frequency: 1800, q: 3, glideTo: 5200, glide: 0.35, duration: 0.5 }
  },

  // Voices
  {
    id: "voices-ooh",
    name: "Ooh breeze",
    category: "voices",
    steps: [1, 0, 0, 0, 0, 0, 0, 0],
    gain: 0.3,
    tone: { wave: "triangle", note: "Eb4", filter: { type: "bandpass", frequency: 800, q: 3 }, duration: 0.45 }
  },
  {
    id: "voices-hey",
    name: "Hey hey",
    category: "voices",
    steps: [0, 0, 1, 0, 0, 0, 1, 0],
    gain: 0.28,
    tone: { wave: "sawtooth", note: "G4", filter: { type: "bandpass", frequency: 1200, q: 4 }, duration: 0.18 }
  },
  {
    id: "voices-hum",
    name: "Hum tide",
    category: "voices",
    steps: [1, 0, 0, 0, 1, 0, 0, 0],
    gain: 0.32,
    tone: { wave: "sine", note: "F3", duration: 0.55 }
  },
  {
    id: "voices-la",
    name: "La la loop",
    category: "voices",
    steps: [1, 1, 0, 1, 1, 0, 1, 0],
    gain: 0.26,
    tone: { wave: "triangle", note: "C4", filter: { type: "bandpass", frequency: 1000, q: 2 }, duration: 0.25 }
  },
  {
    id: "voices-glow",
    name: "Vocal glow",
    category: "voices",
    steps: [0, 0, 0, 0, 1, 0, 0, 0],
    gain: 0.16,
    tone: { wave: "sine", note: "Bb4", filter: { type: "bandpass", frequency: 1400, q: 5 }, duration: 0.6 }
  }
];

export const CATEGORY_GROUPS = CATEGORIES.map((category) => ({
  ...category,
  sounds: SOUNDS.filter((sound) => sound.category === category.id)
}));

// Fail loudly at load instead of scheduling NaN frequencies: every pitched
// recipe must name a note that exists in NOTE_HZ.
for (const sound of SOUNDS) {
  for (const note of [sound.tone?.note, sound.tone?.glideTo]) {
    if (note !== undefined && !(note in NOTE_HZ)) {
      throw new Error(`Sound "${sound.id}" uses unknown note "${note}"`);
    }
  }
}
