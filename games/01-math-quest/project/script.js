/* ======================================================
   MATH QUEST - El Cristal del Conocimiento
   Juego de plataformas 2D educativo (HTML5 Canvas + JS puro)
   ====================================================== */

// ---------------------------------------------------------
// 1) BANCO DE PREGUNTAS (1ro de secundaria)
//    3 sumas, 3 restas, 2 multiplicaciones, 2 divisiones
// ---------------------------------------------------------
const QUESTIONS = [
  { type: "Suma",           text: "47 + 36 = ?",   options: ["83", "73", "93", "82"],  correct: 0 },
  { type: "Suma",           text: "128 + 245 = ?", options: ["373", "363", "383", "372"], correct: 0 },
  { type: "Suma",           text: "56 + 19 = ?",   options: ["75", "65", "85", "74"],  correct: 0 },
  { type: "Resta",          text: "90 - 37 = ?",   options: ["53", "63", "43", "52"],  correct: 0 },
  { type: "Resta",          text: "154 - 78 = ?",  options: ["76", "86", "66", "75"],  correct: 0 },
  { type: "Resta",          text: "200 - 125 = ?", options: ["75", "85", "65", "70"],  correct: 0 },
  { type: "Multiplicación", text: "9 × 8 = ?",     options: ["72", "64", "81", "63"],  correct: 0 },
  { type: "Multiplicación", text: "15 × 4 = ?",    options: ["60", "54", "65", "50"],  correct: 0 },
  { type: "División",       text: "84 ÷ 7 = ?",    options: ["12", "14", "11", "13"],  correct: 0 },
  { type: "División",       text: "96 ÷ 6 = ?",    options: ["16", "14", "18", "15"],  correct: 0 },
];

// Baraja las opciones de cada pregunta una sola vez al cargar,
// re-calculando el índice correcto para no romper la lógica.
function shuffleOptions(q) {
  const correctText = q.options[q.correct];
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  q.options = opts;
  q.correct = opts.indexOf(correctText);
}
QUESTIONS.forEach(shuffleOptions);

// ---------------------------------------------------------
// 2) CONFIGURACIÓN DEL MUNDO / NIVEL
// ---------------------------------------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const CW = canvas.width;
const CH = canvas.height;
const GROUND_Y = 340;
const GRAVITY = 0.6;
const MOVE_SPEED = 4.2;
const JUMP_VELOCITY = -12.5;

const WORLD_WIDTH = 5300;

// Fosos (pits) que obligan a saltar
const PITS = [
  { x: 650, width: 90 },
  { x: 1610, width: 90 },
  { x: 2570, width: 90 },
  { x: 3530, width: 90 },
  { x: 4490, width: 90 },
];

function isPit(x) {
  return PITS.some(p => x >= p.x && x <= p.x + p.width);
}

// Bloques de pregunta, uno por cada pregunta del banco
const BLOCK_SIZE = 42;
const blockPositions = [300, 780, 1260, 1740, 2220, 2700, 3180, 3660, 4140, 4620];
const questionBlocks = blockPositions.map((x, i) => ({
  x,
  y: GROUND_Y - 130,
  size: BLOCK_SIZE,
  index: i,
  answered: false,
  correct: null, // true = acertado, false = fallado
}));

// Nubes decorativas (parallax)
const clouds = Array.from({ length: 14 }, (_, i) => ({
  x: i * 420 + Math.random() * 200,
  y: 40 + Math.random() * 90,
  scale: 0.7 + Math.random() * 0.8,
}));

// Objeto final: se convierte en Cristal (10/10 correctas) o Portal (si hubo errores)
const finalObject = { x: WORLD_WIDTH - 260, y: GROUND_Y - 90, size: 50 };

// Devuelve el estado del objeto final: 'none' | 'crystal' | 'portal'
function getFinalObjectState() {
  if (state.answeredCount < QUESTIONS.length) return "none";
  return state.score === QUESTIONS.length ? "crystal" : "portal";
}

