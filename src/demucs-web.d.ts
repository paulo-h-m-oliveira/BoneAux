declare module 'demucs-web' {
  import * as ort from 'onnxruntime-web';
  
  export interface ProgressInfo {
    progress: number;
    currentSegment: number;
    totalSegments: number;
  }

  export interface DemucsProcessorOptions {
    ort: typeof ort;
    modelPath?: string;
    sessionOptions?: ort.InferenceSession.SessionOptions;
    onProgress?: (info: ProgressInfo) => void;
    onLog?: (phase: string, message: string) => void;
    onDownloadProgress?: (loaded: number, total: number) => void;
  }

  export interface SeparationResult {
    drums: { left: Float32Array; right: Float32Array };
    bass: { left: Float32Array; right: Float32Array };
    other: { left: Float32Array; right: Float32Array };
    vocals: { left: Float32Array; right: Float32Array };
  }

  export class DemucsProcessor {
    constructor(options: DemucsProcessorOptions);
    loadModel(pathOrBuffer?: string | ArrayBuffer): Promise<void>;
    separate(left: Float32Array, right: Float32Array): Promise<SeparationResult>;
  }

  export const CONSTANTS: {
    DEFAULT_MODEL_URL: string;
    SAMPLE_RATE: number;
    FFT_SIZE: number;
    HOP_SIZE: number;
    TRAINING_SAMPLES: number;
    TRACKS: string[];
  };
}
