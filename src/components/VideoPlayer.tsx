import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Video as VideoIcon } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  onExpand?: () => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  onExpand,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 24; // Simulated duration for visualizer mode

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isDemoOrVisualizer = src.startsWith('visualizer:') || hasError || !src.startsWith('data:video');

  // Canvas visualizer animation loop
  useEffect(() => {
    if (!isDemoOrVisualizer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const render = () => {
      step += isPlaying ? 0.05 : 0.01;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 640);
      const height = (canvas.height = 360);

      // Deep dark cyber gradient background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0a0a0f');
      grad.addColorStop(0.5, '#121024');
      grad.addColorStop(1, '#08080c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Perspective retro synth grid
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.18)';
      ctx.lineWidth = 1;
      const horizon = height * 0.58;
      
      // Vertical converging lines
      for (let x = -width; x < width * 2; x += 40) {
        ctx.beginPath();
        ctx.moveTo(width / 2, horizon);
        ctx.lineTo(x + Math.sin(step * 0.5) * 20, height);
        ctx.stroke();
      }

      // Horizontal moving grid lines
      const gridOffset = (step * 25) % 25;
      for (let y = horizon; y < height; y += 14 + (y - horizon) * 0.15) {
        ctx.beginPath();
        ctx.moveTo(0, y + gridOffset * ((y - horizon) / (height - horizon)));
        ctx.lineTo(width, y + gridOffset * ((y - horizon) / (height - horizon)));
        ctx.stroke();
      }

      // Neon glowing sound wave
      const bars = 48;
      const barWidth = width / bars;
      for (let i = 0; i < bars; i++) {
        const freq = Math.sin(i * 0.25 + step * 2) * Math.cos(i * 0.15 - step);
        const barHeight = isPlaying ? Math.abs(freq) * 70 + 15 : Math.abs(freq) * 25 + 5;

        // Gradient for each bar
        const barGrad = ctx.createLinearGradient(0, horizon - barHeight, 0, horizon + barHeight);
        barGrad.addColorStop(0, '#818cf8');
        barGrad.addColorStop(0.5, '#c084fc');
        barGrad.addColorStop(1, '#4f46e5');

        ctx.fillStyle = barGrad;
        ctx.fillRect(i * barWidth + 2, horizon - barHeight, barWidth - 4, barHeight * 2);
      }

      // Floating central ambient orb
      ctx.beginPath();
      const orbRadius = 38 + Math.sin(step) * 5;
      const orbGrad = ctx.createRadialGradient(
        width / 2,
        horizon - 30,
        5,
        width / 2,
        horizon - 30,
        orbRadius
      );
      orbGrad.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
      orbGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.4)');
      orbGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = orbGrad;
      ctx.arc(width / 2, horizon - 30, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Title & Track info
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(title || 'Modular Synthesis & Waveform Stream', 20, 32);

      ctx.fillStyle = '#818cf8';
      ctx.font = '500 11px monospace';
      ctx.fillText(isPlaying ? '● LIVE AUDIO-VISUAL STREAM' : '❚❚ PAUSED', 20, 50);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isDemoOrVisualizer, title]);

  // Simulated timer update when playing in visualizer mode
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => (prev + 1 >= duration ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (isDemoOrVisualizer) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setHasError(true);
          setIsPlaying(true);
        });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 group ${className}`}>
      {isDemoOrVisualizer ? (
        <canvas
          ref={canvasRef}
          onClick={togglePlay}
          className="w-full h-auto max-h-[460px] aspect-video object-contain cursor-pointer block"
        />
      ) : (
        <video
          ref={videoRef}
          src={src}
          loop
          playsInline
          muted={isMuted}
          onClick={togglePlay}
          onError={(e) => {
            // Prevent browser console uncaught error and fallback seamlessly
            e.preventDefault();
            setHasError(true);
          }}
          className="w-full h-auto max-h-[460px] aspect-video object-contain cursor-pointer block"
        />
      )}

      {/* Center Play Button Overlay */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
        >
          <button
            type="button"
            className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
            aria-label="Play video"
          >
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </button>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <span className="font-mono text-[11px] text-neutral-300">
            0:{currentTime.toString().padStart(2, '0')} / 0:{duration.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {onExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Expand video"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
