declare module 'soundfont-player' {
  export interface InstrumentOptions {
    destination?: unknown;
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
    stop(time?: number, nodes?: unknown[]): void;
    schedule(time: number, events: unknown[]): void;
    on(event: string, callback: (event: unknown) => void): this;
    connect(destination: unknown): this;
  }

  export function instrument(ac: unknown, name: string, options?: InstrumentOptions): Promise<Player>;
}
