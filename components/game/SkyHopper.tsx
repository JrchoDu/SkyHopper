'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { drawWorld, type World } from '@/lib/render';

type Screen = 'menu' | 'playing' | 'paused' | 'over';
type Settings = { sound: boolean; shake: boolean; reducedMotion: boolean };
const W = 960, H = 540, FLOOR = 488;
const defaults: Settings = { sound: true, shake: true, reducedMotion: false };

export default function SkyHopper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>({ screen: 'menu', birdY: 260, velocity: 0, rotation: 0, flapAt: 0, time: 0, distance: 0, score: 0, best: 0, pipes: [], particles: [], shake: 0, flash: 0, milestone: 0, settings: defaults });
  const [screen, setScreen] = useState<Screen>('menu');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [settings, setSettings] = useState(defaults);
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState(false);
  const [flightCount, setFlightCount] = useState(0);
  const flightCountRef = useRef(0);
  const endLock = useRef(0);
  const sfx = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sky-hopper-save-v1');
      if (raw) {
        const save = JSON.parse(raw);
        const b = Number.isFinite(save.best) && save.best >= 0 ? Math.floor(save.best) : 0;
        const games = Number.isFinite(save.games) && save.games >= 0 ? Math.floor(save.games) : 0;
        const opts = { sound: typeof save.settings?.sound === 'boolean' ? save.settings.sound : true, shake: typeof save.settings?.shake === 'boolean' ? save.settings.shake : true, reducedMotion: typeof save.settings?.reducedMotion === 'boolean' ? save.settings.reducedMotion : false };
        setBest(b); setSettings(opts); setFlightCount(games); flightCountRef.current = games; world.current.best = b; world.current.settings = opts;
      }
    } catch { /* start with a clean save if storage is unavailable */ }
  }, []);

  const persist = useCallback((b: number, opts: Settings) => {
    try { localStorage.setItem('sky-hopper-save-v1', JSON.stringify({ version: 1, best: b, games: flightCountRef.current, settings: opts })); } catch { /* storage may be disabled */ }
  }, []);

  const tone = useCallback((kind: 'flap' | 'score' | 'hit' | 'best') => {
    if (!world.current.settings.sound || muted) return;
    try {
      const Ctx = window.AudioContext;
      if (!sfx.current) sfx.current = new Ctx();
      const ctx = sfx.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      const now = ctx.currentTime;
      const tones = { flap: [420, 680, .075], score: [720, 1040, .14], hit: [230, 90, .22], best: [740, 1240, .28] } as const;
      const [from, to, duration] = tones[kind];
      osc.type = kind === 'hit' ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(kind === 'hit' ? .13 : .075, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + duration + .02);
    } catch { /* audio is an enhancement; gameplay stays available */ }
  }, [muted]);

  const changeScreen = useCallback((next: Screen) => { world.current.screen = next; setScreen(next); }, []);

  const flap = useCallback(() => {
    const g = world.current;
    if (g.screen === 'menu' || g.screen === 'over' || g.screen === 'paused') {
      if (Date.now() < endLock.current) return;
      const fresh = g.screen === 'over';
      g.score = 0; g.birdY = 260; g.velocity = 0; g.rotation = 0; g.time = 0; g.distance = 0; g.pipes = []; g.particles = []; g.shake = 0; g.flash = 0; g.milestone = 0;
      setScore(0); setIsNewBest(false); flightCountRef.current += 1; setFlightCount(flightCountRef.current); persist(g.best, g.settings); changeScreen('playing');
      if (fresh) g.flapAt = performance.now();
      g.velocity = -430; g.flapAt = performance.now(); tone('flap'); return;
    }
    if (g.screen !== 'playing') return;
    g.velocity = -430; g.flapAt = performance.now();
    for (let i = 0; i < 5; i++) g.particles.push({ x: 275 + Math.random() * 8, y: g.birdY + 5 + Math.random() * 16, vx: -40 - Math.random() * 90, vy: 10 + Math.random() * 75, life: .35 + Math.random() * .2, color: i % 2 ? '#ffe08a' : '#fff6d7' });
    tone('flap');
  }, [changeScreen, tone]);

  const start = useCallback(() => { endLock.current = 0; flap(); }, [flap]);
  const togglePause = useCallback(() => { if (world.current.screen === 'playing') changeScreen('paused'); else if (world.current.screen === 'paused') changeScreen('playing'); }, [changeScreen]);

  const updateSetting = (key: keyof Settings) => {
    const next = { ...settings, [key]: !settings[key] }; setSettings(next); world.current.settings = next; persist(best, next);
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf = 0, previous = 0;
    const loop = (stamp: number) => {
      const dt = previous ? Math.min((stamp - previous) / 1000, .033) : 0; previous = stamp;
      const g = world.current; if (g.screen !== 'paused') g.time += dt;
      if (g.screen === 'playing') {
        const difficulty = Math.min(g.score / 65, 1);
        const speed = 205 + difficulty * 62, gap = 184 - difficulty * 42;
        g.velocity = Math.min(g.velocity + 1120 * dt, 620); g.birdY += g.velocity * dt;
        const target = Math.max(-.34, Math.min(.95, g.velocity / 650)); g.rotation += (target - g.rotation) * Math.min(1, dt * 8);
        g.distance += speed * dt;
        if (!g.pipes.length || g.pipes[g.pipes.length - 1].x < 960 - (292 - difficulty * 28)) {
          const margin = 75 + gap / 2; const center = margin + Math.random() * (FLOOR - margin - 74);
          g.pipes.push({ x: 1000, center, gap, passed: false, moving: g.score >= 14 && Math.random() < .22, phase: Math.random() * Math.PI * 2 });
        }
        g.pipes.forEach(p => {
          p.x -= speed * dt;
          const drift = p.moving && !g.settings.reducedMotion ? Math.sin(g.time * .8 + p.phase) * 16 : 0;
          const cy = p.center + drift, top = cy - p.gap / 2, bottom = cy + p.gap / 2;
          if (!p.passed && p.x + 62 < 275) {
            p.passed = true; g.score += 1; setScore(g.score); tone('score'); g.flash = .12;
            if ([10, 25, 50, 100].includes(g.score)) { g.milestone = 1; g.flash = .24; }
          }
          const bx = 275, by = g.birdY + 19, radius = 14;
          if (bx + radius > p.x && bx - radius < p.x + 62 && (by - radius < top || by + radius > bottom)) g.screen = 'over';
        });
        g.pipes = g.pipes.filter(p => p.x > -80);
        if (g.birdY - 15 < 0 || g.birdY + 34 > FLOOR) g.screen = 'over';
        if (g.screen === 'over') {
          setScreen('over'); endLock.current = Date.now() + 260; tone('hit');
          const improved = g.score > g.best;
          if (improved) { g.best = g.score; setBest(g.score); setIsNewBest(true); persist(g.score, g.settings); tone('best'); }
          else setIsNewBest(false);
          if (g.settings.shake && !g.settings.reducedMotion) g.shake = .14;
        }
      } else if (g.screen === 'menu') g.birdY = 260 + Math.sin(g.time * 2.1) * 10;
      if (g.screen !== 'paused') {
        g.particles = g.particles.filter(p => p.life > 0);
        g.particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; });
        g.flash = Math.max(0, g.flash - dt); g.shake = Math.max(0, g.shake - dt);
      }
      drawWorld(ctx, g, W, H, FLOOR);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [persist, tone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); if (showSettings) return; if (screen === 'paused') togglePause(); else flap(); }
      if (e.code === 'Escape' || e.code === 'KeyP') { if (showSettings) setShowSettings(false); else togglePause(); }
      if (e.code === 'Enter' && (screen === 'menu' || screen === 'over')) start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap, screen, showSettings, start, togglePause]);

  return <main className="site-shell">
    <header className="topbar"><a className="brand" href="#home" aria-label="Sky Hopper home"><span className="brand-mark">✦</span><span>little sky studio</span></a><div className="top-actions"><span className="top-note"><i /> A tiny bird, a big sky</span><button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Settings">☼</button></div></header>
    <section className="game-layout" id="home">
      <div className="intro"><div className="eyebrow"><span className="eyebrow-line" /> AN ARCADE FLIGHT <span className="eyebrow-line" /></div><h1>Sky<br /><em>Hopper</em><span className="title-star">✳</span></h1><p className="lede">One little bird. One very big sky.<br />How far can you fly?</p><div className="intro-stats"><div><b>{String(best).padStart(2, '0')}</b><span>PERSONAL BEST</span></div><span className="stat-divider" /><div><b>{String(flightCount).padStart(2, '0')}</b><span>LIFETIME FLIGHTS</span></div></div><div className="tip"><span className="tip-icon">↗</span><span><b>A little tip</b><br />Small taps keep you steady.<br />Big flaps take you higher.</span></div></div>
      <div className="play-column"><div className="game-frame"><div className="frame-top"><span><i className="live-dot" /> SKY IS CLEAR</span><span>NO. {String(flightCount || 1).padStart(3, '0')}</span></div><div className="canvas-wrap">
        <canvas ref={canvasRef} width={W} height={H} aria-label="Sky Hopper flying game" onPointerDown={e => { if (screen === 'playing' || screen === 'menu' || screen === 'over') { e.preventDefault(); flap(); } }} />
        {screen === 'menu' && <div className="screen-overlay menu-overlay"><div className="sun-stamp">✦<small>GOOD<br />DAY</small></div><div className="menu-copy"><span className="tiny-label">YOUR ADVENTURE STARTS HERE</span><h2>Ready to<br /><em>take off?</em></h2><p>Flap through the floating ruins<br />and see where the wind takes you.</p><button className="play-button" onPointerDown={e => e.stopPropagation()} onClick={start}><span>LET’S FLY</span><span className="button-arrow">↗</span></button><div className="key-hint"><kbd>SPACE</kbd><span>or click anywhere</span></div></div><div className="menu-bird-label">PIP <span>✦</span> THE SKY SCOUT</div></div>}
        {screen === 'paused' && <div className="screen-overlay dim-overlay"><div className="pause-card"><span className="tiny-label">CATCH YOUR BREATH</span><h2>Flight<br /><em>paused.</em></h2><button className="play-button" onClick={togglePause}><span>RESUME FLIGHT</span><span className="button-arrow">↗</span></button><button className="text-button" onClick={start}>START OVER</button></div></div>}
        {screen === 'over' && <div className="screen-overlay dim-overlay"><div className="pause-card over-card"><span className="tiny-label">THAT WAS A LOVELY FLIGHT</span><h2>Back to<br /><em>earth.</em></h2>{isNewBest && <span className="new-best">✦ NEW PERSONAL BEST ✦</span>}<div className="results"><div><span>YOUR FLIGHT</span><b>{score}</b></div><div><span>PERSONAL BEST</span><b>{best}</b></div></div><button className="play-button" onPointerDown={e => e.stopPropagation()} onClick={start}><span>FLY AGAIN</span><span className="button-arrow">↗</span></button><div className="key-hint"><kbd>ENTER</kbd><span>or click to go again</span></div></div></div>}
        {screen === 'playing' && <><div className="hud-score">{score}<span>FLIGHT SCORE</span></div><button className="pause-button" onPointerDown={e => e.stopPropagation()} onClick={togglePause} aria-label="Pause">Ⅱ</button><div className="hud-best">BEST <b>{best}</b></div></>}
      </div><div className="frame-bottom"><span><i className="sound-dot" /> A LITTLE ADVENTURE BY LITTLE SKY STUDIO</span><span>EST. IN THE CLOUDS&nbsp; ✳</span></div></div><div className="below-game"><div className="controls"><span className="control-key"><kbd>SPACE</kbd> / <kbd>CLICK</kbd></span><span>to flap your wings</span></div><div className="sound-controls"><button onClick={() => setMuted(v => !v)}>{muted ? '♪̸' : '♫'} <span>{muted ? 'SOUND OFF' : 'SOUND ON'}</span></button><button onClick={() => setShowSettings(true)}>SETTINGS <span>↗</span></button></div></div></div>
    </section>
    <footer className="footer"><span>MADE FOR THE JOY OF A VERY GOOD FLAP</span><span>TAKE THE LONG WAY UP&nbsp; ↗</span></footer>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-panel" onClick={e => e.stopPropagation()}><button className="close-button" onClick={() => setShowSettings(false)}>×</button><span className="tiny-label">MAKE YOURSELF AT HOME</span><h2>Flight<br /><em>settings.</em></h2><div className="setting-row"><div><b>Sound effects</b><small>Soft little sounds for your flight</small></div><button className={`switch ${settings.sound ? 'active' : ''}`} onClick={() => updateSetting('sound')} aria-label="Toggle sound"><span /></button></div><div className="setting-row"><div><b>Screen shake</b><small>A tiny bump when you land</small></div><button className={`switch ${settings.shake ? 'active' : ''}`} onClick={() => updateSetting('shake')} aria-label="Toggle screen shake"><span /></button></div><div className="setting-row"><div><b>Reduced motion</b><small>Keep things calm and steady</small></div><button className={`switch ${settings.reducedMotion ? 'active' : ''}`} onClick={() => updateSetting('reducedMotion')} aria-label="Toggle reduced motion"><span /></button></div><p className="settings-foot">YOUR BEST FLIGHT AND SETTINGS LIVE ON THIS DEVICE.</p></section></div>}
  </main>;
}
