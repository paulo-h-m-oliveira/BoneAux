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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Mic className="w-5 h-5 text-destructive" />
          Gravador de Autoanálise
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex justify-center p-6 border border-dashed border-border rounded-xl bg-secondary/10">
          {!isRecording ? (
            <Button size="lg" variant="destructive" onClick={startRecording} className="w-48 gap-2 rounded-full font-bold">
              <Circle className="w-5 h-5 fill-current" /> GRAVAR PRÁTICA
            </Button>
          ) : (
            <Button size="lg" variant="outline" onClick={stopRecording} className="w-48 gap-2 rounded-full font-bold border-destructive text-destructive hover:bg-destructive hover:text-white animate-pulse">
              <Square className="w-5 h-5 fill-current" /> PARAR (GRAVANDO...)
            </Button>
          )}
        </div>

        {recordings.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Takes Salvos:</h4>
            {recordings.map((rec, i) => (
              <div key={i} className="flex items-center justify-between bg-secondary p-3 rounded-lg">
                <span className="text-sm font-medium">{rec.name}</span>
                <div className="flex items-center gap-2">
                  <audio controls src={rec.url} className="h-8 w-48" />
                  <Button size="icon" variant="ghost" asChild>
                    <a href={rec.url} download={`${rec.name.replace(/:/g, '-')}.webm`}>
                      <Download className="w-4 h-4 text-primary" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
