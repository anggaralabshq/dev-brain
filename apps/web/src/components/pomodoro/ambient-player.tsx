"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Music2, VolumeX, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Sound = "white" | "brown" | "rain";

const SOUNDS: { id: Sound; label: string; emoji: string }[] = [
  { id: "white", label: "White Noise", emoji: "〰️" },
  { id: "brown", label: "Brown Noise", emoji: "🟤" },
  { id: "rain",  label: "Rain",        emoji: "🌧️" },
];

function makeBuffer(ctx: AudioContext, type: Sound): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 3, sr);
  const data = buf.getChannelData(0);
  if (type === "white" || type === "rain") {
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

export function AmbientPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<Sound | null>(null);
  const [volume, setVolume] = useState(0.35);

  const ctxRef   = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

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
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
  }, []);

  const play = useCallback((type: Sound) => {
    stop();
    const ctx = getCtx();
    if (ctx.state === "suspended") void ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = makeBuffer(ctx, type);
    source.loop = true;

    if (type === "rain") {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2500;
      filter.Q.value = 0.7;
      source.connect(filter);
      filter.connect(masterRef.current!);
    } else {
      source.connect(masterRef.current!);
    }

    source.start();
    sourceRef.current = source;
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
