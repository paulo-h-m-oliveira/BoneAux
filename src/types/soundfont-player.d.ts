declare module 'soundfont-player' {
  export interface InstrumentOptions {
    destination?: any;
    format?: 'mp3' | 'ogg';
    soundfont?: 'MusyngKite' | 'FluidR3_GM';
    nameToUrl?: (name: string, soundfont: string, format: string) => string;
    gain?: number;
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
  }

  export interface Player {
    play(name: string | number, time?: number, options?: { duration?: number; gain?: number; attack?: number; decay?: number; sustain?: number; release?: number }): Player;
    stop(time?: number, nodes?: any[]): void;
    schedule(time: number, events: any[]): void;
    on(event: string, callback: (event: any) => void): this;
    connect(destination: any): this;
  }

  export function instrument(ac: any, name: string, options?: InstrumentOptions): Promise<Player>;
}