// Dibuja un rectángulo "duro" alineado al pixel (sin antialiasing) para look retro
function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

// ---------------------------------------------------------
// 3) ESTADO DEL JUGADOR Y DEL JUEGO
// ---------------------------------------------------------
const player = {
  x: 60,
  y: GROUND_Y - 46,
  w: 30,
  h: 46,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
  animTick: 0,
};

let checkpoint = { x: player.x, y: player.y };

const state = {
  score: 0,
  answeredCount: 0,
  cameraX: 0,
  gameStarted: false,
  gameEnded: false,
  modalOpen: false,
  activeQuestionIndex: null,
  keys: { left: false, right: false, jump: false },
};

// ---------------------------------------------------------
// 4) INPUT (teclado + botones táctiles)
// ---------------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "a", "A"].includes(e.key)) state.keys.left = true;
  if (["ArrowRight", "d", "D"].includes(e.key)) state.keys.right = true;
  if (["ArrowUp", "w", "W", " "].includes(e.key)) {
    state.keys.jump = true;
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  if (["ArrowLeft", "a", "A"].includes(e.key)) state.keys.left = false;
  if (["ArrowRight", "d", "D"].includes(e.key)) state.keys.right = false;
  if (["ArrowUp", "w", "W", " "].includes(e.key)) state.keys.jump = false;
});

function bindTouchButton(id, key) {
  const btn = document.getElementById(id);
  const on = (e) => { e.preventDefault(); state.keys[key] = true; };
  const off = (e) => { e.preventDefault(); state.keys[key] = false; };
  btn.addEventListener("touchstart", on);
  btn.addEventListener("touchend", off);
  btn.addEventListener("mousedown", on);
  btn.addEventListener("mouseup", off);
  btn.addEventListener("mouseleave", off);
}
bindTouchButton("btn-left", "left");
bindTouchButton("btn-right", "right");
bindTouchButton("btn-jump", "jump");

// ---------------------------------------------------------
// 5) FÍSICA Y COLISIONES
// ---------------------------------------------------------
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updatePlayer() {
  // Movimiento horizontal
  if (state.keys.left) { player.vx = -MOVE_SPEED; player.facing = -1; }
  else if (state.keys.right) { player.vx = MOVE_SPEED; player.facing = 1; }
  else { player.vx = 0; }

  // Salto
  if (state.keys.jump && player.onGround) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
  }

  // Gravedad
  player.vy += GRAVITY;
  if (player.vy > 16) player.vy = 16;

  player.x += player.vx;
  player.y += player.vy;

  if (player.x < 0) player.x = 0;
  if (player.x > WORLD_WIDTH - player.w) player.x = WORLD_WIDTH - player.w;

  // Colisión con el suelo (si no está en un foso)
  player.onGround = false;
  const feetX = player.x + player.w / 2;
  if (!isPit(feetX) && player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  // Colisión con bloques de pregunta (se puede pisar por arriba)
  questionBlocks.forEach((b) => {
    const blockRect = { x: b.x, y: b.y, w: b.size, h: b.size };
    const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(playerRect, blockRect)) {
      // Aterrizar encima del bloque
      const cameFromAbove = player.vy >= 0 && (player.y + player.h - player.vy) <= b.y + 6;
      if (cameFromAbove) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
      if (!b.answered && !state.modalOpen && !state.gameEnded) {
        openQuestion(b.index);
      }
    }
  });

  // Caída a un foso -> respawn en el último checkpoint seguro
  if (player.y > CH + 60) {
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    player.vx = 0;
    player.vy = 0;
  }

  // Actualizar checkpoint cuando está a salvo en el suelo
  if (player.onGround && !isPit(player.x + player.w / 2)) {
    checkpoint = { x: player.x, y: GROUND_Y - player.h - 1 };
  }

  // Objeto final (cristal o portal)
  const finalState = getFinalObjectState();
  if (finalState !== "none") {
    const finalRect = { x: finalObject.x, y: finalObject.y, w: finalObject.size, h: finalObject.size };
    const playerRect2 = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(playerRect2, finalRect) && !state.gameEnded) {
      endGame(finalState === "crystal");
    }
  } else if (player.x + player.w >= finalObject.x - 40 && !state.modalOpen && toast.classList.contains("hidden")) {
    showToast(`Aún faltan ${QUESTIONS.length - state.answeredCount} desafíos por resolver`);
  }

  // Cámara sigue al jugador
  state.cameraX = player.x - CW / 2;
  if (state.cameraX < 0) state.cameraX = 0;
  if (state.cameraX > WORLD_WIDTH - CW) state.cameraX = WORLD_WIDTH - CW;

  if (player.vx !== 0 && player.onGround) player.animTick += 0.25;
}

