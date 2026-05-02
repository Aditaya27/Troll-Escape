import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Settings, X, ArrowLeft, ArrowRight, ArrowUp, Pause, RotateCcw, Home, Lock, List } from 'lucide-react';
import { levels, getLevel } from './game/levels';
import { audioSystem } from './game/audio';
import { GameEngine, GameInput } from './game/engine';
import { GameSettings } from './game/types';

type AppState = 'menu' | 'settings' | 'levelSelect' | 'playing';

export default function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [clearedLevels, setClearedLevels] = useState<number[]>([]);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [settings, setSettings] = useState<GameSettings>({ sfxVolume: 5, bgmVolume: 5 });
  const [isPaused, setIsPaused] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  useEffect(() => {
    // Only init audio system when user interacts to avoid auto-play policy issues in browser
    const handleFirstInteraction = () => {
      audioSystem.init();
      audioSystem.applySettings(settings);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    audioSystem.applySettings(settings);
  }, [settings]);

  const playClick = () => {
    audioSystem.init(); // ensure init
    audioSystem.playClick();
  };

  const handleBGMVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, bgmVolume: parseInt(e.target.value) }));
  };

  const handleSFXVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, sfxVolume: parseInt(e.target.value) }));
    playClick(); // play test sound
  };

  return (
    <div className="flex h-[100dvh] w-[100dvw] items-center justify-center bg-gray-900 text-white select-none overflow-hidden touch-none font-mono">
      <div className="relative w-full h-full sm:max-w-3xl sm:max-h-[600px] bg-black sm:rounded-lg overflow-hidden shadow-none sm:shadow-2xl sm:ring-4 ring-gray-800 flex flex-col">
        
        {appState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 overflow-y-auto py-4">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2 tracking-widest uppercase text-center shrink-0 mt-auto">Troll Escape</h1>
            <p className="text-gray-400 mb-8 shrink-0">A Pixel Puzzle Platformer</p>
            
            <div className="flex flex-col gap-4 w-64 shrink-0 mb-auto">
              <button 
                onClick={() => { playClick(); setAppState('levelSelect'); }}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition-all uppercase font-bold"
              >
                <Play size={20} /> Play
              </button>
              
              <button 
                onClick={() => { playClick(); setAppState('settings'); }}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded border-b-4 border-gray-800 active:translate-y-1 active:border-b-0 transition-all uppercase font-bold"
              >
                <Settings size={20} /> Settings
              </button>
              
              <button 
                onClick={() => { playClick(); alert("Thanks for playing!"); }}
                className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 px-6 rounded border-b-4 border-rose-700 active:translate-y-1 active:border-b-0 transition-all uppercase font-bold"
              >
                <X size={20} /> Quit
              </button>
            </div>
          </div>
        )}

        {appState === 'settings' && (
          <div className="absolute inset-0 flex flex-col items-center text-center justify-center bg-gray-900 z-10 overflow-y-auto py-4">
            <h2 className="text-3xl font-bold text-white mb-8 uppercase shrink-0 mt-auto">Settings</h2>
            
            <div className="w-64 space-y-8 mb-8 shrink-0">
              <div className="flex flex-col gap-2">
                <label className="flex justify-between font-bold uppercase text-gray-300">
                  <span>BGM Vol</span>
                  <span>{settings.bgmVolume}</span>
                </label>
                <input 
                  type="range" min="0" max="10" 
                  value={settings.bgmVolume} 
                  onChange={handleBGMVolumeChange}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex justify-between font-bold uppercase text-gray-300">
                  <span>SFX Vol</span>
                  <span>{settings.sfxVolume}</span>
                </label>
                <input 
                  type="range" min="0" max="10" 
                  value={settings.sfxVolume} 
                  onChange={handleSFXVolumeChange}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <button 
              onClick={() => { playClick(); setAppState('menu'); }}
              className="mt-8 mb-auto bg-gray-700 hover:bg-gray-600 text-white py-3 px-8 rounded border-b-4 border-gray-800 active:translate-y-1 active:border-b-0 transition-all uppercase font-bold shrink-0"
            >
              Back
            </button>
          </div>
        )}

        {appState === 'levelSelect' && (
          <div className="absolute inset-0 flex flex-col items-center py-6 bg-gray-900 z-10 px-4 overflow-y-auto">
            <h2 className="text-3xl font-bold text-white mb-4 uppercase shrink-0 mt-auto">Select Level</h2>
            
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs shrink-0">
              {Array.from({ length: 15 }).map((_, i) => {
                const levelId = i + 1;
                const isIntroduced = levels.find(l => l.id === levelId);
                
                if (!isIntroduced) {
                  return (
                    <div key={levelId} className="h-12 md:h-14 flex flex-col items-center justify-center bg-gray-800 text-gray-500 rounded border-b-4 border-gray-900 opacity-50 relative">
                      <span className="text-lg font-bold">{levelId}</span>
                      <span className="text-[8px] uppercase text-center leading-tight">Coming<br/>Soon</span>
                    </div>
                  );
                }

                const isUnlocked = unlockedLevels.includes(levelId);
                const isCleared = clearedLevels.includes(levelId);

                if (!isUnlocked) {
                  return (
                    <div key={levelId} className="h-12 md:h-14 flex flex-col items-center justify-center bg-gray-700 text-gray-500 rounded border-b-4 border-gray-800 relative shadow-inner">
                      <span className="text-lg font-bold opacity-50">{levelId}</span>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                        <Lock size={16} className="text-gray-400" />
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={levelId}
                    onClick={() => {
                      playClick();
                      setCurrentLevelId(levelId);
                      setAppState('playing');
                      setHasWon(false);
                      setIsPaused(false);
                      audioSystem.playBGM();
                    }}
                    className={`h-12 md:h-14 flex items-center justify-center text-white text-xl rounded border-b-4 active:translate-y-1 active:border-b-0 transition-all font-bold ${
                      isCleared ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-700 text-white" : "bg-gray-500 hover:bg-gray-600 border-gray-700 text-white"
                    }`}
                  >
                    {levelId}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => { playClick(); setAppState('menu'); }}
              className="mt-auto mb-auto pt-2 pb-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-8 rounded border-b-4 border-gray-800 active:translate-y-1 active:border-b-0 transition-all uppercase font-bold shrink-0 self-center max-w-xs w-[120px]"
            >
              Back
            </button>
          </div>
        )}

        {appState === 'playing' && (
          <GameView 
            levelId={currentLevelId} 
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            hasWon={hasWon}
            setHasWon={(won) => {
              setHasWon(won);
              if (won) {
                setClearedLevels(prev => Array.from(new Set([...prev, currentLevelId])));
                setUnlockedLevels(prev => Array.from(new Set([...prev, currentLevelId + 1])));
              }
            }}
            onQuitToMenu={() => {
              playClick();
              audioSystem.stopBGM();
              setAppState('menu');
            }}
            onQuitToLevelSelect={() => {
              playClick();
              audioSystem.stopBGM();
              setAppState('levelSelect');
            }}
            settings={settings}
            onBGMChange={handleBGMVolumeChange}
            onSFXChange={handleSFXVolumeChange}
            startNextLevel={() => {
              setCurrentLevelId(currentLevelId + 1);
              setHasWon(false);
              setIsPaused(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ----------------------
// GAME VIEW COMPONENT
// ----------------------

interface GameViewProps {
  levelId: number;
  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  hasWon: boolean;
  setHasWon: (w: boolean) => void;
  onQuitToMenu: () => void;
  onQuitToLevelSelect: () => void;
  settings: GameSettings;
  onBGMChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSFXChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startNextLevel: () => void;
}

function GameView({ levelId, isPaused, setIsPaused, hasWon, setHasWon, onQuitToMenu, onQuitToLevelSelect, settings, onBGMChange, onSFXChange, startNextLevel }: GameViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isPaused) {
      setShowSettings(false);
    }
  }, [isPaused]);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<GameInput>({ left: false, right: false, jump: false, jumpPressed: false });
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const level = getLevel(levelId);

  useEffect(() => {
    if (!canvasRef.current || !level) return;
    
    // Set internal resolution (zoomed out 100% by doubling)
    canvasRef.current.width = 1200;
    canvasRef.current.height = 800;

    engineRef.current = new GameEngine(canvasRef.current, level, () => {
      setHasWon(true);
    });

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isPaused && engineRef.current) {
        engineRef.current.tick(dt, inputRef.current);
        engineRef.current.render();
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [level, isPaused]); // Re-bind if level changes or pause changes (to pause logic)

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasWon || isPaused) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { inputRef.current.left = true; e.preventDefault(); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { inputRef.current.right = true; e.preventDefault(); }
      if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') { 
        if (!inputRef.current.jump) inputRef.current.jumpPressed = true;
        inputRef.current.jump = true; 
        e.preventDefault(); 
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        setIsPaused(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') inputRef.current.jump = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasWon, isPaused, setIsPaused]);


  // Play sounds for buttons
  const playClick = () => { audioSystem.init(); audioSystem.playClick(); };

  const restartLevel = () => {
    playClick();
    if (engineRef.current) engineRef.current.resetPlayer();
    setHasWon(false);
    setIsPaused(false);
    lastTimeRef.current = performance.now(); // prevent spike
  };

  if (!level) return <div className="text-white">Level not found</div>;

  return (
    <div className="relative w-full h-full min-h-0 flex-1 bg-gray-900 flex flex-col items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* In-Game UI Overlay */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center pointer-events-none">
        <div className="text-xl font-bold bg-black/50 px-3 py-1 rounded text-white pointer-events-auto">
          {level.name}
        </div>
        {!hasWon && (
          <button 
            onClick={() => { playClick(); setIsPaused(true); }}
            className="bg-black/50 hover:bg-black/80 text-white p-2 rounded pointer-events-auto transition-colors"
          >
            <Pause size={24} />
          </button>
        )}
      </div>

      {/* Mobile Controls Overlay */}
      {!hasWon && !isPaused && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4">
          <div className="flex justify-between w-full opacity-60">
            {/* D-PAD Left */}
            <div className="flex gap-4 pointer-events-auto">
              <button 
                className="w-16 h-16 bg-gray-700/90 active:bg-gray-600 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 rounded-xl flex items-center justify-center touch-none select-none transition-all shadow-lg"
                onPointerDown={(e) => { e.preventDefault(); inputRef.current.left = true; e.currentTarget.releasePointerCapture(e.pointerId); }}
                onPointerUp={(e) => { e.preventDefault(); inputRef.current.left = false; }}
                onPointerLeave={(e) => { e.preventDefault(); inputRef.current.left = false; }}
                onPointerCancel={(e) => { e.preventDefault(); inputRef.current.left = false; }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <ArrowLeft size={32} className="text-white" />
              </button>
              <button 
                className="w-16 h-16 bg-gray-700/90 active:bg-gray-600 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 rounded-xl flex items-center justify-center touch-none select-none transition-all shadow-lg"
                onPointerDown={(e) => { e.preventDefault(); inputRef.current.right = true; e.currentTarget.releasePointerCapture(e.pointerId); }}
                onPointerUp={(e) => { e.preventDefault(); inputRef.current.right = false; }}
                onPointerLeave={(e) => { e.preventDefault(); inputRef.current.right = false; }}
                onPointerCancel={(e) => { e.preventDefault(); inputRef.current.right = false; }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <ArrowRight size={32} className="text-white" />
              </button>
            </div>
            
            {/* Jump Button Right */}
            <div className="pointer-events-auto text-right">
              <button 
                className="w-16 h-16 bg-emerald-600/90 active:bg-emerald-500 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 rounded-xl flex items-center justify-center touch-none select-none transition-all shadow-lg"
                onPointerDown={(e) => { 
                  e.preventDefault(); 
                  if (!inputRef.current.jump) inputRef.current.jumpPressed = true;
                  inputRef.current.jump = true; 
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onPointerUp={(e) => { e.preventDefault(); inputRef.current.jump = false; }}
                onPointerLeave={(e) => { e.preventDefault(); inputRef.current.jump = false; }}
                onPointerCancel={(e) => { e.preventDefault(); inputRef.current.jump = false; }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <ArrowUp size={32} className="text-emerald-200" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {isPaused && !hasWon && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 overflow-y-auto py-4">
          {!showSettings ? (
            <>
              <h2 className="text-3xl font-bold text-white mb-8 uppercase tracking-wider mt-auto shrink-0">Paused</h2>
              <div className="flex flex-col gap-4 w-64 mb-auto shrink-0">
                <button 
                  onClick={() => { playClick(); setIsPaused(false); lastTimeRef.current = performance.now(); }}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition-all font-bold uppercase"
                >
                  <Play size={20} /> Resume
                </button>
                <button 
                  onClick={restartLevel}
                  className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white py-3 px-6 rounded border-b-4 border-yellow-800 active:translate-y-1 active:border-b-0 transition-all font-bold uppercase"
                >
                  <RotateCcw size={20} /> Restart Level
                </button>
                <button 
                  onClick={() => { playClick(); setShowSettings(true); }}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded border-b-4 border-gray-800 active:translate-y-1 active:border-b-0 transition-all font-bold uppercase"
                >
                  <Settings size={20} /> Settings
                </button>
                <button 
                  onClick={onQuitToMenu}
                  className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 px-6 rounded border-b-4 border-rose-700 active:translate-y-1 active:border-b-0 transition-all font-bold uppercase"
                >
                  <Home size={20} /> Main Menu
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full my-auto pb-4">
              <h2 className="text-3xl font-bold text-white mb-8 uppercase shrink-0">Settings</h2>
              
              <div className="w-64 space-y-8 mb-8 text-left shrink-0">
                <div className="flex flex-col gap-2">
                  <label className="flex justify-between font-bold uppercase text-gray-300">
                    <span>BGM Vol</span>
                    <span>{settings.bgmVolume}</span>
                  </label>
                  <input 
                    type="range" min="0" max="10" 
                    value={settings.bgmVolume} 
                    onChange={onBGMChange}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex justify-between font-bold uppercase text-gray-300">
                    <span>SFX Vol</span>
                    <span>{settings.sfxVolume}</span>
                  </label>
                  <input 
                    type="range" min="0" max="10" 
                    value={settings.sfxVolume} 
                    onChange={onSFXChange}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              <button 
                onClick={() => { playClick(); setShowSettings(false); }}
                className="mt-4 bg-gray-700 hover:bg-gray-600 text-white py-3 px-8 rounded border-b-4 border-gray-800 active:translate-y-1 active:border-b-0 transition-all uppercase font-bold"
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Win Overlay */}
      {hasWon && (() => {
        const nextLevelExists = !!levels.find(l => l.id === levelId + 1);
        
        return (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 animate-in fade-in duration-500 overflow-y-auto py-4">
            <h2 className="text-5xl font-bold text-emerald-400 mb-2 uppercase tracking-widest animate-bounce mt-auto shrink-0">Escaped!</h2>
            <p className="text-gray-300 mb-8 shrink-0">You beat {level.name}</p>
            <div className="flex flex-col items-center gap-4 w-full px-4 mb-auto shrink-0">
              <div className="flex justify-center gap-2 sm:gap-4 w-full">
                <button 
                  onClick={restartLevel}
                  className="flex items-center justify-center gap-1 sm:gap-2 bg-yellow-600 hover:bg-yellow-500 text-white py-3 px-2 sm:px-4 rounded border-b-4 border-yellow-800 active:translate-y-1 active:border-b-0 transition-all font-bold uppercase flex-1 max-w-[140px] text-sm sm:text-base"
                >
                  <RotateCcw size={18} /> <span className="hidden sm:inline">Play</span> Again
                </button>

                <button 
                  onClick={onQuitToLevelSelect}
                  className="flex items-center justify-center gap-1 sm:gap-2 bg-orange-600 hover:bg-orange-500 text-white py-3 px-2 sm:px-4 rounded border-b-4 border-orange-800 active:translate-y-1 active:border-b-0 transition-all font-bold uppercase flex-1 max-w-[140px] text-sm sm:text-base"
                >
                  <List size={18} /> Levels
                </button>

                <button 
                  onClick={() => { playClick(); if (nextLevelExists) startNextLevel(); }}
                  disabled={!nextLevelExists}
                  className={`relative flex items-center justify-center gap-1 sm:gap-2 text-white py-3 px-2 sm:px-4 rounded border-b-4 active:translate-y-1 active:border-b-0 transition-all flex-1 max-w-[140px] text-sm sm:text-base ${
                    nextLevelExists ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-800 font-bold uppercase' : 'bg-gray-600 border-gray-800 cursor-not-allowed uppercase font-bold text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    {nextLevelExists ? <><ArrowRight size={18} /> Next</> : <span className="text-sm">COMING SOON</span>}
                  </div>
                </button>
              </div>

              <div className="flex justify-center mt-2 w-full">
                <button 
                  onClick={onQuitToMenu}
                  className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 px-8 rounded border-b-4 border-rose-700 active:translate-y-1 active:border-b-0 transition-all font-bold uppercase w-48"
                >
                  <Home size={20} /> Menu
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
