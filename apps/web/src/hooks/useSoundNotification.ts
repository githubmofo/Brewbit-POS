import { useState, useCallback, useRef } from "react";

export function useSoundNotification() {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (typeof window === "undefined") return;
    if (!audioCtxRef.current) {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
  };

  const playTone = useCallback(
    (frequency: number, type: OscillatorType, duration: number, delay = 0) => {
      if (isMuted) return;
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(
          0.5,
          ctx.currentTime + delay + 0.05,
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + delay + duration,
        );

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + duration);
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    },
    [isMuted],
  );

  const playNewOrder = useCallback(() => {
    // A pleasant two-tone chime for new orders
    playTone(523.25, "sine", 0.3, 0); // C5
    playTone(659.25, "sine", 0.5, 0.15); // E5
  }, [playTone]);

  const playOrderReady = useCallback(() => {
    // A crisp, higher two-tone chime for order ready
    playTone(783.99, "sine", 0.2, 0); // G5
    playTone(1046.5, "sine", 0.4, 0.1); // C6
  }, [playTone]);

  return {
    isMuted,
    setIsMuted,
    toggleMute: () => setIsMuted((prev) => !prev),
    playNewOrder,
    playOrderReady,
  };
}
