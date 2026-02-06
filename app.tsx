
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SOUND_PADS, APP_THEME } from './constants';
import { SoundPad } from './types';

// Components
import Pad from './components/Pad';
import Header from './components/Header';
import VibeCheck from './components/VibeCheck';

const App: React.FC = () => {
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    const initAudio = async () => {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive'
      });
      
      const loadPromises = SOUND_PADS.map(async (pad) => {
        try {
          const response = await fetch(pad.soundUri);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          audioBuffersRef.current.set(pad.id, audioBuffer);
        } catch (error) {
          console.error(`Failed to load sound for ${pad.name}:`, error);
        }
      });

      await Promise.all(loadPromises);
      setIsLoaded(true);
    };

    initAudio();
  }, []);

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
  }, []);

  const playSound = useCallback(async (pad: SoundPad) => {
    if (!audioContextRef.current || !audioBuffersRef.current.has(pad.id)) return;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    triggerHaptic();

    setNowPlaying(pad.name);
    setHistory(prev => [pad.name, ...prev].slice(0, 10));

    const buffer = audioBuffersRef.current.get(pad.id)!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.setValueAtTime(1, audioContextRef.current.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    source.start(0);

    // Faster reset for a snappy feel
    setTimeout(() => {
      setNowPlaying(current => current === pad.name ? null : current);
    }, 150);
  }, [triggerHaptic]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      const pad = SOUND_PADS.find(p => p.keyHint === key);
      if (pad) {
        playSound(pad);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playSound]);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0c]">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-500/20 rounded-full" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="mt-8 text-purple-400 font-black tracking-[0.4em] animate-pulse text-lg">STAGING AREA...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-6 select-none bg-[#0a0a0c]">
      <Header nowPlaying={nowPlaying} />

      <main className="flex-grow flex flex-col justify-center items-center max-w-4xl mx-auto w-full">
        {/* Stage Area */}
        <div className="relative w-full p-8 md:p-12 bg-zinc-900/50 rounded-[3rem] border border-white/5 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 w-full">
            {SOUND_PADS.map((pad) => (
              <Pad 
                key={pad.id} 
                pad={pad} 
                onPress={() => playSound(pad)}
                isActive={nowPlaying === pad.name}
              />
            ))}
          </div>
          
          {/* Stage floor glow */}
          <div className="absolute -bottom-10 left-1/4 right-1/4 h-20 bg-purple-600/20 blur-[60px] rounded-full pointer-events-none" />
        </div>
      </main>

      <footer className="mt-12 mb-4 flex flex-col items-center gap-6">
        <VibeCheck history={history} />
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-stone-600 text-[10px] font-bold tracking-[0.5em] uppercase">
            Home Row Keys Active (A S D J K L)
          </div>
          <div className="text-purple-500/60 text-xs font-semibold tracking-widest uppercase">
            ZingBox • with love from GDS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
