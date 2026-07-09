import { useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';

export interface AudioStemState {
  [name: string]: {
    player: Tone.Player;
    gainNode: Tone.Gain;
    volume: number;
    isMuted: boolean;
  };
}

export function useAudioStems() {
  const [stems, setStems] = useState<AudioStemState>({});
  const stemsRef = useRef<AudioStemState>({});

  const addStem = useCallback((name: string, buffer: Tone.ToneAudioBuffer) => {
    const gainNode = new Tone.Gain(1).toDestination();
    // Use Tone.Player without sync, we will manage it manually
    const player = new Tone.Player(buffer).connect(gainNode);
    
    stemsRef.current[name] = {
      player,
      gainNode,
      volume: 1,
      isMuted: false
    };
    setStems({ ...stemsRef.current });
  }, []);

  const setStemVolume = useCallback((name: string, volume: number) => {
    if (stemsRef.current[name]) {
      stemsRef.current[name].volume = volume;
      if (!stemsRef.current[name].isMuted) {
        stemsRef.current[name].gainNode.gain.value = volume;
      }
      setStems({ ...stemsRef.current });
    }
  }, []);

  const toggleStemMute = useCallback((name: string) => {
    if (stemsRef.current[name]) {
      const newMuted = !stemsRef.current[name].isMuted;
      stemsRef.current[name].isMuted = newMuted;
      stemsRef.current[name].gainNode.gain.value = newMuted ? 0 : stemsRef.current[name].volume;
      setStems({ ...stemsRef.current });
    }
  }, []);

  const disposeAllStems = useCallback(() => {
    Object.values(stemsRef.current).forEach(stem => {
      try { stem.player.stop(); } catch(e){}
      stem.player.dispose();
      stem.gainNode.dispose();
    });
    stemsRef.current = {};
    setStems({});
  }, []);

  // For pausing/seeking
  const startAllStems = useCallback((offset: number) => {
    Object.values(stemsRef.current).forEach(stem => {
      if (stem.player.buffer && stem.player.buffer.loaded) {
          try { stem.player.start(0, offset); } catch(e){}
      }
    });
  }, []);

  const stopAllStems = useCallback(() => {
    Object.values(stemsRef.current).forEach(stem => {
      if (stem.player.state === "started") {
          try { stem.player.stop(); } catch(e){}
      }
    });
  }, []);
  
  const setStemsPlaybackRate = useCallback((rate: number) => {
    Object.values(stemsRef.current).forEach(stem => {
      stem.player.playbackRate = rate;
    });
  }, []);

  return {
    stems,
    addStem,
    setStemVolume,
    toggleStemMute,
    disposeAllStems,
    startAllStems,
    stopAllStems,
    setStemsPlaybackRate
  };
}
