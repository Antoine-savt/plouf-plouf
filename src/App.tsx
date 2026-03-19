import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, RefreshCw, Trash2, Play, ArrowLeft, LayoutGrid, Coins, CircleDashed, Volume2, VolumeX, Users, Music, Vote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import ect1Data from './data/ect1.json';
import ect2Data from './data/ect2.json';

const allData = { ...ect1Data, ...ect2Data };
import VoteMode from './components/VoteMode';

const socket = io();

// --- AUDIO HELPERS ---
let audioCtx: AudioContext | null = null;
let masterVolume = 1.0;

export const setAudioVolume = (v: number) => {
  masterVolume = v;
};

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTick = () => {
  if (!audioCtx || masterVolume === 0) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.05 * masterVolume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const playCoin = () => {
  if (!audioCtx || masterVolume === 0) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
  osc.frequency.setValueAtTime(1800, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1 * masterVolume, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
};

const playSilverCoins = () => {
  if (!audioCtx || masterVolume === 0) return;
  for(let i=0; i<6; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000 + i*300, audioCtx.currentTime + i*0.15);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + i*0.15);
    gain.gain.linearRampToValueAtTime(0.15 * masterVolume, audioCtx.currentTime + i*0.15 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i*0.15 + 0.4);
    osc.start(audioCtx.currentTime + i*0.15);
    osc.stop(audioCtx.currentTime + i*0.15 + 0.4);
  }
};

const playJackpot = () => {
  if (!audioCtx || masterVolume === 0) return;
  const notes = [400, 500, 600, 800, 1000, 1200];
  notes.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, audioCtx!.currentTime + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.1 * masterVolume, audioCtx!.currentTime + i * 0.1 + 0.05);
    gain.gain.linearRampToValueAtTime(0, audioCtx!.currentTime + i * 0.1 + 0.3);
    osc.start(audioCtx!.currentTime + i * 0.1);
    osc.stop(audioCtx!.currentTime + i * 0.1 + 0.3);
  });
};

// --- ANIMATION COMPONENTS ---

