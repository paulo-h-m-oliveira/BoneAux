import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Mic, Square, Download, Circle } from 'lucide-react';
import * as Tone from 'tone';

export function RecorderModule() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<{url: string, name: string}[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      // 1. Get user mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // 2. Mix mic input with Tone.js destination if needed, 
      // but for pure practice auto-analysis we usually just record the mic.
      // We will record the raw mic stream to let the trombonist analyze their playing.
      // (For backing track + mic, we'd use a WebAudio Destination Node).
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Add to list
        const name = `Take ${new Date().toLocaleTimeString()}`;
        setRecordings(prev => [...prev, { url: audioUrl, name }]);
        
        // close tracks to free mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error("Camera/Mic permission denied or error:", err);
      alert("Permissão para microfone é necessária para a Autoanálise.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <Card className="w-full relative overflow-hidden border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-orange-500 to-yellow-500" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
        <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter uppercase">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Mic className="w-6 h-6 text-orange-500" />
          </div>
          Session Recorder
        </CardTitle>
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full animate-pulse border border-red-500/20">
             <Circle className="w-2 h-2 fill-red-500 text-red-500" />
             <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Recording</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2 space-y-6 pb-8">
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/5 rounded-3xl bg-white/2 group hover:bg-white/4 transition-all">
          {!isRecording ? (
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-orange-500/20 rounded-full group-hover:scale-110 transition-transform duration-500">
                <Mic className="w-12 h-12 text-orange-500" />
              </div>
              <div className="text-center">
                <h4 className="text-xl font-black text-white tracking-widest uppercase">Start Practice Take</h4>
                <p className="text-xs text-white/50 mt-1 uppercase tracking-tight font-bold">Capture your audio for auto-analysis</p>
              </div>
              <Button size="lg" onClick={startRecording} className="h-14 px-12 text-sm font-black rounded-2xl orange-glow uppercase tracking-widest active:scale-95 transition-all">
                Record Practice
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-red-500/20 rounded-full animate-pulse">
                <Square className="w-12 h-12 text-red-500 fill-current" />
              </div>
              <div className="text-center">
                <h4 className="text-xl font-black text-white tracking-widest uppercase animate-pulse">On Air</h4>
                <p className="text-xs text-white/60 mt-1 uppercase tracking-tight font-black">Capturing high-fidelity audio</p>
              </div>
              <Button size="lg" variant="destructive" onClick={stopRecording} className="h-14 px-12 text-sm font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all border-none bg-red-600 hover:bg-red-700">
                End Session
              </Button>
            </div>
          )}
        </div>

        {recordings.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-white/5">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 ml-1">Practice Archives</span>
            <div className="grid grid-cols-1 gap-3">
              {recordings.map((rec, i) => (
                <div key={i} className="flex items-center justify-between bg-white/3 border border-white/5 p-4 rounded-2xl group hover:bg-white/5 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white uppercase tracking-tighter">{rec.name}</span>
                    <span className="text-[10px] text-white/40 uppercase font-bold">Session Capture</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <audio controls src={rec.url} className="h-10 w-48 opacity-80 hover:opacity-100 transition-opacity" />
                    <Button size="icon" variant="ghost" className="rounded-full hover:bg-orange-500/10 hover:text-orange-500" asChild>
                      <a href={rec.url} download={`${rec.name.replace(/:/g, '-')}.webm`}>
                        <Download className="w-5 h-5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

