import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Download, Eye } from 'lucide-react';
import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';
import { Renderer, Formatter, Stave, StaveNote, Voice } from 'vexflow';
import { jsPDF } from 'jspdf';

interface ScoreManagerProps {
  midi: Midi | null;
  pitchShift: number; // Semitones
}

export function ScoreManager({ midi, pitchShift }: ScoreManagerProps) {
  const containerRef = useRef<HTMLCanvasElement>(null);
  const [trackIndex, setTrackIndex] = useState<number>(0);
  const [showMetronome, setShowMetronome] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);


  const getVexDuration = (ticks: number, ppq: number) => {
    const ratio = ticks / ppq;
    if (ratio >= 4) return "w";
    if (ratio >= 2) return "h";
    if (ratio >= 1) return "q";
    if (ratio >= 0.5) return "8";
    return "16";
  };

  const renderScore = () => {
    const canvas = containerRef.current;
    if (!canvas || !midi || midi.tracks.length === 0) return;
    
    const selectedTrack = midi.tracks[trackIndex] || midi.tracks[0];
    const ppq = midi.header.ppq || 480;

    // Width depends on how many notes we have to give them space
    // VexFlow wrapper configuration
    const rowHeight = showMetronome ? 240 : 130;
    const staveWidth = 800;
    const TICKS_PER_SYSTEM = ppq * 4 * 4; // 4 measures per line

    // Transpose function -> formatted for StaveNote ("c/4")
    const transposeNote = (noteName: string, semitones: number) => {
      try {
         const freq = Tone.Frequency(noteName).transpose(semitones).toNote();
         const match = freq.match(/([A-G][#b]?)(-?\d+)/);
         if (match) return `${match[1].toLowerCase()}/${match[2]}`;
         return "c/4";
      } catch (e) {
         return "c/4";
      }
    };

    const systems: { notes: StaveNote[], totalTicks: number }[] = [];
    let currentNotes: StaveNote[] = [];
    let currentTicks = 0;

    selectedTrack.notes.forEach(note => {
        const pitchStr = transposeNote(note.name, pitchShift);
        const dur = getVexDuration(note.durationTicks, ppq);
        
        try {
            currentNotes.push(new StaveNote({
                keys: [pitchStr],
                duration: dur
            }));
            currentTicks += note.durationTicks;

            if (currentTicks >= TICKS_PER_SYSTEM) {
                systems.push({ notes: currentNotes, totalTicks: currentTicks });
                currentNotes = [];
                currentTicks = 0;
            }
        } catch(e) { /* ignore malformed */ }
    });

    if (currentNotes.length > 0) {
        systems.push({ notes: currentNotes, totalTicks: currentTicks });
    }

    if (systems.length === 0) {
        systems.push({ notes: [new StaveNote({ keys: ["c/4"], duration: "w" })], totalTicks: ppq * 4 });
    }

    const canvasWidth = staveWidth + 40;
    const canvasHeight = Math.max(150, systems.length * rowHeight + 40);

    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(canvasWidth, canvasHeight);
    const context = renderer.getContext();
    
    // Fill white background for PDF output transparency fix
    context.setFillStyle("#ffffff");
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.setFillStyle("#000000");

    systems.forEach((sys, i) => {
        const y = i * rowHeight + 20;
        const stave = new Stave(20, y, staveWidth);
        
        if (i === 0) {
            stave.addClef("treble").addTimeSignature("4/4");
        }
        stave.setContext(context).draw();

        const voice = new Voice({ numBeats: sys.notes.length * 8, beatValue: 4 });
        voice.setStrict(false);
        voice.addTickables(sys.notes);
        
        new Formatter().joinVoices([voice]).format([voice], staveWidth - (i === 0 ? 60 : 20));
        voice.draw(context, stave);

        if (showMetronome) {
            const stavePerc = new Stave(20, y + 90, staveWidth);
            if (i === 0) stavePerc.addClef("percussion").addTimeSignature("4/4");
            stavePerc.setContext(context).draw();

            const percNotes: StaveNote[] = [];
            const totalQuarters = Math.max(1, Math.ceil(sys.totalTicks / ppq));
            
            for (let j = 0; j < totalQuarters; j++) {
                 percNotes.push(new StaveNote({
                     keys: [j % 4 === 0 ? "b/4" : "g/4"], 
                     duration: "q"
                 }));
            }

            const voicePerc = new Voice({ numBeats: percNotes.length, beatValue: 4 });
            voicePerc.setStrict(false);
            voicePerc.addTickables(percNotes);

            new Formatter().joinVoices([voicePerc]).format([voicePerc], staveWidth - (i === 0 ? 60 : 20));
            voicePerc.draw(context, stavePerc);
        }
    });
  };

  useEffect(() => {
    if (isPreviewOpen) {
      setTimeout(renderScore, 100);
    }
  }, [midi, pitchShift, trackIndex, showMetronome, isPreviewOpen]);

  const exportPDF = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = containerRef.current;
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const margin = 15;
      const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.setFontSize(20);
      pdf.text("BoneAux - Partitura Dinamica", margin, 20);
      pdf.setFontSize(12);
      pdf.text(`Transposicao: ${pitchShift > 0 ? '+' : ''}${pitchShift} semitons`, margin, 30);
      
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const yOffset = 40;
      
      pdf.addImage(imgData, 'JPEG', margin, yOffset, pdfWidth, imgHeight);
      
      let remainingHeight = imgHeight - (pageHeight - yOffset);
      let currentOffset = - (pageHeight - yOffset);
      
      while (remainingHeight > 0) {
         pdf.addPage();
         pdf.addImage(imgData, 'JPEG', margin, currentOffset, pdfWidth, imgHeight);
         remainingHeight -= pageHeight;
         currentOffset -= pageHeight;
      }
      
      pdf.save("boneaux_score.pdf");
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar PDF.");
    }
  };

  if (!midi) return null;

  return (
    <Card className="w-full relative overflow-hidden border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-orange-500 to-yellow-500" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
        <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter uppercase text-white">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <FileText className="w-6 h-6 text-orange-400" />
          </div>
          Score Generation
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(!isPreviewOpen)} className="gap-2 h-10 px-6 font-black uppercase tracking-widest rounded-xl border-white/10 hover:bg-white/5 transition-all text-[11px]">
           <Eye className="w-4 h-4 text-orange-400" /> {isPreviewOpen ? "Hide Control" : "Launch Preview"}
        </Button>
      </CardHeader>
      
      {isPreviewOpen && (
        <CardContent className="pt-2 space-y-6 pb-8">
          <div className="flex flex-wrap gap-6 items-end bg-white/[0.03] border border-white/5 p-6 rounded-3xl backdrop-blur-3xl">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 ml-1">Target Track</span>
              <div className="relative group">
                <select 
                  value={trackIndex} 
                  onChange={(e) => setTrackIndex(Number(e.target.value))}
                  className="flex h-12 w-full font-bold rounded-xl border border-white/5 bg-white/5 px-4 pr-10 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30 appearance-none text-white tracking-tight min-w-[200px]"
                >
                  {midi.tracks.map((t, i) => (
                    <option key={i} value={i} className="bg-[#111]">Layer {i + 1} ({t.notes.length} notes)</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                   <Settings2 className="w-4 h-4" />
                </div>
              </div>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer text-xs font-black uppercase tracking-widest h-12 px-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white/80 hover:text-white group">
              <input 
                type="checkbox" 
                checked={showMetronome} 
                onChange={(e) => setShowMetronome(e.target.checked)}
                className="w-5 h-5 rounded-md border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500"
              />
              <span className="group-hover:translate-x-1 transition-transform">Include Metronome Stave</span>
            </label>

            <div className="flex-1" />
            
            <Button onClick={exportPDF} className="h-12 px-8 gap-3 font-black uppercase tracking-widest text-xs rounded-xl orange-glow">
              <Download className="w-5 h-5" /> Export PDF System
            </Button>
          </div>

          <div className="border-4 border-black/40 rounded-[2rem] bg-white p-10 overflow-x-auto shadow-inner ring-1 ring-white/10 flex justify-center">
             {midi.tracks.length > 0 ? (
               <canvas ref={containerRef} className="bg-white rounded-lg shadow-2xl" />
             ) : (
               <div className="flex flex-col items-center gap-4 py-20 opacity-20">
                 <FileText className="w-16 h-16" />
                 <span className="text-xl font-black uppercase tracking-[0.2em] text-white">No MIDI Signature Detected</span>
               </div>
             )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

