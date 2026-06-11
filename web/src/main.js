import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  authState,
  subscribe as subscribeAuth,
  init as initAuth,
  signInWithEmail,
  signOut,
} from './lib/auth.js';
import {
  loadRemoteState,
  saveRemoteState,
  saveProfile,
  flushPending as flushRemote,
} from './lib/db.js';
import { SURVEY_CONTENT } from './lib/survey-content/index.js';
import * as networkView from './lib/network-view.js';

// ----- Data -----
const PILLARS = [
  { n:1,  name:'Water',          metaphor:'The Bloodstream',       color:'#1a5276', icon:'', faClass:'fa-solid fa-droplet' },
  { n:2,  name:'Food',           metaphor:'The Stomach',           color:'#196f3d', icon:'', faClass:'fa-solid fa-utensils' },
  { n:3,  name:'Shelter',        metaphor:'The Skeleton',          color:'#784212', icon:'', faClass:'fa-solid fa-house' },
  { n:4,  name:'Energy',         metaphor:'The Heart',             color:'#f1c40f', icon:'', faClass:'fa-solid fa-bolt' },
  { n:5,  name:'Medicine',       metaphor:'The Immune System',     color:'#e74c3c', icon:'', faClass:'fa-solid fa-briefcase-medical' },
  { n:6,  name:'Communication',  metaphor:'The Nervous System',    color:'#3498db', icon:'', faClass:'fa-solid fa-tower-broadcast' },
  { n:7,  name:'Manufacturing',  metaphor:'The Hands',             color:'#e67e22', icon:'', faClass:'fa-solid fa-gears' },
  { n:8,  name:'Security',       metaphor:'The Skin',              color:'#2ecc71', icon:'', faClass:'fa-solid fa-shield-halved' },
  { n:9,  name:'Transportation', metaphor:'The Legs',              color:'#7f8c8d', icon:'', faClass:'fa-solid fa-truck' },
  { n:10, name:'Trade',          metaphor:'The Circulatory System',color:'#d4af37', icon:'', faClass:'fa-solid fa-scale-balanced' },
  { n:11, name:'Governance',     metaphor:'The Brain',             color:'#5b5ea6', icon:'', faClass:'fa-solid fa-gavel' },
  { n:12, name:'Knowledge',      metaphor:'The Memory',            color:'#48c9b0', icon:'', faClass:'fa-solid fa-book' },
  { n:13, name:'Culture',        metaphor:'The Soul',              color:'#9c27b0', icon:'', faClass:'fa-solid fa-masks-theater' },
];

const LAYERS = [
  { i:0, name:'Survival',     desc:'Zero prep. Grid is down. You have nothing. Improvise.' },
  { i:1, name:'Preparedness', desc:'Kit built. Supplies stocked. Training done. Ready.' },
  { i:2, name:'Stockpile',    desc:'Raw materials with trade value. Strategic reserves.' },
  { i:3, name:'Production',   desc:'Making things. 3D printing, kits, assemblies, repairs.' },
  { i:4, name:'Commerce',     desc:'Selling, drop-shipping, curating. Full product catalog.' },
  { i:5, name:'Teaching',     desc:'Classes, guides, installs, consulting. Knowledge transfer.' },
  { i:6, name:'Innovation',   desc:'Eureka-level breakthroughs. Category-defining work.' },
];

const PHASES = [
  { key:'none',    label:'Not started',  color:'#2a3340' },
  { key:'survive', label:'Survive',      color:'#e74c3c' },
  { key:'build',   label:'Build',        color:'#f1c40f' },
  { key:'scale',   label:'Scale',        color:'#2ecc71' },
];

// Survey copy is per-pillar-per-layer. See src/lib/survey-content/.

const PHASE_ORDER = ['none','survive','build','scale'];
const TOTAL_Q = PILLARS.length * LAYERS.length; // 91

// ----- State -----
const STORAGE_KEY = 'sovereignty-survey-v1';
let answers = {};      // key "pillar-layer" -> phase key
let descriptions = {}; // key "pillar-layer" -> free-text description
let hub = { name: '', email: '', imageDataUrl: '', link: '' };
let cursor = 0;        // 0..TOTAL_Q-1   (and TOTAL_Q for done screen)
let maxReached = 0;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    answers = obj.answers || {};
    descriptions = obj.descriptions || {};
    hub = obj.hub || { name: '', imageDataUrl: '', link: '' };
    cursor = obj.cursor ?? 0;
    maxReached = obj.maxReached ?? 0;
    activePillar = Math.min(Math.floor(cursor / LAYERS.length), PILLARS.length - 1);
  } catch (e) { /* ignore */ }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, descriptions, hub, cursor, maxReached }));
  // Reflect "has unsaved progress" state in the auth UI (chip visibility, etc.)
  if (typeof refreshAuthUI === 'function') refreshAuthUI();
  // Mirror survey state to Supabase when signed in. Debounced inside db.js.
  saveRemoteState({ answers, descriptions, cursor, maxReached });
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function answerKey(pIdx, lIdx) { return `${pIdx}-${lIdx}`; }
function questionAt(idx) {
  const pIdx = Math.floor(idx / LAYERS.length);
  const lIdx = idx % LAYERS.length;
  return { pIdx, lIdx, pillar: PILLARS[pIdx], layer: LAYERS[lIdx] };
}
function getAnswer(pIdx, lIdx) {
  return answers[answerKey(pIdx, lIdx)] || 'none';
}
function setAnswer(pIdx, lIdx, phase) {
  answers[answerKey(pIdx, lIdx)] = phase;
}
function countAnswered() {
  return Object.values(answers).filter(v => v && v !== 'none').length
       + Object.values(answers).filter(v => v === 'none').length;
}

// ----- Three.js -----
const vizEl = document.getElementById('viz');
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, 34, 4); // mostly top-down but slightly tilted so rotation feels natural
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
vizEl.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.enableRotate = true;      // drag to rotate
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 8;
controls.maxDistance = 70;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI * 0.49; // just shy of horizon, can't flip under
controls.target.set(0, 0, 0);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const dir = new THREE.DirectionalLight(0xffffff, 0.7);
dir.position.set(0, 30, 0);
scene.add(dir);

// Layout constants (top-down, flat in XZ plane, y is "up" but unused for layout)
const RING_RADIUS = 3.2;
const LAYER_LEN = 1.15;            // length of each layer segment along spoke (radial)
const LAYER_GAP = 0.08;            // gap between layer segments
const LANE_GAP = 0.04;             // gap between phase lanes
const SEG_THICKNESS = 0.25;        // y-axis (thickness viewed from above)
const NODE_LEN = 1.0;              // radial length of the node box
const NODE_GAP = 0.06;             // small gap between node and first layer bar
// Branch width is chosen so adjacent branches' inner corners just touch at the inner
// edge of the node. Geometry: W = 2 × r × tan(π / N), where r is the touch radius
// and N is the number of pillars.
const NODE_WIDTH = 2 * (RING_RADIUS - NODE_LEN / 2) * Math.tan(Math.PI / PILLARS.length);
const LANE_WIDTH = (NODE_WIDTH - 2 * LANE_GAP) / 3; // derived so 3 lanes + 2 gaps = NODE_WIDTH
const PHASE_COLORS = {
  survive: new THREE.Color('#e74c3c'),
  build:   new THREE.Color('#f1c40f'),
  scale:   new THREE.Color('#2ecc71'),
  none:    new THREE.Color('#2a3340'),
};