// ---------------------------------------------------------
// 6) DIBUJO
// ---------------------------------------------------------
function drawBackground() {
  // Cielo con degradado por bandas (estilo retro, sin gradient suave)
  const skyBands = ["#87CEEB", "#8FD3EE", "#97D8F0", "#9FDDF2"];
  const bandH = CH / skyBands.length;
  skyBands.forEach((c, i) => px(0, i * bandH, CW, bandH + 1, c));

  // Sol pixelado fijo en la esquina (parallax leve)
  const sunX = CW - 90 - state.cameraX * 0.05;
  drawPixelSun(sunX, 55);

  // Nubes con parallax
  clouds.forEach((c) => {
    const sx = c.x - state.cameraX * 0.4;
    if (sx < -100 || sx > CW + 100) return;
    drawCloud(sx, c.y, c.scale);
  });

  // Colinas lejanas (silueta escalonada tipo 8-bit)
  for (let i = -1; i < 9; i++) {
    const hx = i * 340 - (state.cameraX * 0.55) % 340;
    drawPixelHill(hx, GROUND_Y, "#4f9a5e", "#3f7e4c");
  }
  for (let i = -1; i < 9; i++) {
    const hx = i * 340 + 170 - (state.cameraX * 0.75) % 340;
    drawPixelHill(hx, GROUND_Y, "#5aab68", "#4a8f55");
  }
}

// Sol simple hecho de bloques concéntricos
function drawPixelSun(x, y) {
  px(x - 18, y - 18, 36, 36, "#ffe27a");
  px(x - 12, y - 12, 24, 24, "#fff3b0");
  ctx.strokeStyle = "#e0b23a";
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.floor(x - 18) + 0.5, Math.floor(y - 18) + 0.5, 36, 36);
}

// Colina en "escalera de pixeles" (silueta 8-bit, sin curvas)
function drawPixelHill(cx, groundY, colorTop, colorShade) {
  const steps = [
    { w: 40, h: 14 },
    { w: 90, h: 30 },
    { w: 140, h: 46 },
    { w: 190, h: 58 },
    { w: 240, h: 66 },
  ];
  steps.forEach((s) => {
    px(cx - s.w / 2, groundY - s.h, s.w, s.h, colorTop);
  });
  // sombra inferior de la colina
  px(cx - 240 / 2, groundY - 14, 240, 14, colorShade);
}

// Nube hecha de bloques (pixel art), con sombra inferior
function drawCloud(x, y, s) {
  const u = 8 * s; // unidad de pixel de la nube
  const blocks = [
    [-2, 0, 6, 1], [-1, -1, 4, 1],
    [-3, 1, 8, 1], [-4, 2, 10, 1], [-3, 3, 8, 1],
  ];
  blocks.forEach(([bx, by, bw, bh]) => {
    px(x + bx * u, y + by * u, bw * u, bh * u, "#ffffff");
  });
  // sombra sutil debajo
  px(x - 3 * u, y + 3 * u, 8 * u, u, "#dfeffa");
}

