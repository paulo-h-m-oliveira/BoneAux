import { useState, useEffect, useRef } from 'react';
import Soundfont, { type Player } from 'soundfont-player';
import * as Tone from 'tone';

export function useSoundfont(instrumentName: string) {
  const [instrument, setInstrument] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const gainNodeRef = useRef<Tone.Gain | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInstrument = async () => {
      // Clean up previous
      if (gainNodeRef.current) {
        gainNodeRef.current.dispose();
      }

      setIsLoading(true);
      setError(null);

      try {
        await Tone.start(); // Ensure context is running
        
        // Create a dedicated volume control for the soundfont
        const gainNode = new Tone.Gain(1).toDestination();
        gainNodeRef.current = gainNode;

        const ac = Tone.getContext().rawContext;
        
        // Load the instrument
        const player = await Soundfont.instrument(ac as any, instrumentName, {
          format: 'mp3',
          soundfont: 'MusyngKite',
          destination: gainNode.input as any
        });

        if (isMounted) {
          setInstrument(player);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load instrument'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (instrumentName) {
      loadInstrument();
    }

    return () => {
      isMounted = false;
      if (gainNodeRef.current) {
        gainNodeRef.current.dispose();
      }
    };
  }, [instrumentName]);

  const setVolume = (volume: number) => {
    // volume is 0.0 to 1.0 (gain)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  };

  return { instrument, isLoading, error, setVolume, gainNode: gainNodeRef.current };
}