const ClassicDraw = ({ names, winnerIndex, onComplete }: { names: string[], winnerIndex: number, onComplete: () => void }) => {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  
  useEffect(() => {
    let counter = 0;
    const minTicks = 30;
    const maxTicks = 50;
    const totalTicks = Math.floor(Math.random() * (maxTicks - minTicks + 1)) + minTicks;
    let currentDelay = 80;
    let timeout: number;

    const tick = () => {
      setHighlighted((prev) => {
        let next;
        if (names.length > 1) {
          do { next = Math.floor(Math.random() * names.length); } while (next === prev);
        } else { next = 0; }
        return next;
      });
      playTick();
      counter++;

      if (counter < totalTicks) {
        if (counter > totalTicks - 15) currentDelay += 35;
        timeout = window.setTimeout(tick, currentDelay);
      } else {
        setHighlighted(winnerIndex);
        playCoin();
        setTimeout(onComplete, 600);
      }
    };
    timeout = window.setTimeout(tick, currentDelay);
    return () => clearTimeout(timeout);
  }, [names, winnerIndex, onComplete]);

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-12 min-h-[200px] content-center">
      {names.map((name, index) => {
        const isHighlighted = index === highlighted;
        return (
          <motion.div
            key={`${name}-${index}`}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: highlighted !== null && !isHighlighted ? 0.3 : 1, 
              scale: isHighlighted ? 1.15 : 1 
            }}
            className={`px-5 py-3 rounded-2xl text-xl font-bold transition-colors duration-200 ${
              isHighlighted 
                ? 'bg-indigo-600 text-white shadow-xl ring-4 ring-indigo-200 z-10' 
                : 'bg-white text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            {name}
          </motion.div>
        );
      })}
    </div>
  );
};

const SlotDraw = ({ names, winnerIndex, onComplete }: { names: string[], winnerIndex: number, onComplete: () => void }) => {
  const itemHeight = 100;
  const spins = [50, 50, 50];
  const durations = [6, 6, 6];
  const directions: ('down' | 'up')[] = ['down', 'up', 'down'];
  
  const generateStrip = (spinCount: number, direction: 'up' | 'down') => {
    const arr = [];
    if (direction === 'down') {
      for (let i = 0; i < spinCount; i++) {
        arr.push(names[Math.floor(Math.random() * names.length)]);
      }
      arr.push(names[winnerIndex]); // The winner
      for (let i = 0; i < 10; i++) {
        arr.push(names[Math.floor(Math.random() * names.length)]);
      }
    } else {
      for (let i = 0; i < 10; i++) {
        arr.push(names[Math.floor(Math.random() * names.length)]);
      }
      arr.push(names[winnerIndex]); // The winner
      for (let i = 0; i < spinCount + 10; i++) {
        arr.push(names[Math.floor(Math.random() * names.length)]);
      }
    }
    return arr;
  };

  const strips = useMemo(() => [
    generateStrip(spins[0], directions[0]),
    generateStrip(spins[1], directions[1]),
    generateStrip(spins[2], directions[2]),
  ], [names, winnerIndex]);

  const lastTickRef = useRef(-1);
  const [leverPulled, setLeverPulled] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeverPulled(true), 100);
    const t2 = setTimeout(() => setLeverPulled(false), 600);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[500px] md:h-[600px] bg-[#1a0505] rounded-[2rem] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden mb-12 flex flex-col items-center justify-center border-[8px] border-yellow-900">
      
      {/* Vegas Background Rays & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,150,0,0.5)_0%,transparent_70%)] z-0" />
      <div className="absolute inset-0 opacity-30 bg-[repeating-conic-gradient(from_0deg,transparent_0deg_15deg,#ffaa00_15deg_30deg)] animate-[spin_30s_linear_infinite] z-0" />

      {/* Floating Coins */}
      <div className="absolute top-8 left-8 w-16 h-16 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-2 border-yellow-100 shadow-[0_0_20px_rgba(255,215,0,0.6)] transform -rotate-12 flex items-center justify-center text-yellow-800 font-black text-2xl z-10 animate-bounce" style={{ animationDuration: '2s' }}>€</div>
      <div className="absolute bottom-12 left-16 w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-2 border-yellow-100 shadow-[0_0_20px_rgba(255,215,0,0.6)] transform rotate-45 flex items-center justify-center text-yellow-800 font-black text-xl z-10 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>€</div>
      <div className="absolute top-16 right-12 w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-2 border-yellow-100 shadow-[0_0_20px_rgba(255,215,0,0.6)] transform rotate-12 flex items-center justify-center text-yellow-800 font-black text-3xl z-10 animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.2s' }}>€</div>
      <div className="absolute bottom-20 right-20 w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-2 border-yellow-100 shadow-[0_0_20px_rgba(255,215,0,0.6)] transform -rotate-45 flex items-center justify-center text-yellow-800 font-black text-2xl z-10 animate-bounce" style={{ animationDuration: '2.2s', animationDelay: '0.7s' }}>€</div>

      {/* Machine Frame */}
      <div className="relative z-20 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-700 p-3 md:p-5 rounded-3xl border-b-[16px] border-yellow-900 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col items-center w-11/12 max-w-3xl">
        
        {/* Top Sign */}
        <div className="bg-red-800 border-4 border-yellow-400 rounded-2xl px-10 py-2 mb-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_0_20px_rgba(220,38,38,0.8)] relative overflow-hidden">
           <div className="absolute inset-0 border-2 border-dotted border-yellow-200 opacity-50 animate-pulse m-1 rounded-xl" />
           <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase tracking-widest">
             JACKPOT
           </h2>
        </div>

        {/* Reels Wrapper */}
        <div className="relative w-full bg-yellow-950 p-3 md:p-4 rounded-2xl shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)]">
          
          {/* Inner Reel Area (exactly 300px high) */}
          <div className="relative flex gap-1 md:gap-2 h-[300px] rounded-xl overflow-hidden">
            
            {/* Cylinder shading overlay (covers all reels) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black/90 z-30 pointer-events-none" />
            
            {/* Winning Line */}
            <div className="absolute top-[100px] left-0 right-0 h-[100px] border-y-4 border-red-500 bg-red-500/20 z-40 pointer-events-none shadow-[0_0_20px_rgba(220,38,38,0.8)] flex items-center justify-between">
               <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[20px] border-l-red-500 drop-shadow-[0_0_5px_rgba(220,38,38,1)]" />
               <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[20px] border-r-red-500 drop-shadow-[0_0_5px_rgba(220,38,38,1)]" />
            </div>

            {/* Flash Effect */}
            {isFlashing && (
              <motion.div
                className="absolute inset-0 bg-white z-50 pointer-events-none mix-blend-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0, 1, 0, 1, 0, 1, 0] }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            )}

            {/* 3 Reels */}
            {strips.map((strip, reelIdx) => {
              const dir = directions[reelIdx];
              let initialY = 0;
              let targetY = 0;
              
              if (dir === 'down') {
                initialY = 0;
                targetY = -(spins[reelIdx] * itemHeight) + itemHeight; // Center the winner
              } else {
                targetY = -(10 * itemHeight) + itemHeight;
                initialY = targetY - (spins[reelIdx] * itemHeight);
              }

              return (
                <div key={reelIdx} className="relative flex-1 h-full bg-gradient-to-b from-gray-100 via-white to-gray-200 border-x-2 border-yellow-600/50">
                  <motion.div
                    className="absolute top-[0px] w-full"
                    initial={{ y: initialY }}
                    animate={{ y: targetY }}
                    transition={{ duration: durations[reelIdx], ease: [0.1, 0.85, 0.15, 1] }}
                    onUpdate={(latest) => {
                      if (reelIdx === 2) {
                        const currentIdx = Math.floor(Math.abs(latest.y as number) / itemHeight);
                        if (currentIdx !== lastTickRef.current) {
                          playTick();
                          lastTickRef.current = currentIdx;
                        }
                      }
                    }}
                    onAnimationComplete={() => {
                      if (reelIdx === 2) {
                        playSilverCoins();
                        setIsFlashing(true);
                        setTimeout(onComplete, 2500);
                      }
                    }}
                  >
                    {strip.map((name, i) => {
                      const len = name.length;
                      let textSize = "text-2xl md:text-4xl lg:text-5xl";
                      let stroke = "2px";
                      
                      if (len > 20) {
                        textSize = "text-sm md:text-lg lg:text-xl";
                        stroke = "1px";
                      } else if (len > 12) {
                        textSize = "text-lg md:text-2xl lg:text-3xl";
                        stroke = "1.5px";
                      }

                      return (
                        <div key={i} className="h-[100px] min-h-[100px] max-h-[100px] shrink-0 w-full flex items-center justify-center px-2 overflow-hidden">
                          <div 
                            className={`font-black text-red-600 text-center uppercase tracking-tighter leading-tight ${textSize}`} 
                            style={{ 
                              WebkitTextStroke: `${stroke} #7f1d1d`, 
                              textShadow: '0px 4px 4px rgba(0,0,0,0.4)',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordBreak: 'break-word'
                            }}
                          >
                            {name}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lever */}
        <div className="absolute -right-6 md:-right-10 top-1/2 -translate-y-1/2 w-10 h-40 z-0" style={{ perspective: '800px' }}>
          {/* Lever Base */}
          <div className="absolute top-1/2 left-0 w-6 h-16 bg-gradient-to-r from-gray-700 to-gray-900 rounded-r-lg -translate-y-1/2 border-y-2 border-r-2 border-gray-600 shadow-lg" />
          {/* Lever Stick */}
          <div 
            className="absolute bottom-1/2 left-2 w-4 h-32 bg-gradient-to-r from-gray-300 via-white to-gray-400 origin-bottom transition-transform duration-500 ease-in-out rounded-t-full shadow-md" 
            style={{ transform: leverPulled ? 'rotateX(160deg)' : 'rotateX(0deg)' }}
          >
            {/* Lever Ball */}
            <div className="absolute -top-6 -left-4 w-12 h-12 bg-gradient-to-br from-red-500 to-red-800 rounded-full shadow-[inset_-3px_-3px_8px_rgba(0,0,0,0.5),_0_6px_10px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

      </div>
    </div>
  );
};

