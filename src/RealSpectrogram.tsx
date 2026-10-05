import React, { useEffect, useRef } from 'react';

interface Props {
  audioUrl: string | null;
  isActive: boolean;
}

const RealSpectrogram: React.FC<Props> = ({ audioUrl, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !audioUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create audio element
    const audio = new Audio(audioUrl);
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.volume = 0; // silent — only for analysis
    audioElRef.current = audio;

    // Set up Web Audio API
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128; // 64 frequency bins
    analyser.smoothingTimeConstant = 0.8;

    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    audio.play().catch(() => {});

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const BAR_COUNT = 26;
    const BAR_GAP = 2;
    const BAR_WIDTH = Math.floor((canvas.width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT);
    const MAX_HEIGHT = canvas.height;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pick evenly-spaced frequency bins across the spectrum
      for (let i = 0; i < BAR_COUNT; i++) {
        const binIndex = Math.floor((i / BAR_COUNT) * bufferLength);
        const value = dataArray[binIndex]; // 0–255
        const barH = Math.max(4, (value / 255) * MAX_HEIGHT);

        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = MAX_HEIGHT - barH;

        // Violet gradient: darker at bottom, lighter at top
        const gradient = ctx.createLinearGradient(x, MAX_HEIGHT, x, y);
        gradient.addColorStop(0, '#6d28d9');  // violet-700
        gradient.addColorStop(1, '#a78bfa');  // violet-400

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barH, 3);
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.pause();
      try { audioCtx.close(); } catch {}
    };
  }, [isActive, audioUrl]);

  // Fallback animated bars when no audio is available
  if (!audioUrl) {
    return (
      <div className="h-12 flex items-end justify-between gap-0.5 px-2">
        {Array.from({ length: 26 }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-gradient-to-t from-violet-600 to-violet-400 rounded-full"
            style={{
              height: `${Math.random() * 32 + 8}px`,
              animation: `pulse ${0.6 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
            }}
          />
        ))}
        <style>{`
          @keyframes pulse { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
        `}</style>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={48}
      className="w-full rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default RealSpectrogram;
