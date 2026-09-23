"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlaybackState = "paused" | "playing" | "unavailable";

const MUSIC_SOURCE = "/wedding-music.mp3";

export function WeddingMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const stoppedByVisitor = useRef(false);
  const [playback, setPlayback] = useState<PlaybackState>("paused");

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || stoppedByVisitor.current || !audio.paused) return false;

    try {
      await audio.play();
      setPlayback("playing");
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let listeningForFirstInteraction = true;

    function stopListening() {
      if (!listeningForFirstInteraction) return;
      listeningForFirstInteraction = false;
      document.removeEventListener("pointerdown", startAfterInteraction);
      document.removeEventListener("click", startAfterInteraction);
      document.removeEventListener("keydown", startAfterInteraction);
    }

    function startAfterInteraction(event: Event) {
      if (event.target instanceof Element && event.target.closest(".music-control")) return;
      if (stoppedByVisitor.current) {
        stopListening();
        return;
      }
      void play().then((started) => {
        if (started) stopListening();
      });
    }

    function markPlaying() {
      setPlayback("playing");
      stopListening();
    }

    function markPaused() {
      setPlayback((current) => current === "unavailable" ? current : "paused");
    }

    function markUnavailable() {
      setPlayback("unavailable");
      stopListening();
    }

    audio.addEventListener("play", markPlaying);
    audio.addEventListener("pause", markPaused);
    audio.addEventListener("error", markUnavailable);
    document.addEventListener("pointerdown", startAfterInteraction, { passive: true });
    document.addEventListener("click", startAfterInteraction, { passive: true });
    document.addEventListener("keydown", startAfterInteraction);

    void play();

    return () => {
      stopListening();
      audio.removeEventListener("play", markPlaying);
      audio.removeEventListener("pause", markPaused);
      audio.removeEventListener("error", markUnavailable);
    };
  }, [play]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || playback === "unavailable") return;

    if (!audio.paused) {
      stoppedByVisitor.current = true;
      audio.pause();
      return;
    }

    stoppedByVisitor.current = false;
    await play();
  }

  const isPlaying = playback === "playing";
  const label = playback === "unavailable"
    ? "Müzik şu anda kullanılamıyor"
    : isPlaying ? "Müziği durdur" : "Müziği başlat";

  return (
    <div className="wedding-music">
      {/* Arka plan müziği konuşma içermediği için altyazı izi uygulanmaz. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={MUSIC_SOURCE} preload="none" loop />
      <button
        className={`music-control ${isPlaying ? "playing" : ""}`}
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          void toggle();
        }}
        aria-label={label}
        aria-pressed={isPlaying}
        disabled={playback === "unavailable"}
      >
        <span className="music-symbol" aria-hidden="true">{isPlaying ? "Ⅱ" : "♪"}</span>
        <span className="music-label" aria-hidden="true">{isPlaying ? "Müzik çalıyor" : "Müzik"}</span>
      </button>
    </div>
  );
}
