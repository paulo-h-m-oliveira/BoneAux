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
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Exportação de Partituras
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(!isPreviewOpen)} className="gap-2">
           <Eye className="w-4 h-4" /> {isPreviewOpen ? "Ocultar Preview" : "Print Preview"}
        </Button>
      </CardHeader>
      
      {isPreviewOpen && (
        <CardContent className="space-y-4 pt-4 border-t border-border mt-2">
          <div className="flex flex-wrap gap-4 items-end bg-secondary/30 p-4 rounded-lg">
            <div className="space-y-1">
              <span className="text-sm font-medium">Trilha Visualizada</span>
              <select 
                value={trackIndex} 
                onChange={(e) => setTrackIndex(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
              >
                {midi.tracks.map((t, i) => (
                  <option key={i} value={i}>Track {i + 1} ({t.notes.length} notas)</option>
                ))}
              </select>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium h-9 px-2">
              <input 
                type="checkbox" 
                checked={showMetronome} 
                onChange={(e) => setShowMetronome(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Incluir Grade do Metrônomo (Percussão)
            </label>

            <div className="flex-1" />
            
            <Button onClick={exportPDF} className="gap-2 font-bold shadow-lg">
              <Download className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>

          <div className="border border-border rounded-xl bg-white p-4 overflow-y-auto max-h-[600px] shadow-inner flex justify-center">
             {midi.tracks.length > 0 ? (
               <canvas ref={containerRef} className="bg-white w-full max-w-[850px]" />
             ) : (
               <span className="text-muted-foreground font-medium flex justify-center w-full mt-10">
                 Arquivo MIDI sem notas.
               </span>
             )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