function drawGround() {
  // Franjas de suelo, respetando los fosos
  let segStart = 0;
  const TILE = 20;
  const drawSeg = (x1, x2) => {
    const sx = x1 - state.cameraX;
    const w = x2 - x1;
    if (sx + w < 0 || sx > CW) return;

    // Tierra base
    px(sx, GROUND_Y, w, CH - GROUND_Y, "#8B5A2B");

    // Textura de tierra: puntitos oscuros/claros en cuadrícula
    for (let tx = 0; tx < w; tx += TILE) {
      for (let ty = 0; ty < CH - GROUND_Y; ty += TILE) {
        const seed = Math.floor((x1 + tx) / TILE + ty / TILE);
        if (seed % 5 === 0) px(sx + tx + 4, GROUND_Y + ty + 4, 4, 4, "#7a4d23");
        if (seed % 7 === 0) px(sx + tx + 12, GROUND_Y + ty + 10, 3, 3, "#9c6a38");
      }
    }

    // Pasto superior (dos tonos, en bloques)
    for (let tx = 0; tx < w; tx += TILE) {
      const seed = Math.floor((x1 + tx) / TILE);
      px(sx + tx, GROUND_Y, TILE, 10, seed % 2 === 0 ? "#4CAF50" : "#43a047");
      // brizna de pasto
      px(sx + tx + 6, GROUND_Y - 6, 3, 6, "#3d8b41");
      px(sx + tx + 13, GROUND_Y - 4, 3, 4, "#3d8b41");
    }
    // línea de contorno oscura entre pasto y tierra
    px(sx, GROUND_Y + 9, w, 2, "#3d6e2f");
  };
  const sortedPits = [...PITS].sort((a, b) => a.x - b.x);
  sortedPits.forEach((p) => {
    drawSeg(segStart, p.x);
    segStart = p.x + p.width;
  });
  drawSeg(segStart, WORLD_WIDTH);

  // Picos decorativos junto a los fosos (obstáculo visual), estilo pixel
  PITS.forEach((p) => {
    for (let side of [p.x - 26, p.x + p.width + 6]) {
      const sx = side - state.cameraX;
      if (sx < -30 || sx > CW + 30) continue;
      drawPixelSpike(sx, GROUND_Y);
    }
  });
}

// Pico/obstáculo tipo pixel-art (escalonado, no triángulo suave)
function drawPixelSpike(sx, groundY) {
  const rows = [
    { y: -18, x: 8, w: 4 },
    { y: -14, x: 6, w: 8 },
    { y: -10, x: 4, w: 12 },
    { y: -6, x: 2, w: 16 },
    { y: -2, x: 0, w: 20 },
  ];
  rows.forEach((r) => px(sx + r.x, groundY + r.y, r.w, 4, "#c0392b"));
  px(sx + 8, groundY - 18, 4, 4, "#e74c3c"); // brillo en la punta
}

