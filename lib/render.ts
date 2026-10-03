export type Pipe = { x: number; center: number; gap: number; passed: boolean; moving: boolean; phase: number };
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
export type GameSettings = { sound: boolean; shake: boolean; reducedMotion: boolean };
export type World = { screen: string; birdY: number; velocity: number; rotation: number; flapAt: number; time: number; distance: number; score: number; best: number; pipes: Pipe[]; particles: Particle[]; shake: number; flash: number; milestone: number; settings: GameSettings };

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
};
const cloud = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) => {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#fff6e9'; ctx.beginPath();
  ctx.ellipse(x, y, 34 * s, 13 * s, 0, 0, Math.PI * 2); ctx.ellipse(x - 20 * s, y + 1 * s, 20 * s, 9 * s, 0, 0, Math.PI * 2); ctx.ellipse(x + 18 * s, y + 2 * s, 23 * s, 10 * s, 0, 0, Math.PI * 2); ctx.ellipse(x - 4 * s, y - 8 * s, 21 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};

function drawBird(ctx: CanvasRenderingContext2D, g: World) {
  const wing = Math.sin(g.time * 15 + (performance.now() - g.flapAt < 240 ? (performance.now() - g.flapAt) / 240 * Math.PI : 0));
  ctx.save(); ctx.translate(275, g.birdY + 19); ctx.rotate(g.rotation);
  // Two tiny tail feathers
  ctx.fillStyle = '#d7764f'; ctx.beginPath(); ctx.moveTo(-22, 1); ctx.lineTo(-37, -5); ctx.lineTo(-32, 4); ctx.lineTo(-39, 10); ctx.lineTo(-20, 8); ctx.fill();
  // Wing animation: three clear poses, with a little extra lift on each flap.
  const flapBoost = performance.now() - g.flapAt < 200 ? 1 : 0;
  const wingPose = Math.sin(g.time * (flapBoost ? 22 : 12));
  ctx.save(); ctx.translate(-3, 2); ctx.rotate(wingPose * .53 - .15);
  ctx.fillStyle = '#e78d56'; ctx.strokeStyle = '#b96148'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 7 + Math.abs(wingPose) * 4, -.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,223,164,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke(); ctx.restore();
  // round body and warm belly
  ctx.fillStyle = '#f4b35f'; ctx.strokeStyle = '#9d6650'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 23, 19, -.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffdc9a'; ctx.beginPath(); ctx.ellipse(3, 7, 13, 9, -.2, 0, Math.PI * 2); ctx.fill();
  // eye, brow, and little beak
  ctx.fillStyle = '#fffaf1'; ctx.beginPath(); ctx.ellipse(12, -7, 8.5, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#9d6650'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = '#263b46'; ctx.beginPath(); ctx.arc(15, -6, 3.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16, -7.4, 1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#9d6650'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(6, -17); ctx.quadraticCurveTo(12, -21, 18, -16); ctx.stroke();
  ctx.fillStyle = '#dc7651'; ctx.beginPath(); ctx.moveTo(21, -1); ctx.lineTo(33, 2); ctx.lineTo(21, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  // little cheek and feather crest
  ctx.fillStyle = '#dc8a64'; ctx.beginPath(); ctx.ellipse(8, 3, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ce7652'; ctx.beginPath(); ctx.moveTo(-3, -16); ctx.quadraticCurveTo(-9, -27, -13, -23); ctx.quadraticCurveTo(-13, -17, -7, -12); ctx.fill();
  ctx.restore();
}

function pillar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, capAtBottom: boolean, variation: number) {
  ctx.save();
  const base = variation ? '#789483' : '#a18b77', light = variation ? '#a3b397' : '#c8ae8d', dark = variation ? '#5d766c' : '#806d62';
  ctx.fillStyle = base; ctx.strokeStyle = '#665e58'; ctx.lineWidth = 2;
  rr(ctx, x + 7, y, w - 14, h, 3); ctx.fill(); ctx.stroke();
  // stone block seams
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.globalAlpha = .7;
  for (let yy = y + 18; yy < y + h; yy += 27) { ctx.beginPath(); ctx.moveTo(x + 9, yy); ctx.lineTo(x + w - 9, yy); ctx.stroke(); }
  for (let yy = y + 30; yy < y + h; yy += 54) { ctx.beginPath(); ctx.moveTo(x + 33, yy); ctx.lineTo(x + 33, yy + 27); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const capY = capAtBottom ? y + h - 17 : y;
  ctx.fillStyle = light; ctx.strokeStyle = '#665e58'; ctx.lineWidth = 2;
  rr(ctx, x, capY, w, 18, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,241,210,.36)'; rr(ctx, x + 5, capY + 3, w - 10, 3, 1); ctx.fill();
  if (variation) {
    ctx.fillStyle = '#788f6c'; ctx.beginPath(); ctx.ellipse(x + 16, capAtBottom ? y + h - 24 : y + 24, 9, 4, -.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + w - 19, capAtBottom ? y + h - 23 : y + 26, 4, 9);
  }
  ctx.restore();
}

export function drawWorld(ctx: CanvasRenderingContext2D, g: World, width: number, height: number, floor: number) {
  const palette = g.score < 20 ? ['#f7d9ad', '#a9ced0', '#728e9a'] : g.score < 40 ? ['#ecc4a1', '#91b8c2', '#647b91'] : g.score < 60 ? ['#deaa9b', '#8e9ba9', '#5b607a'] : ['#b9a6bd', '#647995', '#434f70'];
  const shakeY = g.shake > 0 && g.settings.shake && !g.settings.reducedMotion ? (Math.random() - .5) * 9 * (g.shake / .14) : 0;
  ctx.save(); ctx.translate(0, shakeY);
  const sky = ctx.createLinearGradient(0, 0, 0, floor); sky.addColorStop(0, palette[0]); sky.addColorStop(.55, palette[1]); sky.addColorStop(1, '#d5d5ba'); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  // Soft painted sunlight
  const sunX = 760, sunY = 105; const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 88); halo.addColorStop(0, 'rgba(255,248,208,.6)'); halo.addColorStop(1, 'rgba(255,248,208,0)'); ctx.fillStyle = halo; ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.arc(sunX, sunY, 28, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const x = ((i * 285 - g.distance * (.10 + i * .018)) % 1190 + 1190) % 1190 - 100;
    cloud(ctx, x, 105 + (i % 3) * 43, .78 + (i % 2) * .23, .5 + (i % 2) * .13);
  }
  // Distant hazy mountain silhouettes
  ctx.fillStyle = 'rgba(111,145,151,.27)'; ctx.beginPath(); ctx.moveTo(0, 343);
  for (let x = -50; x <= width + 90; x += 130) { const xx = x - (g.distance * .055 % 130); ctx.lineTo(xx + 62, 258 + Math.sin(x * .017) * 31); ctx.lineTo(xx + 130, 343); }
  ctx.lineTo(width, floor); ctx.lineTo(0, floor); ctx.fill();
  // Floating islands at mid-distance
  for (let i = 0; i < 4; i++) {
    const x = ((i * 330 - g.distance * .17) % 1260 + 1260) % 1260 - 180, y = 343 + (i % 2) * 29;
    ctx.fillStyle = '#89978a'; ctx.beginPath(); ctx.moveTo(x - 64, y); ctx.quadraticCurveTo(x, y - 24, x + 66, y); ctx.lineTo(x + 30, y + 28); ctx.lineTo(x + 5, y + 37); ctx.lineTo(x - 15, y + 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#668678'; ctx.fillRect(x - 35, y - 17, 7, 18); ctx.fillRect(x + 20, y - 27, 8, 28); ctx.fillStyle = '#b2a28a'; ctx.fillRect(x - 38, y - 20, 13, 4); ctx.fillRect(x + 16, y - 30, 16, 4);
  }
  // Distant birds as gentle flecks
  ctx.strokeStyle = 'rgba(77,100,105,.45)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) { const x = ((i * 221 - g.distance * .30) % 1150 + 1150) % 1150 - 80, y = 182 + (i % 3) * 27; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x, y - 5, x + 5, y); ctx.quadraticCurveTo(x + 10, y - 5, x + 15, y); ctx.stroke(); }
  // Ancient stone pairs. The same cap and masonry artwork repeats on both halves.
  g.pipes.forEach((p, i) => { const drift = p.moving && !g.settings.reducedMotion ? Math.sin(g.time * .8 + p.phase) * 16 : 0; const top = p.center + drift - p.gap / 2, bottom = p.center + drift + p.gap / 2; pillar(ctx, p.x, 0, 62, top, true, i % 3 === 2 ? 1 : 0); pillar(ctx, p.x, bottom, 62, floor - bottom, false, i % 3 === 2 ? 1 : 0); });
  // Ground strata scroll independently and keep a clear collision edge.
  ctx.fillStyle = '#788b78'; ctx.fillRect(0, floor, width, 12); ctx.fillStyle = '#a8a18a'; ctx.fillRect(0, floor + 4, width, 4);
  ctx.fillStyle = '#ad987e'; ctx.fillRect(0, floor + 12, width, height - floor - 12);
  const groundOffset = g.distance % 76;
  for (let x = -groundOffset; x < width + 76; x += 76) {
    ctx.fillStyle = '#867b6d'; ctx.fillRect(x, floor + 20, 69, 16); ctx.fillStyle = '#c6ae8a'; ctx.fillRect(x + 4, floor + 22, 60, 2);
    ctx.fillStyle = '#76906f'; ctx.beginPath(); ctx.ellipse(x + 18, floor + 7, 10, 4, -.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#93a37b'; ctx.beginPath(); ctx.ellipse(x + 34, floor + 6, 8, 3, .4, 0, Math.PI * 2); ctx.fill();
  }
  // Flap motes and collision sparks
  g.particles = g.particles.filter(p => p.life > 0);
  g.particles.forEach(p => { ctx.globalAlpha = Math.max(0, Math.min(1, p.life / .5)); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, 2.5 * Math.min(1, p.life * 4)), 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
  if (g.screen !== 'over') drawBird(ctx, g);
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,248,220,${g.flash * 1.2})`; ctx.fillRect(0, 0, width, floor); }
  ctx.restore();
}