// Build ring
const ringGroup = new THREE.Group();
scene.add(ringGroup);

// Ring connecting line (circle)
{
  const ringPts = [];
  const N = 256;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS));
  }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
  const ringMat = new THREE.LineBasicMaterial({ color: 0x2a3340, transparent: true, opacity: 0.55 });
  ringGroup.add(new THREE.Line(ringGeo, ringMat));
}

// Per-pillar groups
const pillarNodes = []; // { node, branch, bars: [ {segs: [survive,build,scale]} ] x 7, labelSprite }
const allBarMeshes = []; // flat list for raycasting, each carries userData { pIdx, lIdx, phase }

function makeLabelSprite(text, color = '#e6edf3', size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
  // Fit the text inside ~92% of canvas width. Long names like
  // "6. Communication" or "9. Transportation" otherwise clip at both ends.
  const maxWidth = canvas.width * 0.92;
  let fontSize = 64;
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  let measured = ctx.measureText(text).width;
  if (measured > maxWidth) {
    fontSize = Math.max(36, Math.floor(fontSize * (maxWidth / measured)));
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 10;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(4, 1, 1);
  return spr;
}

function drawIcon(ctx, glyph, color, size, alpha = 1.0) {
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.globalAlpha = alpha;
  // glyph only — no backplate. Strong drop shadow keeps it legible on any background.
  ctx.font = `900 ${Math.round(size * 0.62)}px "Font Awesome 6 Free", "FontAwesome", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(glyph, size / 2, size / 2 + size * 0.03);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function makeIconSprite(p) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawIcon(ctx, p.icon, p.color, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(0.85, 0.85, 1);
  return { sprite: spr, canvas, ctx, tex };
}

PILLARS.forEach((p, pIdx) => {
  // angle 0 = top (north), going clockwise
  const angle = (pIdx / PILLARS.length) * Math.PI * 2 - Math.PI / 2;
  const cx = Math.cos(angle) * RING_RADIUS;
  const cz = Math.sin(angle) * RING_RADIUS;

  const group = new THREE.Group();
  scene.add(group);

  // Node box — same tangential width AND material as the bars so an inactive node
  // is visually indistinguishable from an inactive layer bar (just with an icon on top)
  const nodeGeo = new THREE.BoxGeometry(NODE_LEN, SEG_THICKNESS, NODE_WIDTH);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(p.color),
    emissive: new THREE.Color(p.color).multiplyScalar(0.5),
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    opacity: 0.85,
  });
  const node = new THREE.Mesh(nodeGeo, nodeMat);
  node.position.set(cx, 0, cz);
  node.rotation.y = -angle; // align with spoke direction (local +x = radially outward)
  group.add(node);

  // Spoke group anchored at ring node, rotated so local +X points outward
  const spoke = new THREE.Group();
  spoke.position.set(cx, 0, cz);
  spoke.rotation.y = -angle;
  group.add(spoke);

  // 7 layer segments along local +X, each with 3 phase lanes along local Z
  const bars = [];
  for (let l = 0; l < LAYERS.length; l++) {
    const xStart = NODE_LEN / 2 + NODE_GAP + l * (LAYER_LEN + LAYER_GAP);
    const xCenter = xStart + LAYER_LEN / 2;

    const barGroup = new THREE.Group();
    barGroup.position.set(xCenter, 0, 0);

    const segs = {};
    ['survive', 'build', 'scale'].forEach((phase, si) => {
      const geo = new THREE.BoxGeometry(LAYER_LEN, SEG_THICKNESS, LANE_WIDTH);
      const mat = new THREE.MeshStandardMaterial({
        color: PHASE_COLORS.none.clone(),
        emissive: 0x000000,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0.85,
      });
      const m = new THREE.Mesh(geo, mat);
      const zPos = (si - 1) * (LANE_WIDTH + LANE_GAP);
      m.position.set(0, 0, zPos);
      m.userData = { pIdx, lIdx: l, phase };
      barGroup.add(m);
      segs[phase] = m;
      allBarMeshes.push(m);
    });

    // small colored dot indicating this layer has a comment / description
    const commentDotGeo = new THREE.SphereGeometry(0.1, 12, 8);
    const commentDotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color) });
    const commentDot = new THREE.Mesh(commentDotGeo, commentDotMat);
    // sit just above the bar, off the side of the 3-lane block so it doesn't occlude phase color
    const dotOffsetZ = (LANE_WIDTH + LANE_GAP) * 1.5 + 0.18;
    commentDot.position.set(0, SEG_THICKNESS * 1.3, dotOffsetZ);
    commentDot.visible = false;
    commentDot.renderOrder = 5;
    barGroup.add(commentDot);

    spoke.add(barGroup);
    bars.push({ group: barGroup, segs, xCenter, commentDot });
  }

  // Icon sprite floating just above the node disc
  const iconObj = makeIconSprite(p);
  iconObj.sprite.position.set(cx, SEG_THICKNESS * 1.2, cz);
  group.add(iconObj.sprite);

  // Pillar label at outer end of spoke (in world coords)
  const spokeEnd = NODE_LEN / 2 + NODE_GAP + LAYERS.length * (LAYER_LEN + LAYER_GAP) + 0.55;
  const labelX = cx + Math.cos(angle) * spokeEnd;
  const labelZ = cz + Math.sin(angle) * spokeEnd;
  const labelSpr = makeLabelSprite(`${p.n}. ${p.name}`, '#ffffff');
  labelSpr.scale.set(3.4, 0.85, 1);
  labelSpr.position.set(labelX, 0.4, labelZ);
  group.add(labelSpr);

  pillarNodes.push({ pIdx, node, spoke, bars, labelSpr, iconObj, p, angle, cx, cz });
});

// Redraw icon sprites once the Font Awesome webfont finishes loading.
// We delegate to setFocus so each icon is drawn with the correct dim/active
// state instead of unconditionally repainting them at full color (which
// would otherwise wipe out the initial dimming applied by setFocus).
if (document.fonts && document.fonts.load) {
  document.fonts.load('900 64px "Font Awesome 6 Free"').then(() => {
    if (typeof setFocus === 'function') setFocus(focusedPIdx);
  }).catch(() => { /* font failed — sprites will show fallback */ });
}

// Center marker dot — hidden once a hub image is set
const centerDot = (() => {
  const geo = new THREE.CircleGeometry(0.5, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x2a3340, transparent: true, opacity: 0.7 });
  const dot = new THREE.Mesh(geo, mat);
  dot.rotation.x = -Math.PI / 2;
  scene.add(dot);
  return dot;
})();

// ---------- Hub image + name in the center of the ring ----------
// Image fills 65% of the inner ring area, leaving a generous gap to the branches.
const HUB_RADIUS = (RING_RADIUS - NODE_LEN / 2) * 0.65;

// Hub sprite lives in the main scene so it participates in depth testing —
// branches that are nearer the camera (when the ring tilts) correctly occlude
// the hub. The sprite stays visually upright no matter what `scene.rotation.y`
// does, because Sprites always face the camera (they have no inherited
// in-plane orientation to be rotated).
// One sprite renders image + name combined onto a single canvas. Sprites always
// face the camera, so the hub can never appear rotated regardless of what the
// scene or camera is doing.
const HUB_TEX_SIZE = 512;
const hubCanvas = document.createElement('canvas');
hubCanvas.width = hubCanvas.height = HUB_TEX_SIZE;
const hubCtx = hubCanvas.getContext('2d');
const hubTex = new THREE.CanvasTexture(hubCanvas);
hubTex.colorSpace = THREE.SRGBColorSpace;
hubTex.minFilter = THREE.LinearFilter;
hubTex.needsUpdate = true;

const hubSpriteMat = new THREE.SpriteMaterial({
  map: hubTex,
  transparent: true,
  depthTest: true,
  depthWrite: true,
});
const hubSprite = new THREE.Sprite(hubSpriteMat);
const hubDiameter = HUB_RADIUS * 2;
hubSprite.scale.set(hubDiameter, hubDiameter, 1);
hubSprite.position.set(0, 0, 0);
hubSprite.visible = false;
scene.add(hubSprite);

let hubImgEl = null; // cached <img> for the cropped photo

function paintHubCanvas() {
  hubCtx.clearRect(0, 0, HUB_TEX_SIZE, HUB_TEX_SIZE);
  const cx = HUB_TEX_SIZE / 2;
  const cy = HUB_TEX_SIZE / 2;
  const radius = HUB_TEX_SIZE / 2 - 2;
  // Clip everything to a circle so it reads as a round hub badge
  hubCtx.save();
  hubCtx.beginPath();
  hubCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  hubCtx.clip();
  // Image fill
  if (hubImgEl) {
    hubCtx.drawImage(hubImgEl, 0, 0, HUB_TEX_SIZE, HUB_TEX_SIZE);
  } else {
    hubCtx.fillStyle = '#1a2230';
    hubCtx.fillRect(0, 0, HUB_TEX_SIZE, HUB_TEX_SIZE);
  }
  // Name banner in the lower portion (so the image's center stays unobstructed)
  if (hub.name && hub.name.trim()) {
    const rectH = 72;
    const rectY = Math.round(HUB_TEX_SIZE * 0.66);
    const rectX = 30;
    const rectW = HUB_TEX_SIZE - 60;
    const r = 14;
    hubCtx.fillStyle = '#000';
    hubCtx.beginPath();
    hubCtx.moveTo(rectX + r, rectY);
    hubCtx.lineTo(rectX + rectW - r, rectY);
    hubCtx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + r);
    hubCtx.lineTo(rectX + rectW, rectY + rectH - r);
    hubCtx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - r, rectY + rectH);
    hubCtx.lineTo(rectX + r, rectY + rectH);
    hubCtx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - r);
    hubCtx.lineTo(rectX, rectY + r);
    hubCtx.quadraticCurveTo(rectX, rectY, rectX + r, rectY);
    hubCtx.closePath();
    hubCtx.fill();
    hubCtx.fillStyle = '#ffffff';
    hubCtx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
    hubCtx.textAlign = 'center';
    hubCtx.textBaseline = 'middle';
    const maxWidth = rectW - 24;
    let display = hub.name;
    while (display.length > 1 && hubCtx.measureText(display).width > maxWidth) {
      display = display.slice(0, -1);
    }
    if (display !== hub.name && display.length > 1) display = display.slice(0, -1) + '…';
    hubCtx.fillText(display, cx, rectY + rectH / 2);
  }
  hubCtx.restore();
  hubTex.needsUpdate = true;
}

function updateHubDisplay() {
  const hasName = hub.name && hub.name.trim();
  const hasImg = !!hub.imageDataUrl;
  if (!hasName && !hasImg) {
    hubSprite.visible = false;
    centerDot.visible = true;
    hubImgEl = null;
    return;
  }
  centerDot.visible = false;
  if (hasImg) {
    const img = new Image();
    // Once the avatar is uploaded, imageDataUrl is a Supabase Storage URL
    // (https://...). Without crossOrigin the image loads but taints the
    // canvas, and the resulting texture renders blank. Data URLs (fresh
    // crops before upload) ignore crossOrigin, so this is safe for both.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      hubImgEl = img;
      paintHubCanvas();
      hubSprite.visible = true;
    };
    img.onerror = () => { hubImgEl = null; paintHubCanvas(); hubSprite.visible = true; };
    img.src = hub.imageDataUrl;
  } else {
    hubImgEl = null;
    paintHubCanvas();
    hubSprite.visible = true;
  }
}

// Hover outline: a wireframe box sized to a single layer's 3-lane block,
// reparented to whichever layer the user is currently hovering.
const fullLayerWidth = LANE_WIDTH * 3 + LANE_GAP * 2;
const outlineGeo = new THREE.BoxGeometry(LAYER_LEN * 1.05, SEG_THICKNESS * 1.6, fullLayerWidth * 1.08);
const outlineEdges = new THREE.EdgesGeometry(outlineGeo);
const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
const outline = new THREE.LineSegments(outlineEdges, outlineMat);
outline.visible = false;
outline.renderOrder = 999;
scene.add(outline);

function showOutlineAt(pIdx, lIdx) {
  const pn = pillarNodes[pIdx];
  const bar = pn.bars[lIdx];
  // reparent so the outline inherits the bar group's full transform chain —
  // avoids double-applying the scene's rotation when scene.rotation.y is non-zero
  if (outline.parent !== bar.group) bar.group.add(outline);
  outline.position.set(0, 0, 0);
  outline.quaternion.identity();
  outline.visible = true;
}
function hideOutline() { outline.visible = false; }
// Outline is shown at the hovered layer if any, otherwise sticks to the
// currently-focused (cursor) layer.
function refreshOutline() {
  if (hoverState) {
    showOutlineAt(hoverState.pIdx, hoverState.lIdx);
  } else if (cursor < TOTAL_Q) {
    const { pIdx, lIdx } = questionAt(cursor);
    showOutlineAt(pIdx, lIdx);
  } else {
    hideOutline();
  }
}

// Raycaster wired to renderer.domElement
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
let hoverState = null; // { pIdx, lIdx } or null
let pointerDown = null;

function pickBar(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(allBarMeshes, false);
  return hits.length > 0 ? hits[0].object.userData : null;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  const hit = pickBar(e.clientX, e.clientY);
  if (hit) {
    if (!hoverState || hoverState.pIdx !== hit.pIdx || hoverState.lIdx !== hit.lIdx) {
      hoverState = { pIdx: hit.pIdx, lIdx: hit.lIdx };
      refreshOutline();
    }
    renderer.domElement.style.cursor = 'pointer';
  } else {
    if (hoverState) { hoverState = null; refreshOutline(); }
    renderer.domElement.style.cursor = pickHub(e.clientX, e.clientY) ? 'pointer' : '';
  }
});
renderer.domElement.addEventListener('pointerleave', () => {
  hoverState = null; refreshOutline();
  renderer.domElement.style.cursor = '';
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
});
function pickHub(clientX, clientY) {
  if (!hub.link || !hub.link.trim()) return false;
  if (!hubSprite.visible) return false;
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  return raycaster.intersectObject(hubSprite, false).length > 0;
}

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!pointerDown) return;
  const dx = Math.abs(e.clientX - pointerDown.x);
  const dy = Math.abs(e.clientY - pointerDown.y);
  const dt = performance.now() - pointerDown.t;
  pointerDown = null;
  // only treat as click if pointer barely moved (otherwise OrbitControls handled a drag)
  if (dx > 5 || dy > 5 || dt > 500) return;
  const hit = pickBar(e.clientX, e.clientY);
  if (hit) {
    activePillar = hit.pIdx;
    cursor = hit.pIdx * LAYERS.length + hit.lIdx;
    maxReached = Math.max(maxReached, cursor);
    saveState();
    hoverState = null;
    renderPillarView();
    showPopupForLayer(hit.pIdx, hit.lIdx);
    // Scroll the clicked layer card into view in the panel
    const card = qbody.querySelector(`.layer-card[data-lidx="${hit.lIdx}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (pickHub(e.clientX, e.clientY)) {
    let url = hub.link.trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
});

// Highlight currently-focused pillar
let focusedPIdx = -1;
const INACTIVE_COLOR = new THREE.Color('#2a3340');

function pillarHasAnyAnswer(pIdx) {
  for (let l = 0; l < LAYERS.length; l++) {
    if (answers[answerKey(pIdx, l)] !== undefined && answers[answerKey(pIdx, l)] !== 'none') return true;
  }
  return false;
}

function setFocus(pIdx) {
  focusedPIdx = pIdx;
  pillarNodes.forEach((pn, i) => {
    const focused = (i === pIdx);
    const hasAny = pillarHasAnyAnswer(i);
    const baseColor = hasAny ? new THREE.Color(pn.p.color) : INACTIVE_COLOR;
    // gentle uniform lift on Y only — doesn't distort the rectangular node footprint
    pn.node.scale.set(1, focused ? 1.6 : 1.0, 1);
    pn.node.material.color.copy(baseColor);
    pn.node.material.emissive.copy(hasAny ? baseColor.clone().multiplyScalar(0.5) : new THREE.Color(0x000000));
    pn.node.material.emissiveIntensity = hasAny ? (focused ? 1.6 : 0.6) : 0;
    pn.node.material.transparent = true;
    pn.node.material.opacity = hasAny ? 1.0 : 0.55;
    pn.labelSpr.material.opacity = focused ? 1.0 : (hasAny ? 0.75 : 0.3);
    // redraw icon — white reads cleanly against the colored node;
    // muted gray for inactive (no answers yet)
    const iconColor = hasAny ? '#ffffff' : '#5b6d82';
    drawIcon(pn.iconObj.ctx, pn.p.icon, iconColor, pn.iconObj.canvas.width, hasAny ? 1.0 : 0.5);
    pn.iconObj.tex.needsUpdate = true;
  });
}

function updateViz() {
  pillarNodes.forEach((pn, pIdx) => {
    pn.bars.forEach((bar, lIdx) => {
      const phase = getAnswer(pIdx, lIdx);
      const litUntil = PHASE_ORDER.indexOf(phase); // 0=none, 1=survive, 2=build, 3=scale
      ['survive', 'build', 'scale'].forEach((ph, si) => {
        const m = bar.segs[ph];
        const isLit = (si + 1) <= litUntil;
        const targetColor = isLit ? PHASE_COLORS[ph] : PHASE_COLORS.none;
        m.material.color.copy(targetColor);
        m.material.emissive.copy(isLit ? PHASE_COLORS[ph].clone().multiplyScalar(0.35) : new THREE.Color(0x000000));
        m.material.opacity = isLit ? 1.0 : 0.55;
        m.material.needsUpdate = true;
      });
      // comment indicator: show pillar-colored dot if this layer has a description
      const desc = descriptions[answerKey(pIdx, lIdx)];
      bar.commentDot.visible = !!(desc && desc.trim());
    });
  });
  // re-evaluate node coloring (answers may have changed)
  if (typeof focusedPIdx !== 'undefined') setFocus(focusedPIdx);
}

// ----- Camera animation: rotate scene so target pillar sits at "north"
// and ease the camera back to a full top-down view --------------------
let animState = null;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function focusPillarAnimated(pIdx, duration = 700) {
  const pn = pillarNodes[pIdx];
  // we want pillar at angle θ to land at world angle -π/2 (north / -Z)
  // after scene rotation by α, point at angle θ moves to θ - α, so α = θ + π/2
  const targetYaw = pn.angle + Math.PI / 2;

  let dy = (targetYaw - scene.rotation.y) % (Math.PI * 2);
  if (dy > Math.PI) dy -= Math.PI * 2;
  else if (dy < -Math.PI) dy += Math.PI * 2;

  const currentDist = camera.position.distanceTo(controls.target);
  const endDist = Math.max(20, Math.min(40, currentDist)); // preserve zoom within sane range
  const endPos = new THREE.Vector3(0, endDist, 0.001);
  const endTarget = new THREE.Vector3(0, 0, 0);

  // skip if everything's already where we want it
  const alreadyThere =
    Math.abs(dy) < 0.005 &&
    camera.position.distanceTo(endPos) < 0.05 &&
    controls.target.distanceTo(endTarget) < 0.05;
  if (alreadyThere) return;

  animState = {
    startTime: performance.now(),
    duration,
    startYaw: scene.rotation.y,
    endYaw: scene.rotation.y + dy,
    startPos: camera.position.clone(),
    endPos,
    startTarget: controls.target.clone(),
    endTarget,
  };
  controls.enabled = false;
}

function resize() {
  const w = vizEl.clientWidth;
  const h = vizEl.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ----- Popup that floats next to a clicked layer in the viz -----------
const vizPopup = document.getElementById('viz-popup');
const vpIconEl = vizPopup.querySelector('.vp-icon');
const vpTitleEl = vizPopup.querySelector('.vp-title');
const vpBodyEl = vizPopup.querySelector('.vp-body');
let popupTarget = null; // { pIdx, lIdx }

function updatePopupPosition() {
  if (!popupTarget) return;
  const pn = pillarNodes[popupTarget.pIdx];
  const bar = pn.bars[popupTarget.lIdx];
  bar.group.updateMatrixWorld(true);
  // Anchor at the OUTER edge of the bar (local +x = radially outward).
  // The popup always sits to the right of this anchor in screen space,
  // vertically centered with the bar — independent of how the scene
  // is rotated.
  const centerWorld = new THREE.Vector3().setFromMatrixPosition(bar.group.matrixWorld);
  const outerWorld = new THREE.Vector3(LAYER_LEN / 2, 0, 0).applyMatrix4(bar.group.matrixWorld);
  const ndcCenter = centerWorld.clone().project(camera);
  const ndcOuter = outerWorld.clone().project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  // Horizontal: just past the bar's outer edge.
  // Vertical: use the bar's CENTER projection. The outer-edge point
  // projects to a slightly different screen y because of the camera tilt,
  // which made the popup look misaligned with the bar.
  const ox = (ndcOuter.x * 0.5 + 0.5) * rect.width;
  const cy = (1 - (ndcCenter.y * 0.5 + 0.5)) * rect.height;
  const MARGIN = 36;
  vizPopup.style.left = `${ox + MARGIN}px`;
  vizPopup.style.top = `${cy}px`;
  vizPopup.style.transform = 'translate(0, -50%)';
  vizPopup.style.opacity = (ndcCenter.z > 1) ? '0' : '1';
}

function showPopupForLayer(pIdx, lIdx) {
  const desc = descriptions[answerKey(pIdx, lIdx)];
  if (!desc || !desc.trim()) { hidePopup(); return; }
  const pillar = PILLARS[pIdx];
  const layer = LAYERS[lIdx];
  vpIconEl.className = `vp-icon ${pillar.faClass}`;
  vpIconEl.style.color = pillar.color;
  vpTitleEl.textContent = `${pillar.name} · ${layer.name}`;
  vpBodyEl.textContent = desc;
  popupTarget = { pIdx, lIdx };
  vizPopup.hidden = false;
  updatePopupPosition();
}

function hidePopup() {
  popupTarget = null;
  vizPopup.hidden = true;
}

vizPopup.querySelector('.vp-close').addEventListener('click', hidePopup);

function loop() {
  if (animState) {
    const t = Math.min(1, (performance.now() - animState.startTime) / animState.duration);
    const e = easeInOutCubic(t);
    scene.rotation.y = animState.startYaw + (animState.endYaw - animState.startYaw) * e;
    camera.position.lerpVectors(animState.startPos, animState.endPos, e);
    controls.target.lerpVectors(animState.startTarget, animState.endTarget, e);
    camera.lookAt(controls.target);
    if (t >= 1) {
      animState = null;
      controls.enabled = true;
      controls.update();
    }
  } else {
    controls.update();
  }
  if (popupTarget) updatePopupPosition();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

// ----- UI -----
const qbody = document.getElementById('qbody');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');
const progressMarker = document.getElementById('progress-marker');
const progressTicks = document.getElementById('progress-ticks');
const progressPillarLabel = document.getElementById('progress-pillar');
const pillarScoreEl = document.getElementById('pillar-score');
const ptextCount = document.getElementById('ptext-count');
const resetBtn = document.getElementById('reset');
const pillarTabsEl = document.getElementById('pillar-tabs');

let activePillar = 0; // which pillar tab is selected (0-12)

function hasAnswer(pIdx, lIdx) {
  return answers[answerKey(pIdx, lIdx)] !== undefined;
}

// Count answered layers for a pillar
function pillarAnsweredCount(pIdx) {
  let count = 0;
  for (let l = 0; l < LAYERS.length; l++) {
    const v = answers[answerKey(pIdx, l)];
    if (v && v !== 'none') count++;
  }
  return count;
}

// Total answered across all pillars
function totalAnswered() {
  let count = 0;
  for (let p = 0; p < PILLARS.length; p++) {
    count += pillarAnsweredCount(p);
  }
  return count;
}

// Build pillar tab bar
function buildPillarTabs() {
  const frag = document.createDocumentFragment();
  PILLARS.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'pillar-tab';
    btn.dataset.idx = i;
    btn.innerHTML = `<i class="${p.faClass}" aria-hidden="true"></i><span>${p.name}</span><span class="tab-pip"></span>`;
    btn.addEventListener('click', () => selectPillar(i));
    frag.appendChild(btn);
  });
  pillarTabsEl.appendChild(frag);
}
buildPillarTabs();

function updateTabStates() {
  pillarTabsEl.querySelectorAll('.pillar-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === activePillar);
    tab.style.color = i === activePillar ? PILLARS[i].color : '';
    tab.classList.toggle('has-answers', pillarAnsweredCount(i) > 0);
  });
}