function drawQuestionBlocks() {
  questionBlocks.forEach((b) => {
    const sx = b.x - state.cameraX;
    if (sx < -60 || sx > CW + 60) return;
    const s = b.size;

    // Poste que sostiene el bloque (con veta de madera pixelada)
    px(sx + s / 2 - 4, b.y + s, 8, GROUND_Y - (b.y + s), "#7a5230");
    px(sx + s / 2 - 4, b.y + s, 2, GROUND_Y - (b.y + s), "#5c3d21");

    if (b.answered) {
      const ok = b.correct === true;
      const base = ok ? "#4CAF50" : "#a12b2b";
      const dark = ok ? "#245c26" : "#5c1414";
      const light = ok ? "#7fe08a" : "#e0716f";

      px(sx, b.y, s, s, base);
      px(sx, b.y, s, 5, light);          // bisel superior claro
      px(sx, b.y + s - 5, s, 5, dark);   // bisel inferior oscuro
      px(sx, b.y, 5, s, light);
      px(sx + s - 5, b.y, 5, s, dark);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.floor(sx) + 1, Math.floor(b.y) + 1, s - 2, s - 2);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(ok ? "✓" : "✗", sx + s / 2, b.y + s / 2 + 8);
    } else {
      const pulse = Math.floor(2 * Math.sin(Date.now() / 250));
      const base = "#f5c542";
      px(sx - pulse, b.y - pulse, s + pulse * 2, s + pulse * 2, base);
      px(sx, b.y, s, 6, "#ffe27a");        // bisel superior claro
      px(sx, b.y + s - 6, s, 6, "#c98f1a"); // bisel inferior oscuro
      px(sx, b.y, 6, s, "#ffe27a");
      px(sx + s - 6, b.y, 6, s, "#c98f1a");
      // remaches decorativos en las esquinas
      px(sx + 5, b.y + 5, 3, 3, "#8a6300");
      px(sx + s - 8, b.y + 5, 3, 3, "#8a6300");
      px(sx + 5, b.y + s - 8, 3, 3, "#8a6300");
      px(sx + s - 8, b.y + s - 8, 3, 3, "#8a6300");
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.floor(sx) + 1, Math.floor(b.y) + 1, s - 2, s - 2);

      ctx.fillStyle = "#5a3d00";
      ctx.font = "bold 24px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("?", sx + s / 2, b.y + s / 2 + 9);
    }
  });
}

function drawFinalObject() {
  const sx = finalObject.x - state.cameraX;
  if (sx < -80 || sx > CW + 80) return;
  const finalState = getFinalObjectState();

  // Pedestal de piedra (bloques apilados, estilo 8-bit)
  const pedX = sx + finalObject.size / 2 - 20;
  px(pedX, GROUND_Y - 16, 40, 16, "#8a8a8a");
  px(pedX, GROUND_Y - 16, 40, 4, "#b5b5b5");
  px(pedX + 6, GROUND_Y - 10, 4, 4, "#6e6e6e");
  px(pedX + 30, GROUND_Y - 10, 4, 4, "#6e6e6e");
  ctx.strokeStyle = "#4a4a4a";
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.floor(pedX) + 1, GROUND_Y - 15, 38, 14);

  if (finalState === "none") return; // aún no se responden las 10 preguntas

  const bob = Math.round(Math.sin(Date.now() / 300) * 5);
  const cy = finalObject.y + bob;

  if (finalState === "crystal") {
    // --- CRISTAL DEL CONOCIMIENTO (10/10 correctas), estilo pixel facetado ---
    const cx = sx + finalObject.size / 2;
    ctx.save();
    ctx.shadowColor = "#7fd8ff";
    ctx.shadowBlur = 18;
    // facetas por bloques (más claro a la izquierda, más oscuro a la derecha)
    px(cx - 4, cy - 26, 8, 8, "#e8fbff");   // punta
    px(cx - 14, cy - 14, 12, 14, "#a9e8ff"); // faceta izq. superior
    px(cx + 2, cy - 14, 12, 14, "#4fb8e0");  // faceta der. superior
    px(cx - 12, cy, 10, 16, "#7fd8ff");      // faceta izq. inferior
    px(cx + 2, cy, 10, 16, "#2e93bd");       // faceta der. inferior
    px(cx - 3, cy + 16, 6, 8, "#1f7fa8");    // punta inferior
    ctx.strokeStyle = "#0c4a63";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 15, cy - 26, 30, 50);
    ctx.restore();
  } else {
    // --- PORTAL DE REINTENTO (hubo errores), anillos concéntricos pixelados ---
    const cx = sx + finalObject.size / 2;
    const cy2 = cy + finalObject.size / 2 - 6;
    ctx.save();
    ctx.shadowColor = "#a259ff";
    ctx.shadowBlur = 16;
    const rings = [
      { r: 26, c: "#c39bff" },
      { r: 20, c: "#8a4fe0" },
      { r: 14, c: "#5b28a8" },
      { r: 8, c: "#2b0a4a" },
    ];
    rings.forEach((ring) => {
      px(cx - ring.r * 0.7, cy2 - ring.r, ring.r * 1.4, ring.r * 2, ring.c);
    });
    ctx.strokeStyle = "#e6d6ff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 20, cy2 - 27, 40, 54);
    ctx.restore();
  }
}

