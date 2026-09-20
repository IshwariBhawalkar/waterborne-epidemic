/* ============================================================
   WATERBORNE EPIDEMICS — main script
   Features:
     - Hero WebGL-style particle canvas
     - Live death counter (real-time simulation based on WHO rate)
     - Contamination spread simulator (cellular automaton)
     - John Snow's map (interactive canvas reconstruction)
     - Animated counters
     - Scroll reveal
     - Chart.js bar chart
     - 5-question quiz with scoring
   ============================================================ */

const API_BASE = const API_BASE = 'https://waterborne-epidemic.onrender.com';
/* ============================================================
   NAVBAR
   ============================================================ */
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

/* ============================================================
   HERO CANVAS — particle network
   ============================================================ */
(function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let pts = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    buildParticles();
  }

  function buildParticles() {
    const n = Math.floor((canvas.width * canvas.height) / 10000);
    pts = Array.from({ length: n }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      r:  Math.random() * 1.6 + 0.4,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
      op: Math.random() * 0.4 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach((p, i) => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,200,240,${p.op})`;
      ctx.fill();

      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(0,200,240,${0.06 * (1 - d / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
})();

/* ============================================================
   LIVE DEATH COUNTER
   WHO estimate: ~2,000,000 deaths/year = ~5,479/day = ~3.8/min
   We show estimated deaths since midnight local time.
   ============================================================ */
(function initLiveCounter() {
  const el = document.getElementById('liveCounter');
  if (!el) return;

  const PER_SECOND = 2_000_000 / 365 / 24 / 3600; // ~0.0634

  function update() {
    const now   = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const secsSinceMidnight = (now - start) / 1000;
    const count = Math.floor(secsSinceMidnight * PER_SECOND);
    el.textContent = count.toLocaleString();
  }

  update();
  setInterval(update, 1000);
})();

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); });
}, { threshold: 0.1 });

document.querySelectorAll('.r').forEach(el => revealObs.observe(el));

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
const cntObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting && !e.target.dataset.done) {
      e.target.dataset.done = '1';
      animateNum(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(el => cntObs.observe(el));

function animateNum(el) {
  const target = parseInt(el.dataset.target, 10);
  const dur    = 1800;
  const t0     = performance.now();

  function tick(now) {
    const p  = Math.min((now - t0) / dur, 1);
    const ep = 1 - Math.pow(1 - p, 3);
    const v  = Math.floor(ep * target);

    if      (target >= 1e9) el.textContent = (v / 1e9).toFixed(1) + 'B+';
    else if (target >= 1e6) el.textContent = (v / 1e6).toFixed(1) + 'M+';
    else if (target >= 1e3) el.textContent = v.toLocaleString() + (p === 1 ? '+' : '');
    else                    el.textContent = v;

    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   CONTAMINATION SIMULATOR (Cellular automaton)
   ============================================================ */
(function initSimulator() {
  const canvas  = document.getElementById('simCanvas');
  if (!canvas) return;
  const ctx     = canvas.getContext('2d');
  const COLS    = 64, ROWS = 40;
  const CW      = canvas.width  / COLS;
  const CH      = canvas.height / ROWS;

  const STATE = { CLEAN: 0, INFECTED: 1, TREATING: 2, ISOLATED: 3 };
  const COLOR = {
    [STATE.CLEAN]:    '#003d2e',
    [STATE.INFECTED]: '#5a0019',
    [STATE.TREATING]: '#3d2e00',
    [STATE.ISOLATED]: '#0a1e35',
  };
  const PARTICLE_COLOR = {
    [STATE.CLEAN]:    '#00f5c0',
    [STATE.INFECTED]: '#ff3e6c',
    [STATE.TREATING]: '#ffb830',
    [STATE.ISOLATED]: '#2d4a60',
  };

  let grid      = [];
  let day       = 0;
  let running   = false;
  let simTimer  = null;
  let addMode   = false;

  function initGrid() {
    grid = [];
    for (let y = 0; y < ROWS; y++) {
      grid[y] = [];
      for (let x = 0; x < COLS; x++) {
        grid[y][x] = STATE.CLEAN;
      }
    }
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid background lines
    ctx.strokeStyle = 'rgba(0,200,240,0.06)';
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CW, 0);
      ctx.lineTo(x * CW, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CH);
      ctx.lineTo(canvas.width, y * CH);
      ctx.stroke();
    }

    // Cells
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const s = grid[y][x];
        // Background fill
        ctx.fillStyle = COLOR[s];
        ctx.fillRect(x * CW + 1, y * CH + 1, CW - 2, CH - 2);

        // Inner dot
        ctx.beginPath();
        ctx.arc(x * CW + CW / 2, y * CH + CH / 2, Math.min(CW, CH) * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = PARTICLE_COLOR[s];
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  function countStates() {
    let infected = 0, clean = 0;
    grid.forEach(row => row.forEach(s => {
      if (s === STATE.INFECTED) infected++;
      else if (s === STATE.CLEAN) clean++;
    }));
    document.getElementById('simInfected').textContent = infected;
    document.getElementById('simClean').textContent    = clean;
    document.getElementById('simDay').textContent      = day;
  }

  function step() {
    const next = grid.map(row => [...row]);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x] === STATE.INFECTED) {
          // Spread to neighbours (including diagonals) with some probability
          const neighbours = [
            [y-1,x],[y+1,x],[y,x-1],[y,x+1],
            [y-1,x-1],[y-1,x+1],[y+1,x-1],[y+1,x+1],
          ];
          neighbours.forEach(([ny, nx]) => {
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
              if (grid[ny][nx] === STATE.CLEAN && Math.random() < 0.18) {
                next[ny][nx] = STATE.INFECTED;
              }
            }
          });
        } else if (grid[y][x] === STATE.TREATING) {
          // Treating moves toward isolated (cleaned)
          if (Math.random() < 0.25) next[y][x] = STATE.ISOLATED;
        }
      }
    }
    grid = next;
    day++;
    drawGrid();
    countStates();

    // Check if all done
    const infected = grid.flat().filter(s => s === STATE.INFECTED).length;
    if (infected === 0) { stopSim(); }
  }

  function startSim() {
    if (running) return;
    running  = true;
    simTimer = setInterval(step, 220);
  }

  function stopSim() {
    running = false;
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
  }

  function addContamination(cellX, cellY) {
    if (cellX < 0 || cellX >= COLS || cellY < 0 || cellY >= ROWS) return;
    // Seed a cluster
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = cellY + dy, nx = cellX + dx;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && grid[ny][nx] === STATE.CLEAN) {
          grid[ny][nx] = STATE.INFECTED;
        }
      }
    }
    document.getElementById('simOverlay').classList.add('hide');
    if (!running) startSim();
    drawGrid();
    countStates();
  }

  canvas.addEventListener('click', e => {
    const rect  = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = Math.floor((e.clientX - rect.left) * scaleX / CW);
    const cy = Math.floor((e.clientY - rect.top)  * scaleY / CH);
    addContamination(cx, cy);
  });

  document.getElementById('btnContaminate').addEventListener('click', () => {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    addContamination(x, y);
  });

  document.getElementById('btnChlorinate').addEventListener('click', () => {
    // Convert infected cells to treating
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x] === STATE.INFECTED && Math.random() < 0.6) {
          grid[y][x] = STATE.TREATING;
        }
      }
    }
    drawGrid();
    countStates();
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    stopSim();
    day = 0;
    initGrid();
    drawGrid();
    countStates();
    document.getElementById('simOverlay').classList.remove('hide');
  });

  initGrid();
  drawGrid();
  countStates();
})();

/* ============================================================
   JOHN SNOW'S MAP — interactive canvas reconstruction
   578 deaths mapped relative to the Broad Street pump.
   ============================================================ */
(function initSnowMap() {
  const canvas = document.getElementById('snowMap');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ── Streets (simplified Soho grid) ─────────────────────────
  const streets = [
    // Broad Street (horizontal, roughly y=200)
    { x1: 60, y1: 200, x2: 660, y2: 200, name: 'Broad Street (now Broadwick St)' },
    // Oxford Street (top horizontal)
    { x1: 60, y1: 80, x2: 660, y2: 80, name: 'Oxford Street' },
    // Berwick Street (vertical, left)
    { x1: 130, y1: 50, x2: 130, y2: 450, name: 'Berwick Street' },
    // Marshall Street
    { x1: 240, y1: 50, x2: 240, y2: 450, name: 'Marshall Street' },
    // Poland Street
    { x1: 360, y1: 50, x2: 360, y2: 450, name: 'Poland Street' },
    // Wardour Street
    { x1: 480, y1: 50, x2: 480, y2: 450, name: 'Wardour Street' },
    // Regent Street
    { x1: 600, y1: 50, x2: 600, y2: 450, name: 'Regent Street area' },
    // Cross streets
    { x1: 60, y1: 140, x2: 660, y2: 140, name: '' },
    { x1: 60, y1: 260, x2: 660, y2: 260, name: '' },
    { x1: 60, y1: 340, x2: 660, y2: 340, name: '' },
    { x1: 60, y1: 420, x2: 660, y2: 420, name: '' },
  ];

  // ── The pump (source of contamination) ──────────────────────
  const pump = { x: 390, y: 200, label: 'Broad Street Pump\n(source of contamination)' };

  // ── Death clusters: [x, y, count] (Snow mapped 578 deaths) ─
  // These are placed to reflect the actual density gradient from Snow's map
  const clusters = [
    // Dense cluster around pump (Broad St east–west)
    [320,200,8],[350,200,10],[390,190,12],[410,200,9],[430,200,7],
    [370,185,6],[400,185,5],[380,200,8],[360,200,9],[340,200,7],
    // North of Broad Street
    [350,170,6],[370,160,5],[390,155,7],[410,165,6],[430,170,4],
    [360,145,4],[380,140,5],[400,140,6],[420,148,3],[440,145,3],
    [370,130,3],[390,125,4],[410,130,3],
    // South of Broad Street
    [360,215,5],[380,218,6],[400,220,7],[420,215,5],[440,218,4],
    [350,235,4],[370,240,5],[395,245,6],[415,240,4],[435,245,3],
    [360,260,3],[390,265,4],[420,260,3],
    // Scattered further away — fewer cases
    [270,200,3],[300,200,4],[290,185,2],[280,210,2],[310,175,2],
    [460,200,3],[500,200,2],[490,185,2],[510,215,2],
    [380,100,2],[400,100,2],[420,95,1],[360,95,2],
    [380,290,2],[400,295,1],[420,290,2],
    [300,140,2],[320,135,2],[340,140,2],[250,145,1],
    [460,145,2],[480,140,2],[500,145,1],
    [300,260,1],[320,265,2],[340,270,1],
    [460,265,1],[480,270,2],[500,260,1],
    // Poland Street workhouse — few deaths (had its own well)
    [360,170,1],[360,200,0],[360,220,1],
    // Brewery (Broad St) — almost no deaths (drank beer)
    [300,200,0],[310,200,1],[320,200,2],
  ];

  const tooltip = document.getElementById('mapTooltip');
  const deathCountEl = document.getElementById('mapDeathCount');

  let totalDrawn = 0;
  let revealIndex = 0;
  let allDots = []; // flat list of {x, y} for each individual death

  // Build individual dots from clusters
  clusters.forEach(([cx, cy, count]) => {
    for (let i = 0; i < count; i++) {
      // Scatter slightly within cluster
      allDots.push({
        x:     cx + (Math.random() - 0.5) * 22,
        y:     cy + (Math.random() - 0.5) * 22,
        drawn: false,
      });
    }
  });

  // Shuffle for a natural reveal order
  allDots.sort(() => Math.random() - 0.5);
  // Sort by distance from pump so spread looks like it radiates outward
  allDots.sort((a, b) => {
    const da = Math.hypot(a.x - pump.x, a.y - pump.y);
    const db = Math.hypot(b.x - pump.x, b.y - pump.y);
    return da - db;
  });

  function drawBase() {
    // Background
    ctx.fillStyle = '#040c18';
    ctx.fillRect(0, 0, W, H);

    // Streets
    streets.forEach(s => {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.strokeStyle = 'rgba(0,200,240,0.12)';
      ctx.lineWidth   = 8;
      ctx.stroke();

      // Street label
      if (s.name) {
        ctx.fillStyle = 'rgba(106,143,168,0.5)';
        ctx.font      = '10px Inter, sans-serif';
        ctx.fillText(s.name, s.x1 + 4, s.y1 - 4);
      }
    });
  }

  function drawDots(upTo) {
    for (let i = 0; i < upTo; i++) {
      const d = allDots[i];
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2);

      // Colour by distance from pump
      const dist = Math.hypot(d.x - pump.x, d.y - pump.y);
      const intensity = Math.max(0, 1 - dist / 180);
      ctx.fillStyle = `rgba(255,${Math.floor(62 + intensity * 40)},${Math.floor(108 - intensity * 60)},${0.65 + intensity * 0.35})`;
      ctx.fill();
    }
  }

  function drawPump() {
    // Glow
    const grad = ctx.createRadialGradient(pump.x, pump.y, 0, pump.x, pump.y, 30);
    grad.addColorStop(0, 'rgba(255,184,48,0.5)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pump.x, pump.y, 30, 0, Math.PI * 2);
    ctx.fill();

    // Pump dot
    ctx.beginPath();
    ctx.arc(pump.x, pump.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb830';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,184,48,0.8)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ffb830';
    ctx.font      = 'bold 11px Space Mono, monospace';
    ctx.fillText('PUMP', pump.x + 12, pump.y - 10);
  }

  function fullRedraw() {
    drawBase();
    drawDots(revealIndex);
    drawPump();
    deathCountEl.textContent = `${revealIndex} / ${allDots.length}`;
  }

  // Animate dot reveal
  function revealNext() {
    if (revealIndex < allDots.length) {
      revealIndex += 3;
      if (revealIndex > allDots.length) revealIndex = allDots.length;
      fullRedraw();
      setTimeout(revealNext, 30);
    }
  }

  // Start reveal when map scrolls into view
  const mapObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        revealNext();
        mapObs.disconnect();
      }
    });
  }, { threshold: 0.2 });

  mapObs.observe(canvas);

  // Tooltip on hover
  canvas.addEventListener('mousemove', e => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx     = (e.clientX - rect.left) * scaleX;
    const my     = (e.clientY - rect.top)  * scaleY;

    const dPump = Math.hypot(mx - pump.x, my - pump.y);
    if (dPump < 20) {
      tooltip.textContent = '40 Broad Street Pump — contamination source';
      tooltip.style.left  = (e.clientX - rect.left + 14) + 'px';
      tooltip.style.top   = (e.clientY - rect.top  - 10) + 'px';
      tooltip.style.opacity = '1';
    } else {
      // Check proximity to any dot
      const closest = allDots.slice(0, revealIndex).find(d =>
        Math.hypot(d.x - mx, d.y - my) < 8
      );
      if (closest) {
        const dist = Math.hypot(closest.x - pump.x, closest.y - pump.y).toFixed(0);
        tooltip.textContent = `Death recorded ~${dist}px from the pump`;
        tooltip.style.left  = (e.clientX - rect.left + 14) + 'px';
        tooltip.style.top   = (e.clientY - rect.top  - 10) + 'px';
        tooltip.style.opacity = '1';
      } else {
        tooltip.style.opacity = '0';
      }
    }
  });

  canvas.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

  // Initial draw
  fullRedraw();
})();

/* ============================================================
   CHART.JS — Global Impact
   ============================================================ */
window.addEventListener('load', () => {
  const el = document.getElementById('impactChart');
  if (!el || !window.Chart) return;

  new Chart(el, {
    type: 'bar',
    data: {
      labels: [
        'All diarrhoeal\ndisease',
        'Cholera',
        'Typhoid &\nparatyphoid',
        'Hepatitis A',
        'Crypto-\nsporidiosis',
        'Amoebiasis',
      ],
      datasets: [{
        label: 'Annual deaths (thousands)',
        data:  [1600, 95, 135, 8, 10, 70],
        backgroundColor: [
          'rgba(255,62,108,0.65)',
          'rgba(0,200,240,0.65)',
          'rgba(255,184,48,0.65)',
          'rgba(0,245,192,0.65)',
          'rgba(0,200,240,0.45)',
          'rgba(255,184,48,0.45)',
        ],
        borderColor: [
          'rgba(255,62,108,1)',
          'rgba(0,200,240,1)',
          'rgba(255,184,48,1)',
          'rgba(0,245,192,1)',
          'rgba(0,200,240,0.8)',
          'rgba(255,184,48,0.8)',
        ],
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive:  true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` ~${c.parsed.y.toLocaleString()}k deaths/year`,
          },
          backgroundColor: '#0a1e35',
          borderColor:     'rgba(0,200,240,0.3)',
          borderWidth:     1,
          titleColor:      '#eaf5fb',
          bodyColor:       '#6a8fa8',
          padding:         12,
        },
      },
      scales: {
        x: {
          ticks:  { color: '#6a8fa8', font: { size: 11, family: 'Inter' } },
          grid:   { color: 'rgba(0,200,240,0.06)' },
          border: { color: 'rgba(0,200,240,0.15)' },
        },
        y: {
          ticks:  { color: '#6a8fa8', font: { size: 11, family: 'Inter' }, callback: v => v + 'k' },
          grid:   { color: 'rgba(0,200,240,0.06)' },
          border: { color: 'rgba(0,200,240,0.15)' },
        },
      },
    },
  });
});

/* ============================================================
   QUIZ
   ============================================================ */
const quizData = [
  {
    q:  "In John Snow's 1854 investigation, what key observation pointed directly at the Broad Street pump as the source?",
    opts: [
      "All the victims had visited the same church in the previous week",
      "Workers at a nearby brewery, who drank beer instead of pump water, were mostly unaffected",
      "The water from the pump had a visible green tint from algae",
      "Snow identified Vibrio cholerae under a microscope",
    ],
    ans:  1,
    info: "The brewery workers were Snow's strongest evidence. They drew their own water on site and were largely spared. That observation pointed directly at the shared pump.",
  },
  {
    q:  "What was the primary pathway for E. coli contamination in the 2000 Walkerton outbreak?",
    opts: [
      "A broken sewage pipe directly under the town square",
      "Flooding from an industrial landfill near the water treatment plant",
      "Cattle farm runoff entering Well 5 through its inadequate casing during heavy rain",
      "A contaminated batch of water treatment chemicals from the supplier",
    ],
    ans:  2,
    info: "Heavy rainfall caused cattle manure runoff to infiltrate Well 5. The well had a shallow casing with no proper seal against surface water — a known vulnerability that was never addressed.",
  },
  {
    q:  "How many days passed between the Walkerton PUC receiving contaminated test results and a public boil water advisory being issued?",
    opts: ["Less than 24 hours", "About 4 days", "Two weeks", "No advisory was ever officially issued"],
    ans:  1,
    info: "Stan Koebel received test results showing dangerous E. coli levels on May 17th. A public advisory was not issued until May 21st — four days later, by which point most of the town had already been drinking the contaminated water.",
  },
  {
    q:  "Which waterborne pathogen is notably resistant to standard chlorine disinfection?",
    opts: ["Vibrio cholerae", "E. coli O157:H7", "Cryptosporidium", "Hepatitis A virus"],
    ans:  2,
    info: "Cryptosporidium forms oocysts that are highly resistant to chlorine. Water treatment plants dealing with this parasite need UV irradiation or ozone treatment in addition to standard chlorination.",
  },
  {
    q:  "What medical theory dominated before John Snow's work, and what did it claim caused disease?",
    opts: [
      "Germ theory — invisible microorganisms in food and water",
      "Miasma theory — 'bad air' rising from rotting organic matter",
      "Humour theory — imbalances in the body's four fluids",
      "Contagion theory — direct skin-to-skin contact with infected people",
    ],
    ans:  1,
    info: "Miasma theory held that diseases like cholera emanated from foul-smelling air near decaying matter. Snow challenging this — without germ theory, without a microscope showing the bacterium — using only observation and spatial reasoning was a remarkable scientific act.",
  },
];

let qIdx    = 0;
let qScore  = 0;
let qLocked = false;

function loadQ(i) {
  const d = quizData[i];
  document.getElementById('qIdx').textContent  = `Question ${i + 1} of ${quizData.length}`;
  document.getElementById('qBadge').textContent = `Score: ${qScore}`;
  document.getElementById('qProgress').style.width = `${(i / quizData.length) * 100}%`;
  document.getElementById('qText').textContent  = d.q;
  document.getElementById('qFeedback').textContent = '';
  document.getElementById('qFeedback').className   = 'q-feedback';
  document.getElementById('qNext').disabled    = true;
  document.getElementById('qNext').textContent = i === quizData.length - 1 ? 'See results' : 'Next';
  qLocked = false;

  const opts = document.getElementById('qOpts');
  opts.innerHTML = '';
  d.opts.forEach((text, n) => {
    const btn = document.createElement('button');
    btn.className   = 'q-opt';
    btn.innerHTML   = `<span class="q-letter">${String.fromCharCode(65 + n)}</span>${text}`;
    btn.addEventListener('click', () => selectOpt(n, btn));
    opts.appendChild(btn);
  });
}

function selectOpt(n, btn) {
  if (qLocked) return;
  qLocked = true;

  const d    = quizData[qIdx];
  const opts = document.querySelectorAll('.q-opt');
  opts.forEach(o => o.classList.add('disabled'));

  const feedEl = document.getElementById('qFeedback');

  if (n === d.ans) {
    btn.classList.add('correct');
    qScore++;
    feedEl.textContent  = 'Correct. ' + d.info;
    feedEl.className    = 'q-feedback ok';
  } else {
    btn.classList.add('wrong');
    opts[d.ans].classList.add('correct');
    feedEl.textContent  = 'Not quite. ' + d.info;
    feedEl.className    = 'q-feedback bad';
  }

  document.getElementById('qBadge').textContent    = `Score: ${qScore}`;
  document.getElementById('qNext').disabled = false;
}

document.getElementById('qNext').addEventListener('click', () => {
  qIdx++;
  if (qIdx < quizData.length) {
    loadQ(qIdx);
  } else {
    showResult();
  }
});

function showResult() {
  document.getElementById('qBody').style.display = 'none';
  document.getElementById('qFoot').style.display = 'none';
  document.getElementById('qProgress').style.width = '100%';

  const res = document.getElementById('qResult');
  res.classList.add('show');
  document.getElementById('qFinalScore').textContent = `${qScore}/${quizData.length}`;

  const pct = qScore / quizData.length;
  let title, desc;
  if (pct === 1)      { title = 'Perfect.';     desc = 'You absorbed every detail. John Snow would approve.'; }
  else if (pct >= .8) { title = 'Solid.';        desc = 'Strong result. One or two details to revisit.'; }
  else if (pct >= .6) { title = 'Good start.';   desc = 'You got the broad strokes. Worth re-reading the case studies.'; }
  else                { title = 'Keep going.';   desc = 'Scroll back through and try again. These details matter.'; }

  document.getElementById('qResultTitle').textContent = title;
  document.getElementById('qResultDesc').textContent  = desc;

  // Post to backend, silently
  fetch(`${API_BASE}/api/quiz/submit`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ score: qScore, total: quizData.length }),
  }).catch(() => {});
}

function resetQuiz() {
  qIdx = 0; qScore = 0; qLocked = false;
  document.getElementById('qBody').style.display  = '';
  document.getElementById('qFoot').style.display  = '';
  document.getElementById('qResult').classList.remove('show');
  loadQ(0);
}

loadQ(0);