function scrollTabIntoView(pIdx) {
  const tab = pillarTabsEl.children[pIdx];
  if (tab) tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

// Build the 91 tick marks once (major every 7 = pillar boundary)
(function buildTicks() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i <= TOTAL_Q; i++) {
    const t = document.createElement('div');
    t.className = 'tick' + (i % LAYERS.length === 0 ? ' major' : '');
    t.style.left = `${(i / TOTAL_Q) * 100}%`;
    frag.appendChild(t);
  }
  progressTicks.appendChild(frag);
})();

// Build 13 per-pillar progress segments, each with its own colored fill
const pillarFills = [];
(function buildPillarSegments() {
  const frag = document.createDocumentFragment();
  const segPct = 100 / PILLARS.length;
  PILLARS.forEach((p, pIdx) => {
    const seg = document.createElement('div');
    seg.className = 'pseg';
    seg.style.left = `${pIdx * segPct}%`;
    seg.style.width = `${segPct}%`;
    const fill = document.createElement('div');
    fill.className = 'pseg-fill';
    fill.style.background = p.color;
    seg.appendChild(fill);
    frag.appendChild(seg);
    pillarFills.push(fill);
  });
  progressBar.appendChild(frag);
})();

function paintPillarFills() {
  for (let p = 0; p < PILLARS.length; p++) {
    const filled = pillarAnsweredCount(p);
    pillarFills[p].style.width = `${(filled / LAYERS.length) * 100}%`;
  }
}

