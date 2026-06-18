"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Music2, VolumeX, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Sound = "lofi" | "rain" | "white" | "brown";

const SOUNDS: { id: Sound; label: string; emoji: string }[] = [
  { id: "lofi",  label: "Lo-fi",       emoji: "🎵" },
  { id: "rain",  label: "Rain",        emoji: "🌧️" },
  { id: "white", label: "White Noise", emoji: "〰️" },
  { id: "brown", label: "Brown Noise", emoji: "🟤" },
];

// ── Noise buffers ────────────────────────────────────────────────────────────

function makeNoiseBuffer(ctx: AudioContext, type: "white" | "brown"): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 4, sr);
  const data = buf.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } else {
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * w) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  }
  return buf;
}

function makeReverbIR(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = sr * 1.8;
  const ir = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const ch = ir.getChannelData(c);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
    }
  }
  return ir;
}

// ── Lo-fi chord engine ───────────────────────────────────────────────────────
// 4-chord loop: Cmaj7 → Am7 → Fmaj7 → G7, 80 BPM, 4 beats/chord

const CHORD_FREQS = [
  [130.81, 164.81, 196.00, 246.94], // Cmaj7 (C3 E3 G3 B3)
  [110.00, 130.81, 164.81, 196.00], // Am7  (A2 C3 E3 G3)
  [ 87.31, 110.00, 130.81, 164.81], // Fmaj7 (F2 A2 C3 E3)
  [ 98.00, 123.47, 146.83, 174.61], // G7  (G2 B2 D3 F3)
];

const BEAT_MS  = (60 / 80) * 1000; // 750ms @ 80 BPM
const CHORD_DUR = BEAT_MS * 4 / 1000; // 4 beats per chord = 3s

class LofiEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private filter!: BiquadFilterNode;
  private reverb!: ConvolverNode;
  private reverbGain!: GainNode;
  private dryGain!: GainNode;
  private oscs: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private timerRef: ReturnType<typeof setTimeout> | null = null;
  private nextTime = 0;
  private chordIdx = 0;
  private running = false;

  constructor(ctx: AudioContext, master: GainNode) {
    this.ctx = ctx;
    this.master = master;
    this.buildGraph();
  }

  private buildGraph() {
    // lowpass for warmth
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 680;
    this.filter.Q.value = 0.4;

    // reverb
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = makeReverbIR(this.ctx);

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.6;
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.4;

    this.filter.connect(this.dryGain);
    this.filter.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.dryGain.connect(this.master);
    this.reverbGain.connect(this.master);
  }

  start() {
    this.running = true;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.chordIdx = 0;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.timerRef !== null) { clearTimeout(this.timerRef); this.timerRef = null; }
    for (const o of this.oscs) { try { o.stop(); } catch { /* already stopped */ } }
    this.oscs = [];
    this.gains = [];
  }

  disconnect() {
    this.stop();
    try { this.filter.disconnect(); } catch { /* ok */ }
    try { this.reverb.disconnect(); } catch { /* ok */ }
    try { this.dryGain.disconnect(); } catch { /* ok */ }
    try { this.reverbGain.disconnect(); } catch { /* ok */ }
  }

  private tick() {
    if (!this.running) return;
    const ahead = 2.0; // schedule 2s ahead
    while (this.nextTime < this.ctx.currentTime + ahead) {
      this.scheduleChord(this.nextTime);
      this.nextTime += CHORD_DUR;
      this.chordIdx = (this.chordIdx + 1) % CHORD_FREQS.length;
    }
    this.timerRef = setTimeout(() => this.tick(), 800);
  }

  private scheduleChord(t: number) {
    const freqs = CHORD_FREQS[this.chordIdx];
    const attack = 0.5;
    const release = 0.9;
    const vel = 0.13 / freqs.length; // per-note volume

    for (const freq of freqs) {
      // slight detune per note for thickness
      const detune = (Math.random() - 0.5) * 8;

      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;

      // 2nd harmonic adds warmth
      const osc2 = this.ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      osc2.detune.value = detune + 3;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + attack);
      g.gain.setValueAtTime(vel * 0.85, t + CHORD_DUR - release);
      g.gain.linearRampToValueAtTime(0, t + CHORD_DUR);

      const g2 = this.ctx.createGain();
      g2.gain.value = 0.25; // 2nd harmonic quieter

      osc.connect(g);
      osc2.connect(g2);
      g.connect(this.filter);
      g2.connect(this.filter);

      osc.start(t);
      osc.stop(t + CHORD_DUR + 0.05);
      osc2.start(t);
      osc2.stop(t + CHORD_DUR + 0.05);

      this.oscs.push(osc, osc2);
      this.gains.push(g, g2);
    }

    // subtle kick on beat 1 of each chord
    this.scheduleKick(t);
  }

  private scheduleKick(t: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.3);
    this.oscs.push(osc);
  }
}

// ── Noise player ─────────────────────────────────────────────────────────────

function playNoise(
  ctx: AudioContext,
  master: GainNode,
  type: "white" | "brown" | "rain"
): () => void {
  const buf = makeNoiseBuffer(ctx, type === "rain" ? "white" : type);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  if (type === "rain") {
    // layered bandpass for realistic rain texture
    const targets: [number, number][] = [[800, 0.3], [2800, 0.6], [5500, 1.2]];
    for (const [freq, q] of targets) {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq;
      f.Q.value = q;
      src.connect(f);
      f.connect(master);
    }
  } else if (type === "white") {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 7000;
    src.connect(f);
    f.connect(master);
  } else {
    src.connect(master);
  }

  src.start();
  return () => { try { src.stop(); } catch { /* ok */ } };
}

// ── Component ────────────────────────────────────────────────────────────────

export function AmbientPlayer() {
  const [open, setOpen]     = useState(false);
  const [playing, setPlaying] = useState<Sound | null>(null);
  const [volume, setVolume] = useState(0.4);

  const ctxRef    = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stopRef   = useRef<(() => void) | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = volume;
      masterRef.current.connect(ctxRef.current.destination);
    }
    return ctxRef.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const play = useCallback((type: Sound) => {
    stop();
    const ctx = getCtx();
    if (ctx.state === "suspended") void ctx.resume();

    if (type === "lofi") {
      const engine = new LofiEngine(ctx, masterRef.current!);
      engine.start();
      stopRef.current = () => engine.disconnect();
    } else {
      const cleanup = playNoise(ctx, masterRef.current!, type);
      stopRef.current = cleanup;
    }
  }, [getCtx, stop]);

  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.015);
    }
  }, [volume]);

  useEffect(() => () => {
    stop();
    ctxRef.current?.close();
  }, [stop]);

  function toggle(id: Sound) {
    if (playing === id) {
      stop();
      setPlaying(null);
    } else {
      play(id);
      setPlaying(id);
    }
  }

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2">
      {open && (
        <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl p-4 w-52 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Ambient Sound</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {SOUNDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  playing === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span className="text-base leading-none">{s.emoji}</span>
                <span>{s.label}</span>
                {playing === s.id && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <VolumeX className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="range" min={0} max={1} step={0.05} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Ambient sound"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors",
            playing
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Music2 className="h-4 w-4" />
        </button>
        {playing && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
        )}
      </div>
    </div>
  );
}
