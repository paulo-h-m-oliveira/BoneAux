import { useEffect, useState, useCallback } from 'react';
import { audioEngine } from '../lib/AudioEngine';

export function useAudioEngine() {
  const [isPlaying, setIsPlaying] = useState(audioEngine.getPlaybackState());
  const [bpm, setBpm] = useState(audioEngine.getBpm());
  const [subdivisions, setSubdivisions] = useState(audioEngine.getSubdivisions());
  const [isMetronomeMuted, setIsMetronomeMuted] = useState(audioEngine.getMetronomeMuted());
  const [speedMultiplier, setSpeedMultiplier] = useState(audioEngine.getSpeedMultiplier());
  const [isMidiSynced, setIsMidiSynced] = useState(audioEngine.getIsMidiSynced());

  useEffect(() => {
    return audioEngine.subscribe(() => {
      setIsPlaying(audioEngine.getPlaybackState());
      setBpm(audioEngine.getBpm());
      setSubdivisions(audioEngine.getSubdivisions());
      setIsMetronomeMuted(audioEngine.getMetronomeMuted());
      setSpeedMultiplier(audioEngine.getSpeedMultiplier());
      setIsMidiSynced(audioEngine.getIsMidiSynced());
    });
  }, []);

  const init = useCallback(() => audioEngine.init(), []);
  const togglePlayback = useCallback(() => audioEngine.togglePlayback(), []);
  const changeBpm = useCallback((val: number) => audioEngine.setBpm(val), []);
  const changeSubdivisions = useCallback((val: number) => audioEngine.setSubdivisions(val), []);
  const toggleMetronome = useCallback(() => audioEngine.toggleMetronomeMute(), []);
  const changeSpeedMultiplier = useCallback((val: number) => audioEngine.setSpeedMultiplier(val), []);

  return {
    init,
    isPlaying,
    togglePlayback,
    bpm,
    changeBpm,
    subdivisions,
    changeSubdivisions,
    isMetronomeMuted,
    toggleMetronome,
    speedMultiplier,
    changeSpeedMultiplier,
    isMidiSynced
  };
}