function updateProgress() {
  const pillar = PILLARS[activePillar];
  const answered = totalAnswered();
  const pillarAns = pillarAnsweredCount(activePillar);

  paintPillarFills();

  // Position marker at active pillar center
  const pct = ((activePillar + 0.5) / PILLARS.length) * 100;
  progressMarker.style.left = `${pct}%`;
  progressPillarLabel.textContent = `Pillar ${pillar.n} · ${pillar.name}`;
  pillarScoreEl.textContent = `${pillarAns} / ${LAYERS.length} layers · ${answered} / ${TOTAL_Q} total`;
  ptextCount.textContent = `${answered} / ${TOTAL_Q}`;
}

function selectPillar(pIdx) {
  activePillar = pIdx;
  // Update cursor to match (for persistence compatibility)
  cursor = pIdx * LAYERS.length;
  maxReached = Math.max(maxReached, cursor);
  saveState();
  hidePopup();
  renderPillarView();
}

function renderPillarView() {
  const pIdx = activePillar;
  const pillar = PILLARS[pIdx];

  setFocus(pIdx);
  focusPillarAnimated(pIdx);
  refreshOutline();
  updateTabStates();
  scrollTabIntoView(pIdx);

  // Build all 7 layer cards
  let html = `
    <div class="pillar-heading">
      <i class="${pillar.faClass}" style="color:${pillar.color}" aria-hidden="true"></i>
      <h2 style="color:${pillar.color}">${pillar.name}</h2>
      <span class="pillar-metaphor">${escapeHtml(pillar.metaphor)}</span>
    </div>
  `;

  LAYERS.forEach((layer, lIdx) => {
    const qKey = answerKey(pIdx, lIdx);
    const current = answers[qKey] || 'none';
    const hasAns = current !== 'none';
    const descVal = descriptions[qKey] || '';
    const ctx = SURVEY_CONTENT[pIdx]?.[lIdx];
    const qdescText = ctx?.qdesc || layer.desc;

    // Phase color for border
    const phaseColor = current === 'scale' ? 'var(--scale)'
                     : current === 'build' ? 'var(--build)'
                     : current === 'survive' ? 'var(--survive)'
                     : 'transparent';
    const phaseLabel = current !== 'none' ? current.charAt(0).toUpperCase() + current.slice(1) : '';
    const badgeColor = current === 'scale' ? 'var(--scale)'
                     : current === 'build' ? 'var(--build)'
                     : current === 'survive' ? 'var(--survive)'
                     : 'var(--muted)';

    html += `
      <div class="layer-card ${hasAns ? 'has-answer' : ''}" style="border-left-color:${phaseColor}" data-pidx="${pIdx}" data-lidx="${lIdx}">
        <div class="layer-card-header">
          <span class="layer-num">L${layer.i}</span>
          <span class="layer-name">${layer.name}</span>
          ${phaseLabel ? `<span class="layer-phase-badge" style="color:${badgeColor};border:1px solid ${badgeColor}">${phaseLabel}</span>` : ''}
        </div>
        <div class="layer-qdesc">${escapeHtml(qdescText)}</div>
        <div class="phase-row">
          ${PHASES.map(ph => `<button class="phase-btn ph-${ph.key} ${current === ph.key ? 'active' : ''}" data-phase="${ph.key}" data-pidx="${pIdx}" data-lidx="${lIdx}">${ph.label}</button>`).join('')}
        </div>
        <textarea class="layer-desc ${hasAns ? 'visible' : ''}" data-key="${qKey}" placeholder="Notes on ${escapeHtml(pillar.name.toLowerCase())} · ${escapeHtml(layer.name.toLowerCase())}…">${escapeHtml(descVal)}</textarea>
      </div>
    `;
  });

  qbody.innerHTML = html;

  // Wire up phase buttons
  qbody.querySelectorAll('.phase-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phase = btn.dataset.phase;
      const pi = parseInt(btn.dataset.pidx);
      const li = parseInt(btn.dataset.lidx);
      const qKey = answerKey(pi, li);
      const card = btn.closest('.layer-card');
      const wasActive = btn.classList.contains('active');

      if (wasActive) {
        // Toggle off
        delete answers[qKey];
      } else {
        setAnswer(pi, li, phase);
      }
      saveState();
      updateViz();
      updateTabStates();
      updateProgress();

      // Re-render just this card's buttons + badge
      const newPhase = answers[qKey] || 'none';
      const hasAns = newPhase !== 'none';
      card.querySelectorAll('.phase-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.phase === newPhase);
      });
      card.classList.toggle('has-answer', hasAns);
      const badge = card.querySelector('.layer-phase-badge');
      const descArea = card.querySelector('.layer-desc');
      const phColor = newPhase === 'scale' ? 'var(--scale)'
                    : newPhase === 'build' ? 'var(--build)'
                    : newPhase === 'survive' ? 'var(--survive)'
                    : 'transparent';
      card.style.borderLeftColor = phColor;

      if (hasAns) {
        const label = newPhase.charAt(0).toUpperCase() + newPhase.slice(1);
        if (badge) {
          badge.textContent = label;
          badge.style.color = phColor;
          badge.style.borderColor = phColor;
        } else {
          const headerEl = card.querySelector('.layer-card-header');
          const newBadge = document.createElement('span');
          newBadge.className = 'layer-phase-badge';
          newBadge.style.color = phColor;
          newBadge.style.borderColor = phColor;
          newBadge.textContent = label;
          headerEl.appendChild(newBadge);
        }
        descArea.classList.add('visible');
      } else {
        if (badge) badge.remove();
        descArea.classList.remove('visible');
        card.style.borderLeftColor = 'transparent';
      }
    });
  });

  // Wire up description textareas
  qbody.querySelectorAll('.layer-desc').forEach(ta => {
    let debounce = null;
    ta.addEventListener('input', () => {
      const key = ta.dataset.key;
      descriptions[key] = ta.value;
      // Parse pIdx/lIdx from key
      const [pi, li] = key.split('-').map(Number);
      pillarNodes[pi].bars[li].commentDot.visible = !!ta.value.trim();
      clearTimeout(debounce);
      debounce = setTimeout(() => saveState(), 250);
    });
  });

  updateProgress();

  // Nav buttons
  prevBtn.disabled = activePillar === 0;
  nextBtn.disabled = activePillar === PILLARS.length - 1;
  nextBtn.textContent = activePillar === PILLARS.length - 1 ? 'Summary →' : 'Next Pillar →';
  prevBtn.textContent = '← Prev Pillar';
}

