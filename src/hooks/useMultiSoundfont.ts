import { useState, useRef, useCallback } from 'react';
import Soundfont, { type Player } from 'soundfont-player';
import * as Tone from 'tone';

export interface MultiInstrumentState {
  [name: string]: {
    player: Player | null;
    isLoading: boolean;
    gainNode: Tone.Gain;
    volume: number;
    isMuted: boolean;
  };
}

export function useMultiSoundfont() {
  const [instruments, setInstruments] = useState<MultiInstrumentState>({});
  const instrumentsRef = useRef<MultiInstrumentState>({});

  const loadInstrument = useCallback(async (name: string) => {
    if (instrumentsRef.current[name]) return;

    // Set loading state
    instrumentsRef.current[name] = {
      player: null,
      isLoading: true,
      gainNode: new Tone.Gain(1).toDestination(),
      volume: 1,
      isMuted: false
    };
    setInstruments({ ...instrumentsRef.current });

    try {
      const ac = Tone.getContext().rawContext;
      const player = await Soundfont.instrument(ac as any, name as any, {
        format: 'mp3',
        soundfont: 'MusyngKite',
        destination: instrumentsRef.current[name].gainNode.input as any
      });

      instrumentsRef.current[name].player = player;
      instrumentsRef.current[name].isLoading = false;
      setInstruments({ ...instrumentsRef.current });
    } catch (err) {
      console.error(`Failed to load instrument ${name}:`, err);
      delete instrumentsRef.current[name];
      setInstruments({ ...instrumentsRef.current });
    }
  }, []);

  const setInstrumentVolume = useCallback((name: string, volume: number) => {
    if (instrumentsRef.current[name]) {
      instrumentsRef.current[name].volume = volume;
      if (!instrumentsRef.current[name].isMuted) {
        instrumentsRef.current[name].gainNode.gain.value = volume;
      }
      setInstruments({ ...instrumentsRef.current });
    }
  }, []);

  const toggleMute = useCallback((name: string) => {
    if (instrumentsRef.current[name]) {
      const newMuted = !instrumentsRef.current[name].isMuted;
      instrumentsRef.current[name].isMuted = newMuted;
      instrumentsRef.current[name].gainNode.gain.value = newMuted ? 0 : instrumentsRef.current[name].volume;
      setInstruments({ ...instrumentsRef.current });
    }
  }, []);

  const disposeAll = useCallback(() => {
    Object.values(instrumentsRef.current).forEach(inst => {
      inst.gainNode.dispose();
    });
    instrumentsRef.current = {};
    setInstruments({});
  }, []);

  return {
    instruments,
    loadInstrument,
    setInstrumentVolume,
    toggleMute,
    disposeAll
  };
}
