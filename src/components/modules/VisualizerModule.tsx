import { useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Activity } from 'lucide-react';
import { audioEngine } from '../../lib/AudioEngine';

export function VisualizerModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let reqId: number;
    const draw = () => {
      reqId = requestAnimationFrame(draw);
      
      const width = canvas.width;
      const height = canvas.height;
      const waveformData = audioEngine.waveformViewer.getValue();

      ctx.clearRect(0, 0, width, height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 140, 0, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      for(let i = 0; i < width; i += 50) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
      }
      ctx.stroke();

      // Draw wave
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#ff4d00');
      gradient.addColorStop(0.5, '#ff8c00');
      gradient.addColorStop(1, '#ffc400');
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 140, 0, 0.5)';
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < waveformData.length; i++) {
        const x = (i / waveformData.length) * width;
        const y = ((waveformData[i] as number) * 0.4 + 0.5) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();

    return () => cancelAnimationFrame(reqId);
  }, []);

  return (
    <Card className="w-full relative overflow-hidden border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-orange-500 to-yellow-500" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
        <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter uppercase">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-orange-500" />
          </div>
          Telemetry Waveform
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-orange-500/50 uppercase tracking-[0.2em]">Live Stream</span>
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="pt-2 flex justify-center pb-8">
        <div className="relative w-full group">
          <div className="absolute inset-0 bg-orange-500/5 blur-xl group-hover:bg-orange-500/10 transition-colors pointer-events-none" />
          <canvas 
            ref={canvasRef} 
            width={1200} 
            height={200} 
            className="w-full h-[200px] bg-black/40 rounded-2xl border border-white/5 relative z-10 glass"
          />
          <div className="absolute bottom-4 left-6 flex items-center gap-4 z-20">
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Gain: +12dB</span>
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Lat: 0.1ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