prevBtn.addEventListener('click', () => {
  if (activePillar > 0) {
    selectPillar(activePillar - 1);
    qbody.scrollTop = 0;
  }
});
nextBtn.addEventListener('click', () => {
  if (activePillar < PILLARS.length - 1) {
    selectPillar(activePillar + 1);
    qbody.scrollTop = 0;
  }
});
resetBtn.addEventListener('click', () => {
  if (!confirm('Reset all answers and start over?')) return;
  answers = {}; descriptions = {}; cursor = 0; maxReached = 0; activePillar = 0;
  saveState();
  hidePopup();
  updateViz();
  renderPillarView();
});

// ---------- Hub settings modal + circle image cropper ----------
const hubModal = document.getElementById('hub-modal');
const hubNameInput = document.getElementById('hub-name-input');
const hubEmailInput = document.getElementById('hub-email-input');
const hubLinkInput = document.getElementById('hub-link-input');
const hubImageInput = document.getElementById('hub-image-input');
const hubImageClearBtn = document.getElementById('hub-image-clear');
const hubCancelBtn = document.getElementById('hub-cancel');
const hubSaveBtn = document.getElementById('hub-save');
const hubSignedInRow = document.getElementById('hub-signed-in-row');
const hubSignedInEmail = document.getElementById('hub-signed-in-email');
const hubSignOutBtn = document.getElementById('hub-sign-out');
const profileBtn = document.getElementById('profile-toggle');
const networkBtn = document.getElementById('network-toggle');
networkBtn.addEventListener('click', () => { networkView.open(); });
const unsavedChip = document.getElementById('unsaved-chip');
const authModal = document.getElementById('auth-modal');
const authEmailInput = document.getElementById('auth-email-input');
const authStatusEl = document.getElementById('auth-status');
const authSendBtn = document.getElementById('auth-send');
const authCancelBtn = document.getElementById('auth-cancel');
const cropperCanvas = document.getElementById('cropper-canvas');
const cropperWrap = document.getElementById('cropper-wrap');
const cropperPlaceholder = document.getElementById('cropper-placeholder');
const cropperZoom = document.getElementById('cropper-zoom');