function drawPlayer() {
  const sx = player.x - state.cameraX;
  const bounce = player.onGround ? Math.abs(Math.sin(player.animTick)) * 2 : 0;
  const py = Math.round(player.y - bounce);
  const walking = player.onGround && player.vx !== 0;
  const swing = walking ? Math.round(Math.sin(player.animTick) * 4) : 0;

  ctx.save();
  ctx.translate(Math.floor(sx) + player.w / 2, 0);
  ctx.scale(player.facing, 1);
  ctx.translate(-player.w / 2, 0);

  // --- Piernas y botas (con balanceo al caminar) ---
  const legBackShade = swing >= 0 ? "#1e3564" : "#2b4a8a";
  const legFrontShade = swing >= 0 ? "#2b4a8a" : "#1e3564";
  px(4 + swing, py + 34, 9, 6, legFrontShade);
  px(17 - swing, py + 34, 9, 6, legBackShade);
  px(4 + swing, py + 40, 9, 6, "#4a3319");
  px(17 - swing, py + 40, 9, 6, "#3a2712");
  px(4 + swing, py + 40, 9, 2, "#6b4a24"); // brillo bota frontal

  // --- Túnica (cuerpo) ---
  px(2, py + 21, 26, 11, "#e8563d");
  px(2, py + 21, 4, 11, "#f07a5f");   // luz lateral izquierda
  px(22, py + 21, 6, 11, "#c23f28"); // sombra lateral derecha
  // Cinturón con hebilla dorada
  px(2, py + 30, 26, 3, "#f5c542");
  px(13, py + 30, 4, 3, "#8a6300");

  // --- Brazo / manga con mano ---
  px(24, py + 22, 5, 9, "#c23f28");
  px(25, py + 30, 4, 3, "#f6c199");

  // --- Cuello ---
  px(11, py + 19, 8, 2, "#e0ab7d");

  // --- Cabeza ---
  px(6, py + 9, 18, 10, "#f6c199");
  px(6, py + 9, 3, 10, "#e0ab7d");   // sombra lateral del rostro
  px(17, py + 13, 3, 3, "#1c1c1c");  // ojo

  // --- Gorro / cabello ---
  px(6, py, 18, 4, "#3d2b1f");
  px(2, py + 4, 26, 5, "#3d2b1f");
  px(20, py + 5, 6, 3, "#56402c");   // brillo en la visera del gorro

  ctx.restore();
}

function render() {
  drawBackground();
  drawGround();
  drawQuestionBlocks();
  drawFinalObject();
  drawPlayer();
}

// ---------------------------------------------------------
// 7) BUCLE PRINCIPAL
// ---------------------------------------------------------
function gameLoop() {
  if (state.gameStarted && !state.gameEnded && !state.modalOpen) {
    updatePlayer();
  }
  render();
  requestAnimationFrame(gameLoop);
}

// ---------------------------------------------------------
// 8) PREGUNTAS / MODAL
// ---------------------------------------------------------
const modal = document.getElementById("question-modal");
const questionText = document.getElementById("question-text");
const questionZoneTitle = document.getElementById("question-zone-title");
const optionButtons = Array.from(document.querySelectorAll(".option-btn"));
const feedbackText = document.getElementById("feedback-text");

function openQuestion(index) {
  state.modalOpen = true;
  state.activeQuestionIndex = index;
  const q = QUESTIONS[index];

  questionZoneTitle.textContent = `Desafío ${index + 1} de ${QUESTIONS.length} · ${q.type}`;
  questionText.textContent = q.text;
  feedbackText.textContent = "";
  feedbackText.className = "";

  optionButtons.forEach((btn, i) => {
    btn.textContent = q.options[i];
    btn.disabled = false;
    btn.classList.remove("correct", "incorrect");
    btn.onclick = () => handleAnswer(i);
  });

  modal.classList.remove("hidden");
}

