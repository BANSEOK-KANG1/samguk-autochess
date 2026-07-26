/**
 * Lightweight SFX manager.
 * Plays procedural Web Audio tones immediately, and swaps in
 * `/sfx/<id>.mp3` (or `.ogg`) when those files are present.
 */

export type SfxId =
  | "ui"
  | "buy"
  | "merge"
  | "reroll"
  | "equip"
  | "battle"
  | "hit"
  | "skill"
  | "heal"
  | "defeat"
  | "win"
  | "lose";

const MUTE_KEY = "samguk-sfx-muted";
const FILE_EXTS = ["mp3", "ogg", "wav"] as const;
const BGM_GAIN = 0.085;
/** Sparse D-minor pentatonic (동양풍 대기 선율) */
const BGM_SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66];

type ToneSpec = {
  freqs: number[];
  duration: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
};

const TONES: Record<SfxId, ToneSpec> = {
  ui: { freqs: [520, 680], duration: 0.07, type: "triangle", gain: 0.05 },
  buy: { freqs: [330, 440, 560], duration: 0.14, type: "triangle", gain: 0.07 },
  merge: {
    freqs: [280, 420, 560, 720],
    duration: 0.28,
    type: "sawtooth",
    gain: 0.055,
  },
  reroll: { freqs: [240, 180, 320], duration: 0.12, type: "square", gain: 0.035 },
  equip: { freqs: [480, 620], duration: 0.1, type: "triangle", gain: 0.06 },
  battle: {
    freqs: [160, 220, 180],
    duration: 0.32,
    type: "sawtooth",
    gain: 0.05,
    slide: -40,
  },
  hit: { freqs: [140, 90], duration: 0.07, type: "square", gain: 0.04 },
  skill: {
    freqs: [360, 480, 640, 520],
    duration: 0.34,
    type: "sawtooth",
    gain: 0.06,
  },
  heal: { freqs: [420, 540, 680], duration: 0.2, type: "sine", gain: 0.05 },
  defeat: { freqs: [200, 120, 80], duration: 0.18, type: "triangle", gain: 0.05 },
  win: {
    freqs: [392, 494, 587, 784],
    duration: 0.42,
    type: "triangle",
    gain: 0.06,
  },
  lose: {
    freqs: [330, 262, 196],
    duration: 0.38,
    type: "sine",
    gain: 0.055,
  },
};

const THROTTLE_MS: Partial<Record<SfxId, number>> = {
  hit: 90,
  heal: 140,
  defeat: 160,
  ui: 80,
};

let audioCtx: AudioContext | null = null;
let unlocked = false;
let muted =
  typeof localStorage !== "undefined" &&
  localStorage.getItem(MUTE_KEY) === "1";
const lastPlayed = new Map<SfxId, number>();
const fileBuffers = new Map<SfxId, AudioBuffer>();
const fileTried = new Set<SfxId>();
const listeners = new Set<(value: boolean) => void>();

let bgmDesired = false;
let bgmRunning = false;
let bgmMaster: GainNode | null = null;
let bgmFileSource: AudioBufferSourceNode | null = null;
let bgmFileBuffer: AudioBuffer | null = null;
let bgmFileTried = false;
let bgmOscillators: OscillatorNode[] = [];
let bgmIntervalId: ReturnType<typeof setInterval> | null = null;

const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
};

const notify = () => {
  listeners.forEach((listener) => listener(muted));
};

const playTone = (id: SfxId, volume = 1) => {
  const ctx = getCtx();
  if (!ctx) return;
  const spec = TONES[id];
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = (spec.gain ?? 0.05) * volume;
  master.connect(ctx.destination);

  spec.freqs.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.045;
    const end = start + spec.duration;
    osc.type = spec.type ?? "triangle";
    osc.frequency.setValueAtTime(freq, start);
    if (spec.slide) {
      osc.frequency.linearRampToValueAtTime(freq + spec.slide, end);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(1, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  });
};

const playBuffer = (buffer: AudioBuffer, volume = 1) => {
  const ctx = getCtx();
  if (!ctx) return;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
};

const tryLoadFile = async (id: SfxId) => {
  if (fileTried.has(id) || typeof fetch === "undefined") return;
  fileTried.add(id);
  const ctx = getCtx();
  if (!ctx) return;
  for (const ext of FILE_EXTS) {
    try {
      const response = await fetch(`./sfx/${id}.${ext}`, { cache: "force-cache" });
      if (!response.ok) continue;
      const raw = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(raw.slice(0));
      fileBuffers.set(id, buffer);
      return;
    } catch {
      /* try next extension */
    }
  }
};

export const isSfxMuted = () => muted;