class CircleCropper {
  constructor(canvas, wrap) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
    this.img = null;
    this.x = 0; this.y = 0;
    this.baseScale = 1;
    this.scale = 1;
    this.dragging = false;
    this._bindEvents();
  }
  reset() {
    this.img = null;
    this.x = this.y = 0;
    this.scale = 1;
    this.ctx.clearRect(0, 0, this.size, this.size);
  }
  loadImageElement(img) {
    this.img = img;
    const sx = this.size / img.width;
    const sy = this.size / img.height;
    this.baseScale = Math.max(sx, sy); // cover
    this.scale = 1;
    this.x = this.y = 0;
    this.draw();
  }
  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => { this.loadImageElement(img); resolve(); };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  loadFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      if (!dataUrl) { this.reset(); resolve(); return; }
      const img = new Image();
      img.onload = () => { this.loadImageElement(img); resolve(); };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
  setZoom(s) { this.scale = s; this.draw(); }
  draw() {
    this.ctx.clearRect(0, 0, this.size, this.size);
    if (!this.img) return;
    const s = this.baseScale * this.scale;
    const w = this.img.width * s;
    const h = this.img.height * s;
    const cx = this.size / 2 + this.x;
    const cy = this.size / 2 + this.y;
    this.ctx.drawImage(this.img, cx - w / 2, cy - h / 2, w, h);
  }
  exportDataUrl(outSize = 512) {
    if (!this.img) return '';
    const out = document.createElement('canvas');
    out.width = out.height = outSize;
    const octx = out.getContext('2d');
    const ratio = outSize / this.size;
    const s = this.baseScale * this.scale * ratio;
    const w = this.img.width * s;
    const h = this.img.height * s;
    const cx = outSize / 2 + this.x * ratio;
    const cy = outSize / 2 + this.y * ratio;
    octx.fillStyle = '#000';
    octx.fillRect(0, 0, outSize, outSize);
    octx.drawImage(this.img, cx - w / 2, cy - h / 2, w, h);
    return out.toDataURL('image/jpeg', 0.85);
  }
  _bindEvents() {
    let startX = 0, startY = 0, baseX = 0, baseY = 0;
    const onMove = (e) => {
      if (!this.dragging) return;
      const cx = e.clientX, cy = e.clientY;
      this.x = baseX + (cx - startX);
      this.y = baseY + (cy - startY);
      this.draw();
    };
    const onUp = () => {
      this.dragging = false;
      this.wrap.classList.remove('dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.img) return;
      e.preventDefault();
      this.dragging = true;
      this.wrap.classList.add('dragging');
      startX = e.clientX; startY = e.clientY;
      baseX = this.x; baseY = this.y;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
    // scroll-to-zoom on the cropper canvas
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.img) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const next = Math.max(0.5, Math.min(4, this.scale + delta));
      cropperZoom.value = next;
      this.setZoom(next);
    }, { passive: false });
  }
}

