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
      ctx.strokeStyle = 'hsl(var(--border))';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw wave
      ctx.beginPath();
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;

      for (let i = 0; i < waveformData.length; i++) {
        // waveform array bounds are -1 to 1
        const x = (i / waveformData.length) * width;
        const y = ((waveformData[i] as number) * 0.5 + 0.5) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    draw();

    return () => cancelAnimationFrame(reqId);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Frequência / Forma de Onda
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex justify-center">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={150} 
          className="w-full h-[150px] bg-secondary/20 rounded-lg border border-border"
        />
      </CardContent>
    </Card>
  );
}