const WheelDraw = ({ names, winnerIndex, onComplete }: { names: string[], winnerIndex: number, onComplete: () => void }) => {
  const colors = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#F4A261', '#2A9D8F'];
  const sliceAngle = 360 / names.length;
  
  // Target rotation: spin 12 times (4320deg), then go to the winner slice.
  // Slice 0 is at top (0 deg). To put winner at top, we rotate backwards by (winnerIndex * sliceAngle).
  const randomOffset = (Math.random() * 0.6 + 0.2) * sliceAngle; // Randomize landing spot within the slice
  const targetRotation = 360 * 12 - (winnerIndex * sliceAngle) - randomOffset;
  const lastTickRef = useRef(-1);

  const tickerPassedRef = useRef<HTMLSpanElement>(null);
  const tickerCurrentRef = useRef<HTMLSpanElement>(null);
  const tickerNextRef = useRef<HTMLSpanElement>(null);

  const [bubbleImages, setBubbleImages] = useState<string[]>([]);

  useEffect(() => {
    const allImages = Object.values(allData).flatMap(entry => {
      if (typeof entry === 'object' && entry !== null && 'image' in entry) {
        return Array.isArray(entry.image) ? entry.image : [entry.image];
      }
      if (typeof entry === 'string') return [entry];
      return [];
    }).filter(img => img && img.trim() !== '');
    
    const shuffled = [...allImages].sort(() => 0.5 - Math.random());
    setBubbleImages(shuffled.slice(0, 5));
  }, []);

  const splitText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return [text];
    const words = text.split(' ');
    if (words.length === 1) {
      const chunks = [];
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
      }
      return chunks.slice(0, 3);
    }
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + word).length > maxLength) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });
    if (currentLine) lines.push(currentLine.trim());
    return lines.slice(0, 3);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] lg:w-[500px] lg:h-[500px] mx-auto mb-6 mt-12">
        
        {/* Glowing animated background */}
        <div className="absolute -inset-10 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-2xl opacity-50 animate-pulse z-0" style={{ animationDuration: '2s' }} />

        {/* Funny Objects / Images Placeholders */}
        {bubbleImages[0] && (
          <motion.div 
            className="absolute -top-28 -left-28 md:-top-40 md:-left-40 w-52 h-52 md:w-72 md:h-72 z-0 drop-shadow-xl"
            animate={{ rotate: [0, 10, -10, 0], y: [0, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <img src={bubbleImages[0]} alt="Objet drôle 1" className="w-full h-full object-cover rounded-full border-4 border-white bg-white" referrerPolicy="no-referrer" />
          </motion.div>
        )}

        {bubbleImages[1] && (
          <motion.div 
            className="absolute -bottom-28 -right-28 md:-bottom-40 md:-right-40 w-64 h-64 md:w-80 md:h-80 z-0 drop-shadow-xl"
            animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <img src={bubbleImages[1]} alt="Objet drôle 2" className="w-full h-full object-cover rounded-full border-4 border-white bg-white" referrerPolicy="no-referrer" />
          </motion.div>
        )}

        {bubbleImages[2] && (
          <motion.div 
            className="absolute top-1/2 -right-32 md:-right-52 w-40 h-40 md:w-60 md:h-60 z-0 -translate-y-1/2 drop-shadow-xl"
            animate={{ x: [0, 20, 0], rotate: 360 }}
            transition={{ x: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 8, repeat: Infinity, ease: "linear" } }}
          >
            <img src={bubbleImages[2]} alt="Objet drôle 3" className="w-full h-full object-cover rounded-full border-4 border-white bg-white" referrerPolicy="no-referrer" />
          </motion.div>
        )}

        {bubbleImages[3] && (
          <motion.div 
            className="absolute bottom-1/4 -left-28 md:-left-40 w-40 h-40 md:w-52 md:h-52 z-0 drop-shadow-xl"
            animate={{ y: [0, 20, 0], rotate: [0, -20, 20, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <img src={bubbleImages[3]} alt="Objet drôle 4" className="w-full h-full object-cover rounded-full border-4 border-white bg-white" referrerPolicy="no-referrer" />
          </motion.div>
        )}

        {bubbleImages[4] && (
          <motion.div 
            className="absolute -top-20 -right-20 md:-top-28 md:-right-32 w-48 h-48 md:w-60 md:h-60 z-0 drop-shadow-xl"
            animate={{ y: [0, -20, 0], rotate: [0, 15, -15, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <img src={bubbleImages[4]} alt="Objet drôle 5" className="w-full h-full object-cover rounded-full border-4 border-white bg-white" referrerPolicy="no-referrer" />
          </motion.div>
        )}

        {/* Pointer */}
        <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] md:border-l-[25px] md:border-r-[25px] md:border-t-[45px] border-l-transparent border-r-transparent border-t-slate-800 z-20 drop-shadow-lg" />
        
        <motion.div
          className="relative w-full h-full rounded-full overflow-hidden border-8 border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-slate-800 z-10"
          initial={{ rotate: 0 }}
          animate={{ rotate: targetRotation }}
          transition={{ duration: 6.8, ease: [0.1, 0.9, 0.1, 1] }}
          onUpdate={(latest) => {
            const currentAngle = (latest.rotate as number) % 360;
            let normalizedAngle = (360 - currentAngle) % 360;
            if (normalizedAngle < 0) normalizedAngle += 360;
            
            const currentSlice = Math.floor(normalizedAngle / sliceAngle) % names.length;
            
            if (currentSlice !== lastTickRef.current) {
              playTick();
              lastTickRef.current = currentSlice;
              
              if (tickerCurrentRef.current) {
                tickerCurrentRef.current.textContent = names[currentSlice];
              }
              if (tickerPassedRef.current) {
                const passedSlice = (currentSlice + 1) % names.length;
                tickerPassedRef.current.textContent = names[passedSlice];
              }
              if (tickerNextRef.current) {
                const nextSlice = (currentSlice - 1 + names.length) % names.length;
                tickerNextRef.current.textContent = names[nextSlice];
              }
            }
          }}
          onAnimationComplete={() => {
            playCoin();
            setTimeout(onComplete, 800);
          }}
        >
          {names.length === 1 ? (
            <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: colors[0] }}>
              {names[0]}
            </div>
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {names.map((name, i) => {
                const startAngle = i * sliceAngle;
                const endAngle = (i + 1) * sliceAngle;
                const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                
                const midAngle = startAngle + sliceAngle / 2;
                const textX = 50 + 32 * Math.cos((Math.PI * midAngle) / 180);
                const textY = 50 + 32 * Math.sin((Math.PI * midAngle) / 180);

                let fontSize = "5px";
                let maxCharsPerLine = 12;
                
                if (names.length > 24) {
                  fontSize = "2px";
                  maxCharsPerLine = 8;
                } else if (names.length > 16) {
                  fontSize = "2.5px";
                  maxCharsPerLine = 10;
                } else if (names.length > 8) {
                  fontSize = "3.5px";
                  maxCharsPerLine = 12;
                } else if (name.length > 12) {
                  fontSize = "4px";
                  maxCharsPerLine = 14;
                }

                const lines = splitText(name, maxCharsPerLine);

                return (
                  <g key={i}>
                    <path d={pathData} fill={colors[i % colors.length]} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.6)' }}
                    >
                      {lines.map((line, idx) => (
                        <tspan 
                          x={textX} 
                          dy={idx === 0 ? `${-(lines.length - 1) * 0.5}em` : "1em"} 
                          key={idx}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </motion.div>
      </div>

      {/* SUSPENSE TICKER */}
      <div className="mt-4 md:mt-8 flex items-center justify-between bg-slate-900 px-4 py-3 md:px-8 md:py-5 rounded-2xl border-4 border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.3)] w-full max-w-3xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900 z-10 pointer-events-none" />
        
        <div className="w-1/3 text-right pr-4 md:pr-8 z-0">
          <span ref={tickerPassedRef} className="text-slate-500 text-sm md:text-xl font-bold opacity-40 truncate block">
            {names.length > 1 ? names[1] : ''}
          </span>
        </div>
        
        <div className="flex-shrink-0 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-6 py-2 md:px-10 md:py-3 rounded-xl border-2 border-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.8)] z-20 transform scale-110 md:scale-125">
          <span ref={tickerCurrentRef} className="text-xl md:text-3xl font-black uppercase tracking-wider whitespace-nowrap drop-shadow-md">
            {names[0]}
          </span>
        </div>
        
        <div className="w-1/3 text-left pl-4 md:pl-8 z-0">
          <span ref={tickerNextRef} className="text-slate-300 text-sm md:text-xl font-bold opacity-80 truncate block">
            {names.length > 1 ? names[names.length - 1] : ''}
          </span>
        </div>
      </div>

    </div>
  );
};

// --- MAIN APP ---

type AnimationStyle = 'classic' | 'slot' | 'wheel';
type AppStatus = 'idle' | 'drawing' | 'finished';

const PRECONFIGURED_PHOTOS: Record<string, string> = {
  // Ajoutez vos élèves ici : "Nom de l'élève": "URL de la photo"
  "Julien": "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/png-clipart-julien-madagascar-cartoon-dreamworks-animation-madagascar-mammal-carnivoran-thumbnail.png?alt=media&token=437cfd97-416b-4982-9390-3699d7044469",
  "Barbamama": "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/barbamama-couleur-noire.jpg?alt=media&token=11aacba8-f131-4ead-8858-f280b6e5d4f1",
  "Élève 3": "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/a71fe987-78f7-49db-b7a0-eb188d2d1694.jfif?alt=media&token=7a8dac85-ee1f-4bbc-a960-887701cbdbd2",
  "Élève 4": "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/UF2NA7NXPVANHPTUCEZE6CMNUE.jpg?alt=media&token=61e4832e-7200-450b-8edd-e5c624becce9"
};

const formatName = (fullName: string) => {
  if (Object.keys(allData).includes(fullName)) {
    const parts = fullName.split(' ').filter(word => word !== word.toUpperCase() || word.length === 1);
    return parts.length > 0 ? parts.join(' ') : fullName.split(' ')[0];
  }
  return fullName;
};

export default function App() {
  const [inputNames, setInputNames] = useState<string>('');
  const [namesList, setNamesList] = useState<string[]>([]);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [winnerImage, setWinnerImage] = useState<string | null>(null);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('classic');
  const [volume, setVolume] = useState<number>(1.0);
  const [isCasinoMusicEnabled, setIsCasinoMusicEnabled] = useState<boolean>(false);
  const [appMode, setAppMode] = useState<'draw' | 'vote'>('draw');
  const [secretMode, setSecretMode] = useState(false);
  const [remoteSecretWinner, setRemoteSecretWinner] = useState<string | null>(null);
  const [excludedNames, setExcludedNames] = useState<string[]>([]);
  const drawContainerRef = useRef<HTMLDivElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let keys = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      keys += e.key.toLowerCase();
      if (keys.length > 7) {
        keys = keys.slice(-7);
      }
      if (keys === 'antoine') {
        setSecretMode(prev => !prev);
        keys = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    socket.on('admin:sync_winner', (name: string | null) => {
      setRemoteSecretWinner(name);
    });
    return () => {
      socket.off('admin:sync_winner');
    };
  }, []);

  useEffect(() => {
    setAudioVolume(volume);
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = volume * 0.4;
    }
  }, [volume]);

  useEffect(() => {
    if (bgMusicRef.current) {
      if (isCasinoMusicEnabled) {
        bgMusicRef.current.play().catch(console.error);
      } else {
        bgMusicRef.current.pause();
      }
    }
  }, [isCasinoMusicEnabled]);

  useEffect(() => {
    if (status === 'drawing' && drawContainerRef.current) {
      setTimeout(() => {
        drawContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [status]);

  const startDraw = (listToUse = namesList) => {
    let list = listToUse;
    
    if (status === 'idle') {
      list = inputNames.split('\n').map((n) => n.trim()).filter(Boolean);
      if (list.length === 0) {
        alert('Veuillez entrer au moins un nom.');
        return;
      }
      setNamesList(list);
    }

    initAudio();
    
    // Calcul du gagnant avec prise en compte des poids (chances)
    const weights = list.map(name => {
      if (excludedNames.includes(name)) return 0;
      const entry = (allData as Record<string, any>)[name];
      if (entry && typeof entry === 'object' && typeof entry.weight === 'number') {
        return entry.weight;
      }
      return 1; // Poids par défaut
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let newWinnerIndex = 0;
    
    if (totalWeight > 0) {
      let randomVal = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        randomVal -= weights[i];
        if (randomVal <= 0) {
          newWinnerIndex = i;
          break;
        }
      }
    } else {
      // Fallback if all are excluded
      newWinnerIndex = Math.floor(Math.random() * list.length);
    }

    // --- SECRET OVERRIDE ---
    if (remoteSecretWinner && list.includes(remoteSecretWinner)) {
      newWinnerIndex = list.indexOf(remoteSecretWinner);
      socket.emit('admin:clear_winner');
    }

    setWinnerIndex(newWinnerIndex);
    
    // Déterminer l'image du gagnant
    const winnerName = list[newWinnerIndex];
    const ect1Entry = (allData as Record<string, any>)[winnerName];
    let ect1Image = typeof ect1Entry === 'object' ? ect1Entry.image : (typeof ect1Entry === 'string' ? ect1Entry : null);

    if (Array.isArray(ect1Image)) {
      ect1Image = ect1Image.length > 0 ? ect1Image[Math.floor(Math.random() * ect1Image.length)] : null;
    }

    if (ect1Image && ect1Image.trim() !== "") {
      setWinnerImage(ect1Image);
    } else if (PRECONFIGURED_PHOTOS[winnerName]) {
      setWinnerImage(PRECONFIGURED_PHOTOS[winnerName]);
    } else {
      // Photo au hasard parmi une liste ou picsum
      const randomImages = [
        "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/png-clipart-julien-madagascar-cartoon-dreamworks-animation-madagascar-mammal-carnivoran-thumbnail.png?alt=media&token=437cfd97-416b-4982-9390-3699d7044469",
        "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/barbamama-couleur-noire.jpg?alt=media&token=11aacba8-f131-4ead-8858-f280b6e5d4f1",
        "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/a71fe987-78f7-49db-b7a0-eb188d2d1694.jfif?alt=media&token=7a8dac85-ee1f-4bbc-a960-887701cbdbd2",
        "https://firebasestorage.googleapis.com/v0/b/portolio-fdeca.firebasestorage.app/o/UF2NA7NXPVANHPTUCEZE6CMNUE.jpg?alt=media&token=61e4832e-7200-450b-8edd-e5c624becce9"
      ];
      setWinnerImage(randomImages[Math.floor(Math.random() * randomImages.length)]);
    }

    setStatus('drawing');
  };

  const handleRedraw = () => {
    startDraw(namesList);
  };

  const handleRemoveAndRedraw = () => {
    if (winnerIndex === null) return;
    const newList = namesList.filter((_, index) => index !== winnerIndex);
    setNamesList(newList);
    setInputNames(newList.join('\n'));

    if (newList.length === 0) {
      setStatus('idle');
      setWinnerIndex(null);
      setWinnerImage(null);
      alert('La liste est vide !');
      return;
    }
    startDraw(newList);
  };

  const handleComplete = () => {
    setStatus('finished');
    triggerConfetti();
    playJackpot();
  };

  const triggerConfetti = () => {
    const duration = 2000; // Reduced duration
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2, // Reduced particle count
        angle: 60, spread: 55, origin: { x: 0 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });
      confetti({
        particleCount: 2, // Reduced particle count
        angle: 120, spread: 55, origin: { x: 1 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center p-4 md:p-8">
      <div className={`w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative transition-all duration-700 mt-8 mb-auto ${status === 'drawing' && animationStyle === 'slot' ? 'max-w-5xl' : 'max-w-4xl'}`}>
        
        <audio ref={bgMusicRef} src="https://actions.google.com/sounds/v1/foley/falling_coins.ogg" loop />

        {/* Controls */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 bg-slate-100/80 backdrop-blur-sm p-2 px-3 rounded-full border border-slate-200 z-50">
          <button 
            onClick={() => setIsCasinoMusicEnabled(!isCasinoMusicEnabled)} 
            className={`transition-colors flex items-center justify-center w-8 h-8 rounded-full ${isCasinoMusicEnabled ? 'bg-yellow-400 text-yellow-900' : 'text-slate-500 hover:text-yellow-600'}`}
            title="Musique Casino (Sous qui tombent)"
          >
            <Music className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <button onClick={() => setVolume(v => v === 0 ? 1 : 0)} className="text-slate-500 hover:text-indigo-600 transition-colors">
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input 
            type="range" 
            min="0" max="1" step="0.1" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))} 
            className="w-20 md:w-24 accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="p-8 md:p-12">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-indigo-600 mb-2 flex items-center justify-center gap-3">
              Plouf Plouf !
            </h1>
            <p className="text-slate-500 text-lg">Tirez au sort un nom de manière aléatoire</p>
          </div>

          {/* MODE SWITCHER */}
          {status === 'idle' && (
            <div className="flex justify-center mb-8">
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                <button
                  onClick={() => setAppMode('draw')}
                  className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${appMode === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sparkles className="w-4 h-4" /> Tirage
                </button>
                <button
                  onClick={() => setAppMode('vote')}
                  className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${appMode === 'vote' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Vote className="w-4 h-4" /> Vote
                </button>
              </div>
            </div>
          )}

          {appMode === 'vote' ? (
            <VoteMode onBack={() => setAppMode('draw')} namesList={namesList} />
          ) : (
            <>
              {status === 'idle' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
              
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                  Choisissez votre style d'animation
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'classic', icon: LayoutGrid, label: 'Classique' },
                    { id: 'slot', icon: Coins, label: 'Casino' },
                    { id: 'wheel', icon: CircleDashed, label: 'Roulette' }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setAnimationStyle(style.id as AnimationStyle)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                        animationStyle === style.id 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                          : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <style.icon className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="names" className="block text-sm font-medium text-slate-700">
                    Liste des participants (un par ligne)
                  </label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setInputNames(Object.keys(ect1Data).join('\n'))}
                      className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-200 transition-colors font-semibold"
                    >
                      <Users className="w-3.5 h-3.5" />
                      ECT1
                    </button>
                    <button 
                      onClick={() => setInputNames(Object.keys(ect2Data).join('\n'))}
                      className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-200 transition-colors font-semibold"
                    >
                      <Users className="w-3.5 h-3.5" />
                      ECT2
                    </button>
                  </div>
                </div>
                <textarea
                  id="names"
                  rows={6}
                  className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none text-lg shadow-sm"
                  placeholder="Alice&#10;Bob&#10;Charlie&#10;David"
                  value={inputNames}
                  onChange={(e) => setInputNames(e.target.value)}
                />

                {secretMode && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <label className="block text-xs font-bold text-rose-700 mb-2"> Cheat Mode (Contrôle à distance)</label>
                    <select 
                      value={remoteSecretWinner || ''}
                      onChange={(e) => socket.emit('admin:set_winner', e.target.value || null)}
                      className="w-full p-2 text-sm border border-rose-200 rounded-lg bg-white text-rose-900 focus:ring-2 focus:ring-rose-500 outline-none mb-3"
                    >
                      <option value="">-- Tirage Aléatoire Normal --</option>
                      {Object.keys(allData).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {remoteSecretWinner && (
                      <p className="text-xs text-rose-600 mt-2 font-medium mb-3">
                        Le prochain tirage sur N'IMPORTE QUEL ordinateur tombera sur : <b>{remoteSecretWinner}</b>
                      </p>
                    )}

                    <label className="block text-xs font-bold text-rose-700 mb-2"> Exclure du prochain tirage :</label>
                    <div className="max-h-[250px] overflow-y-auto bg-white border border-rose-200 rounded-lg p-2 text-sm">
                      {inputNames.trim() === '' ? (
                        <p className="text-slate-500 italic text-center py-2">Veuillez charger une liste (ECT1/ECT2) ou entrer des noms pour pouvoir les exclure.</p>
                      ) : (
                        inputNames.split('\n').map(n => n.trim()).filter(Boolean).map(name => (
                          <label key={name} className="flex items-center gap-2 p-1 hover:bg-rose-50 rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={excludedNames.includes(name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExcludedNames(prev => [...prev, name]);
                                } else {
                                  setExcludedNames(prev => prev.filter(n => n !== name));
                                }
                              }}
                              className="rounded text-rose-500 focus:ring-rose-500"
                            />
                            <span className={excludedNames.includes(name) ? 'line-through text-slate-400' : 'text-slate-700'}>{name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <button
                onClick={() => startDraw()}
                disabled={!inputNames.trim()}
                className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6 fill-current" />
                C'est parti !
              </button>
            </motion.div>
          )}

          {status === 'drawing' && winnerIndex !== null && (
            <div className="py-8" ref={drawContainerRef}>
              {animationStyle === 'classic' && <ClassicDraw names={namesList.map(formatName)} winnerIndex={winnerIndex} onComplete={handleComplete} />}
              {animationStyle === 'slot' && <SlotDraw names={namesList.map(formatName)} winnerIndex={winnerIndex} onComplete={handleComplete} />}
              {animationStyle === 'wheel' && <WheelDraw names={namesList.map(formatName)} winnerIndex={winnerIndex} onComplete={handleComplete} />}
            </div>
          )}

          {status === 'finished' && winnerIndex !== null && (
            <div className="py-8">
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-12"
                >
                  <motion.img
                    initial={{ scale: 0, rotate: -1440 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      scale: { type: "spring", stiffness: 260, damping: 20, delay: 0.1 },
                      rotate: { type: "tween", duration: 1.5, ease: "easeOut", delay: 0.1 }
                    }}
                    src={winnerImage || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(namesList[winnerIndex])}`}
                    alt={namesList[winnerIndex]}
                    className="w-64 h-64 md:w-96 md:h-96 lg:w-[32rem] lg:h-[32rem] rounded-3xl border-8 border-indigo-500 shadow-2xl bg-indigo-50 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-center md:text-left flex flex-col justify-center">
                    <div className="text-3xl md:text-4xl lg:text-5xl text-indigo-400 font-bold mb-4">🎉 Gagnant !</div>
                    <div className="text-5xl md:text-7xl lg:text-8xl font-black text-indigo-600 leading-tight">
                      {formatName(namesList[winnerIndex])}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={handleRedraw}
                  className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Relancer
                </button>
                <button
                  onClick={handleRemoveAndRedraw}
                  className="py-3 px-6 bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Supprimer et relancer
                </button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
              >
                <button
                  onClick={() => {
                    setStatus('idle');
                    setWinnerIndex(null);
                  }}
                  className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-4 flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la liste
                </button>
              </motion.div>
            </div>
          )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