const cropper = new CircleCropper(cropperCanvas, cropperWrap);

function openHubModal() {
  hubNameInput.value = hub.name || '';
  hubEmailInput.value = hub.email || '';
  hubLinkInput.value = hub.link || '';
  cropperZoom.value = 1;
  if (hub.imageDataUrl) {
    cropper.loadFromDataUrl(hub.imageDataUrl).then(() => {
      cropperZoom.disabled = false;
      cropperPlaceholder.hidden = true;
    });
  } else {
    cropper.reset();
    cropperZoom.disabled = true;
    cropperPlaceholder.hidden = false;
  }
  hubModal.hidden = false;
  setTimeout(() => hubNameInput.focus(), 30);
}
function closeHubModal() {
  hubModal.hidden = true;
}

// Profile-icon click routes by auth state: signed-in → hub modal, else → sign-in modal
profileBtn.addEventListener('click', () => {
  if (authState.status === 'signed-in') openHubModal();
  else openAuthModal();
});
// The unsaved-changes chip is a shortcut to the same sign-in flow
unsavedChip.addEventListener('click', openAuthModal);
hubCancelBtn.addEventListener('click', closeHubModal);
hubModal.querySelector('.modal-backdrop').addEventListener('click', closeHubModal);

// --- Auth modal handlers ---
function openAuthModal() {
  authEmailInput.value = authState.user?.email || '';
  authStatusEl.textContent = '';
  authStatusEl.classList.remove('ok', 'err');
  authSendBtn.disabled = false;
  authModal.hidden = false;
  setTimeout(() => authEmailInput.focus(), 30);
}
function closeAuthModal() { authModal.hidden = true; }

authCancelBtn.addEventListener('click', closeAuthModal);
authModal.querySelector('.modal-backdrop').addEventListener('click', closeAuthModal);
authEmailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); authSendBtn.click(); }
});
authSendBtn.addEventListener('click', async () => {
  const email = authEmailInput.value.trim();
  if (!email) {
    authStatusEl.textContent = 'Type your email first.';
    authStatusEl.classList.remove('ok'); authStatusEl.classList.add('err');
    return;
  }
  authSendBtn.disabled = true;
  authStatusEl.classList.remove('ok', 'err');
  authStatusEl.textContent = 'Sending magic link…';
  const result = await signInWithEmail(email);
  authSendBtn.disabled = false;
  if (result.error) {
    authStatusEl.classList.add('err');
    authStatusEl.textContent = result.error;
  } else {
    authStatusEl.classList.add('ok');
    authStatusEl.textContent = `Check your inbox at ${email} and click the link to sign in.`;
  }
});

// Sign out from the hub modal
hubSignOutBtn.addEventListener('click', async () => {
  await signOut();
  closeHubModal();
});

// --- Auth-driven UI sync ---
function refreshAuthUI() {
  if (!unsavedChip || !profileBtn) return;
  const signedIn = authState.status === 'signed-in';
  const hasAnswers = answers && Object.keys(answers).length > 0;
  // Chip: only when signed-out AND there's local progress that hasn't been synced
  unsavedChip.hidden = signedIn || !hasAnswers;
  // Pip on the profile icon
  profileBtn.classList.toggle('signed-in', signedIn);
  // Signed-in row inside the hub modal
  if (signedIn) {
    hubSignedInRow.hidden = false;
    hubSignedInEmail.textContent = authState.user?.email || '';
  } else {
    hubSignedInRow.hidden = true;
  }
}

// Track which user we've already hydrated from the server, so the subscribe
// callback (which fires on every state change) only syncs once per sign-in.
let syncedUserId = null;

async function hydrateFromRemote() {
  const remote = await loadRemoteState();
  if (!remote) return;

  const localHasAnswers = answers && Object.keys(answers).length > 0;
  const remoteHasAnswers = Object.keys(remote.answers || {}).length > 0;

  if (!remoteHasAnswers && localHasAnswers) {
    // First sign-in with pre-existing local progress: push it up so the
    // user doesn't lose what they did while signed-out.
    saveRemoteState({ answers, descriptions, cursor, maxReached });
    await saveProfile(hub).then((res) => {
      if (res?.ok && res.imageDataUrl) {
        hub.imageDataUrl = res.imageDataUrl;
        saveState();
      }
    });
  } else {
    // Remote wins: adopt the server snapshot.
    answers      = remote.answers;
    descriptions = remote.descriptions;
    cursor       = remote.cursor;
    maxReached   = remote.maxReached;
    hub          = remote.hub;
    activePillar = Math.min(Math.floor(cursor / LAYERS.length), PILLARS.length - 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, descriptions, hub, cursor, maxReached }));
  }
  updateViz();
  updateHubDisplay();
  updateProgress();
  renderPillarView();
  refreshAuthUI();
}

