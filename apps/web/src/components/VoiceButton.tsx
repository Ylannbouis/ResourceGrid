"use client";

import { useRef, useState } from "react";
import type { VoiceTriageResult } from "@resourcegrid/shared";
import { triageVoice } from "@/lib/api";
import type { LatLng } from "./MapView";

type State = "idle" | "recording" | "processing" | "error";

interface VoiceButtonProps {
  location: LatLng | null;
  onResult: (result: VoiceTriageResult) => void;
}

/**
 * The crisis-first input: tap, speak ("My basement is flooding at 123 Elm St, I need a
 * pump"), and the backend (Deepgram + Claude) turns it into a structured pin. Records via
 * MediaRecorder, uploads the audio, hands the parsed result up to AppShell.
 */
export function VoiceButton({ location, onResult }: VoiceButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      setError("Recording isn't supported on this device.");
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setState("processing");
        try {
          const result = await triageVoice(blob, location ?? undefined);
          onResult(result);
          setState("idle");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn't process the audio.");
          setState("error");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setError("Microphone access was blocked.");
      setState("error");
    }
  };

  const stop = () => recorderRef.current?.stop();

  const toggle = () => {
    if (state === "recording") stop();
    else if (state !== "processing") start();
  };

  const recording = state === "recording";
  const processing = state === "processing";

  const label =
    state === "recording"
      ? "Listening… tap to stop"
      : state === "processing"
        ? "Understanding…"
        : "Tap & speak your request";

  return (
    <div className="pointer-events-none flex flex-col items-center gap-1.5">
      <button
        onClick={toggle}
        disabled={processing}
        aria-label={recording ? "Stop recording" : "Record a voice request"}
        className={`pointer-events-auto relative grid h-16 w-16 place-items-center rounded-full text-2xl text-white shadow-lg ring-2 ring-white/40 transition active:scale-95 disabled:opacity-80 ${
          recording
            ? "bg-need shadow-rose-900/40"
            : "bg-brand shadow-brand-dark/40 hover:bg-brand-dark"
        }`}
      >
        {recording && (
          <span className="absolute inset-0 animate-ping rounded-full bg-need/60" />
        )}
        <span className="relative">
          {processing ? (
            <span className="block h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : recording ? (
            "⏹"
          ) : (
            "🎤"
          )}
        </span>
      </button>
      <span
        className={`pointer-events-none rounded-full px-2.5 py-1 text-xs font-semibold shadow-card backdrop-blur ${
          state === "error"
            ? "bg-need text-white"
            : "bg-white/95 text-slate-700"
        }`}
      >
        {state === "error" ? error : label}
      </span>
    </div>
  );
}
