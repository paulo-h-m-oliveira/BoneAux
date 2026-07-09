import { useState, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import { DemucsProcessor, CONSTANTS } from 'demucs-web';

// Configure ONNX Web to use CDN for wasm binaries to avoid bundler issues in Vite
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

export interface DemucsState {
  isProcessing: boolean;
  phase: string;
  progress: number;
  downloadProgress: number;
}

export function useDemucs() {
  const [state, setState] = useState<DemucsState>({
    isProcessing: false,
    phase: '',
    progress: 0,
    downloadProgress: 0
  });

  const separate = useCallback(async (audioBuffer: AudioBuffer) => {
    setState({
      isProcessing: true,
      phase: 'Iniciando',
      progress: 0,
      downloadProgress: 0
    });

    try {
      // 1. Setup Processor
      const processor = new DemucsProcessor({
        ort,
        sessionOptions: {
          enableCpuMemArena: false,
          enableMemPattern: false,
        },
        onProgress: ({ progress, currentSegment, totalSegments }: { progress: number, currentSegment: number, totalSegments: number }) => {
          setState(prev => ({
            ...prev,
            progress: progress * 100,
            phase: `Processando segmento ${currentSegment}/${totalSegments}`
          }));
        },
        onLog: (phase: string, msg: string) => {
          console.log(`[Demucs][${phase}] ${msg}`);
          if (phase === 'Init') setState(prev => ({ ...prev, phase: 'Carregando Modelo...' }));
          if (phase === 'Inference') setState(prev => ({ ...prev, phase: 'Extraindo Instrumentos...' }));
        },
        onDownloadProgress: (loaded: number, total: number) => {
          setState(prev => ({
            ...prev,
            downloadProgress: (loaded / total) * 100,
            phase: 'Baixando modelo Neural (Pode demorar)...'
          }));
        }
      });

      // 2. Load Model
      await processor.loadModel(CONSTANTS.DEFAULT_MODEL_URL);

      // 3. Prepare Audio Data
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.numberOfChannels > 1 
        ? audioBuffer.getChannelData(1) 
        : leftChannel;

      // 4. Separate
      const result = await processor.separate(leftChannel, rightChannel);

      setState(prev => ({ ...prev, isProcessing: false, progress: 100, phase: 'Concluído' }));
      return result;
    } catch (err) {
      console.error("Demucs Separation Error:", err);
      setState(prev => ({ ...prev, isProcessing: false, phase: 'Erro' }));
      throw err;
    }
  }, []);

  return { state, separate };
}