const stopBgmInternal = () => {
  if (bgmIntervalId !== null) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
  bgmOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  });
  bgmOscillators = [];
  if (bgmFileSource) {
    try {
      bgmFileSource.stop();
    } catch {
      /* already stopped */
    }
    bgmFileSource.disconnect();
    bgmFileSource = null;
  }
  if (bgmMaster) {
    try {
      bgmMaster.disconnect();
    } catch {
      /* ignore */
    }
    bgmMaster = null;
  }
  bgmRunning = false;
};

const playBgmMelodyNote = (ctx: AudioContext, master: GainNode) => {
  const freq = BGM_SCALE[Math.floor(Math.random() * BGM_SCALE.length)] ?? 196;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 2);
  bgmOscillators.push(osc);
  osc.onended = () => {
    bgmOscillators = bgmOscillators.filter((node) => node !== osc);
  };
};

const startProceduralBgm = (ctx: AudioContext, master: GainNode) => {
  const droneFreqs = [73.42, 110, 146.83];
  droneFreqs.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = 480 - index * 60;
    gain.gain.value = index === 0 ? 0.45 : 0.16;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    bgmOscillators.push(osc);
  });
  playBgmMelodyNote(ctx, master);
  bgmIntervalId = setInterval(() => {
    if (!bgmRunning || !bgmMaster) return;
    playBgmMelodyNote(ctx, bgmMaster);
  }, 3200);
};

const tryLoadBgmFile = async (): Promise<AudioBuffer | null> => {
  if (bgmFileBuffer) return bgmFileBuffer;
  if (bgmFileTried || typeof fetch === "undefined") return null;
  bgmFileTried = true;
  const ctx = getCtx();
  if (!ctx) return null;
  for (const ext of FILE_EXTS) {
    try {
      const response = await fetch(`./sfx/bgm.${ext}`, { cache: "force-cache" });
      if (!response.ok) continue;
      const raw = await response.arrayBuffer();
      bgmFileBuffer = await ctx.decodeAudioData(raw.slice(0));
      return bgmFileBuffer;
    } catch {
      /* try next */
    }
  }
  return null;
};

const startBgmInternal = async () => {
  if (bgmRunning || muted || !bgmDesired) return;
  const ctx = getCtx();
  if (!ctx || !unlocked) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  bgmRunning = true;
  const master = ctx.createGain();
  master.gain.value = BGM_GAIN;
  master.connect(ctx.destination);
  bgmMaster = master;

  const file = await tryLoadBgmFile();
  if (!bgmDesired || muted || bgmMaster !== master) {
    master.disconnect();
    if (bgmMaster === master) bgmMaster = null;
    bgmRunning = false;
    return;
  }

  if (file) {
    const source = ctx.createBufferSource();
    source.buffer = file;
    source.loop = true;
    source.connect(master);
    source.start(0);
    bgmFileSource = source;
    return;
  }

  startProceduralBgm(ctx, master);
};

const syncBgm = () => {
  if (bgmDesired && !muted && unlocked) {
    void startBgmInternal();
  } else {
    stopBgmInternal();
  }
};

/** Keep title/lobby BGM on while desired; mute and unlock still gate playback. */
export const setBgmDesired = (wanted: boolean) => {
  bgmDesired = wanted;
  syncBgm();
};

export const setSfxMuted = (value: boolean) => {
  muted = value;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  }
  notify();
  syncBgm();
};

export const toggleSfxMuted = () => {
  setSfxMuted(!muted);
  return muted;
};

export const subscribeSfxMute = (listener: (value: boolean) => void) => {
  listeners.add(listener);
  listener(muted);
  return () => {
    listeners.delete(listener);
  };
};

/** Call on first user gesture so mobile WebViews allow audio. */
export const unlockSfx = async () => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  if (!unlocked) {
    unlocked = true;
    // Warm a near-silent tick so later plays stay in sync.
    playTone("ui", 0.001);
    (Object.keys(TONES) as SfxId[]).forEach((id) => {
      void tryLoadFile(id);
    });
    void tryLoadBgmFile();
  }
  syncBgm();
};

export const playSfx = (
  id: SfxId,
  options?: { volume?: number; force?: boolean },
) => {
  if (muted && !options?.force) return;
  if (typeof window === "undefined") return;
  const throttle = THROTTLE_MS[id] ?? 0;
  const now = performance.now();
  if (!options?.force && throttle > 0) {
    const previous = lastPlayed.get(id) ?? 0;
    if (now - previous < throttle) return;
  }
  lastPlayed.set(id, now);

  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const volume = options?.volume ?? 1;
  const file = fileBuffers.get(id);
  if (file) {
    playBuffer(file, volume);
    return;
  }
  void tryLoadFile(id);
  playTone(id, volume);
};