function handleAnswer(selectedIndex) {
  const index = state.activeQuestionIndex;
  const q = QUESTIONS[index];
  const block = questionBlocks[index];
  const isCorrect = selectedIndex === q.correct;

  optionButtons.forEach((btn) => (btn.disabled = true));
  optionButtons[q.correct].classList.add("correct");
  if (!isCorrect) optionButtons[selectedIndex].classList.add("incorrect");

  if (isCorrect) {
    state.score = Math.min(10, state.score + 1);
    feedbackText.textContent = "¡Correcto! Muy bien hecho 🎉";
    feedbackText.className = "correct-msg";
  } else {
    feedbackText.textContent = `Incorrecto. La respuesta correcta era ${q.options[q.correct]}.`;
    feedbackText.className = "incorrect-msg";
  }

  if (!block.answered) {
    block.answered = true;
    block.correct = isCorrect;
    state.answeredCount++;
  }

  updateHUD();

  setTimeout(() => {
    modal.classList.add("hidden");
    state.modalOpen = false;
    state.activeQuestionIndex = null;

    if (state.answeredCount >= QUESTIONS.length) {
      if (state.score === QUESTIONS.length) {
        showToast("¡Respondiste las 10 correctamente! El Cristal del Conocimiento apareció 💎");
      } else {
        showToast("Completaste el desafío, pero tuviste errores. Un portal ha aparecido...");
      }
    }
  }, 1400);
}

// ---------------------------------------------------------
// 9) HUD / TOAST / INICIO / FIN
// ---------------------------------------------------------
const scoreDisplay = document.getElementById("score-display");
const progressDisplay = document.getElementById("progress-display");
const toast = document.getElementById("toast");
let toastTimeout = null;

function updateHUD() {
  scoreDisplay.textContent = state.score;
  progressDisplay.textContent = state.answeredCount;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  void toast.offsetWidth; // reinicia la animación
  toast.style.animation = "none";
  requestAnimationFrame(() => {
    toast.style.animation = "";
  });
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), 2000);
}

const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  state.gameStarted = true;
});

const endScreen = document.getElementById("end-screen");
const endTitle = document.getElementById("end-title");
const endScoreEl = document.getElementById("end-score");
const endMessageEl = document.getElementById("end-message");
const restartBtn = document.getElementById("restart-btn");

function performanceMessage(score) {
  if (score >= 8) return "¡Muy buen desempeño! Dominas muy bien las matemáticas 🌟";
  if (score >= 6) return "¡Buen trabajo! Vas por buen camino, sigue practicando 💪";
  if (score >= 4) return "Puedes mejorar. Repasa las operaciones y vuelve a intentarlo 📘";
  return "Sigue practicando, ¡cada intento te hace más fuerte! 🔁";
}

function endGame(success) {
  state.gameEnded = true;
  endScoreEl.textContent = `Puntaje final: ${state.score} / 10`;

  if (success) {
    endTitle.textContent = "💎 ¡Cristal del Conocimiento Recuperado! 💎";
    endMessageEl.textContent = "¡Respondiste las 10 preguntas correctamente! Eres un verdadero Maestro de los Números 🧠✨";
  } else {
    endTitle.textContent = "🌀 El Cristal no pudo ser recuperado 🌀";
    endMessageEl.textContent =
      `No respondiste las 10 preguntas correctamente, así que el Cristal del Conocimiento sigue oculto. ` +
      `${performanceMessage(state.score)} ¡Cruza el portal de reintento y vuelve a intentarlo!`;
  }

  endScreen.classList.remove("hidden");
}

restartBtn.addEventListener("click", () => {
  window.location.reload();
});

// ---------------------------------------------------------
// 10) ARRANQUE
// ---------------------------------------------------------
updateHUD();
requestAnimationFrame(gameLoop);