subscribeAuth((state) => {
  refreshAuthUI();
  // If a magic link just landed and the auth modal is open, close it
  if (state.status === 'signed-in' && authModal && !authModal.hidden) {
    closeAuthModal();
  }
  // One-shot hydrate per signed-in user
  if (state.status === 'signed-in' && state.user?.id && state.user.id !== syncedUserId) {
    syncedUserId = state.user.id;
    hydrateFromRemote().catch((e) => console.error('[main] hydrate failed', e));
  }
  if (state.status === 'signed-out') {
    syncedUserId = null;
  }
});

// Flush pending survey writes before the tab goes away.
window.addEventListener('beforeunload', () => { flushRemote(); });

hubImageInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    await cropper.loadFromFile(file);
    cropperZoom.value = 1;
    cropperZoom.disabled = false;
    cropperPlaceholder.hidden = true;
  } catch (err) {
    console.error('image load failed', err);
  }
});

hubImageClearBtn.addEventListener('click', () => {
  cropper.reset();
  cropperZoom.value = 1;
  cropperZoom.disabled = true;
  cropperPlaceholder.hidden = false;
  hubImageInput.value = '';
});

cropperZoom.addEventListener('input', () => {
  cropper.setZoom(parseFloat(cropperZoom.value));
});

hubSaveBtn.addEventListener('click', async () => {
  hub.name = hubNameInput.value.trim();
  hub.email = hubEmailInput.value.trim();
  hub.link = hubLinkInput.value.trim();
  hub.imageDataUrl = cropper.img ? cropper.exportDataUrl(512) : '';
  saveState();
  updateHubDisplay();
  closeHubModal();
  // Push to Supabase if signed in. Avatar (if any) gets uploaded to Storage
  // and imageDataUrl is rewritten to the public URL so we don't re-upload
  // on every subsequent save.
  if (authState.status === 'signed-in') {
    const res = await saveProfile(hub);
    if (res?.ok && res.imageDataUrl && res.imageDataUrl !== hub.imageDataUrl) {
      hub.imageDataUrl = res.imageDataUrl;
      saveState();
      updateHubDisplay();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!hubModal.hidden) closeHubModal();
  if (!authModal.hidden) closeAuthModal();
});

// ---------- Mobile panel-resize drag handle ----------
const appEl = document.getElementById('app');
const resizeHandle = document.getElementById('panel-resize');
const VIZ_H_KEY = 'sovereignty-viz-h-v1';
const PANEL_COLLAPSED_KEY = 'sovereignty-panel-collapsed-v1';
const COLLAPSE_THRESHOLD_PX = 80;     // if panel size drops below this, collapse on release
const DEFAULT_RESTORE_VIZ_H = '50vh'; // height to restore to after un-collapsing

(function loadVizHeight() {
  if (localStorage.getItem(PANEL_COLLAPSED_KEY) === '1') {
    appEl.classList.add('panel-collapsed');
    return;
  }
  const saved = localStorage.getItem(VIZ_H_KEY);
  if (!saved) return;
  const px = parseInt(saved, 10);
  if (!Number.isFinite(px)) return;
  const clamped = Math.max(120, Math.min(window.innerHeight - 160, px));
  document.documentElement.style.setProperty('--mobile-viz-h', clamped + 'px');
})();

function setPanelCollapsed(state) {
  if (state) {
    appEl.classList.add('panel-collapsed');
    localStorage.setItem(PANEL_COLLAPSED_KEY, '1');
  } else {
    appEl.classList.remove('panel-collapsed');
    localStorage.removeItem(PANEL_COLLAPSED_KEY);
    // restore to saved height, or default
    const saved = localStorage.getItem(VIZ_H_KEY);
    const px = parseInt(saved, 10);
    const restore = (Number.isFinite(px) && px > 120) ? (px + 'px') : DEFAULT_RESTORE_VIZ_H;
    document.documentElement.style.setProperty('--mobile-viz-h', restore);
  }
  resize();
}

let resizeDragging = false;
let resizeStartY = 0;
let resizeStartVizH = 0;
let resizePointerMoved = false;

resizeHandle.addEventListener('pointerdown', (e) => {
  if (getComputedStyle(resizeHandle).display === 'none') return;
  e.preventDefault();
  resizeDragging = true;
  resizePointerMoved = false;
  resizeStartY = e.clientY;
  // if collapsed, viz already spans the full viewport (resize bar lives inside it)
  resizeStartVizH = appEl.classList.contains('panel-collapsed')
    ? window.innerHeight
    : vizEl.clientHeight;
  resizeHandle.classList.add('dragging');
  document.body.style.cursor = 'ns-resize';
  resizeHandle.setPointerCapture(e.pointerId);
});

resizeHandle.addEventListener('pointermove', (e) => {
  if (!resizeDragging) return;
  const dy = e.clientY - resizeStartY;
  if (Math.abs(dy) > 3) resizePointerMoved = true;
  const minViz = 120;
  const maxViz = Math.max(minViz, window.innerHeight - 60);
  const newVizH = Math.max(minViz, Math.min(maxViz, resizeStartVizH + dy));
  // dragging always exits collapsed visual state while in motion
  if (appEl.classList.contains('panel-collapsed')) appEl.classList.remove('panel-collapsed');
  document.documentElement.style.setProperty('--mobile-viz-h', newVizH + 'px');
  resize();
});

const endResize = (e) => {
  if (!resizeDragging) return;
  resizeDragging = false;
  resizeHandle.classList.remove('dragging');
  document.body.style.cursor = '';
  try { resizeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
  // If this was a click (no real movement) on the chevron, expand back
  const wasCollapsed = localStorage.getItem(PANEL_COLLAPSED_KEY) === '1';
  if (!resizePointerMoved && wasCollapsed) {
    setPanelCollapsed(false);
    return;
  }
  // After a drag: if the panel area is now too small, collapse it off-screen
  // (resize bar sits inside viz, so panelHeight is just viewport - viz)
  const panelHeight = window.innerHeight - vizEl.clientHeight;
  if (panelHeight < COLLAPSE_THRESHOLD_PX) {
    setPanelCollapsed(true);
  } else {
    // Drag ended at a valid size — pointermove already set --mobile-viz-h
    // to the new value, so just persist it. Don't go through
    // setPanelCollapsed(false): that re-reads VIZ_H_KEY and would snap
    // us back to the previously saved height.
    localStorage.removeItem(PANEL_COLLAPSED_KEY);
    localStorage.setItem(VIZ_H_KEY, vizEl.clientHeight + 'px');
    resize();
  }
};
resizeHandle.addEventListener('pointerup', endResize);
resizeHandle.addEventListener('pointercancel', endResize);

// init
loadState();
updateViz();
updateHubDisplay();
renderPillarView();
refreshAuthUI();    // paint chip / pip with whatever loadState left us
initAuth();         // kicks off async session read + subscription
