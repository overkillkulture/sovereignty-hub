import * as THREE from 'three';

// 13 pillars × 7 layers × 3 phase lanes. All shared geometry constants
// and creation logic live here so both the main viz (one hub) and the
// network view (many hubs) build identical-looking hubs.

// `icon` is the Font Awesome 6 Free Solid unicode codepoint for the glyph
// — used by drawIcon() to render the character into the icon canvas via
// the loaded FA webfont.
export const PILLARS = [
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

export const LAYERS = [
  { i:0, name:'Survival',     desc:'Zero prep. Grid is down. You have nothing. Improvise.' },
  { i:1, name:'Preparedness', desc:'Kit built. Supplies stocked. Training done. Ready.' },
  { i:2, name:'Stockpile',    desc:'Raw materials with trade value. Strategic reserves.' },
  { i:3, name:'Production',   desc:'Making things. 3D printing, kits, assemblies, repairs.' },
  { i:4, name:'Commerce',     desc:'Selling, drop-shipping, curating. Full product catalog.' },
  { i:5, name:'Teaching',     desc:'Classes, guides, installs, consulting. Knowledge transfer.' },
  { i:6, name:'Innovation',   desc:'Eureka-level breakthroughs. Category-defining work.' },
];

export const PHASES = [
  { key:'none',    label:'Not started',  color:'#2a3340' },
  { key:'survive', label:'Survive',      color:'#e74c3c' },
  { key:'build',   label:'Build',        color:'#f1c40f' },
  { key:'scale',   label:'Scale',        color:'#2ecc71' },
];

export const PHASE_ORDER = ['none','survive','build','scale'];
export const TOTAL_Q = PILLARS.length * LAYERS.length; // 91
export function answerKey(pIdx, lIdx) { return `${pIdx}-${lIdx}`; }

export const PHASE_COLORS = {
  survive: new THREE.Color('#e74c3c'),
  build:   new THREE.Color('#f1c40f'),
  scale:   new THREE.Color('#2ecc71'),
  none:    new THREE.Color('#2a3340'),
};

// Layout constants
export const RING_RADIUS = 4.5;
export const NODE_LEN = 1.05;
export const NODE_GAP = 0.10;
export const LAYER_LEN = 1.15;
export const LAYER_GAP = 0.06;
export const LANE_GAP = 0.05;
export const SEG_THICKNESS = 0.25;
export const NODE_WIDTH = 2 * (RING_RADIUS - NODE_LEN / 2) * Math.tan(Math.PI / PILLARS.length);
export const LANE_WIDTH = (NODE_WIDTH - 2 * LANE_GAP) / 3;

// Hub badge — image + name disc in the center of the ring.
export const HUB_RADIUS = (RING_RADIUS - NODE_LEN / 2) * 0.65;
const HUB_TEX_SIZE = 512;

// ----- sprite helpers ---------------------------------------------------

function makeLabelSprite(text, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
  const maxWidth = canvas.width * 0.92;
  let fontSize = 64;
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;
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

function paintHubCanvas(ctx, size, name, imgEl) {
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  const radius = size / 2 - 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  if (imgEl) {
    ctx.drawImage(imgEl, 0, 0, size, size);
  } else {
    ctx.fillStyle = '#1a2230';
    ctx.fillRect(0, 0, size, size);
  }
  if (name && name.trim()) {
    const rectH = 72;
    const rectY = Math.round(size * 0.66);
    const rectX = 30;
    const rectW = size - 60;
    const r = 14;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(rectX + r, rectY);
    ctx.lineTo(rectX + rectW - r, rectY);
    ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + r);
    ctx.lineTo(rectX + rectW, rectY + rectH - r);
    ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - r, rectY + rectH);
    ctx.lineTo(rectX + r, rectY + rectH);
    ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - r);
    ctx.lineTo(rectX, rectY + r);
    ctx.quadraticCurveTo(rectX, rectY, rectX + r, rectY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = rectW - 24;
    let display = name;
    while (display.length > 1 && ctx.measureText(display).width > maxWidth) {
      display = display.slice(0, -1);
    }
    if (display !== name && display.length > 1) display = display.slice(0, -1) + '…';
    ctx.fillText(display, cx, rectY + rectH / 2);
  }
  ctx.restore();
}

// ----- the factory ------------------------------------------------------

/**
 * Build one complete hub visualization (13 pillars × 7 layers).
 * Returns { group, pillarNodes, allBarMeshes, hub } so callers can:
 *   - add group to a scene
 *   - raycast against allBarMeshes
 *   - reposition / look up bars via pillarNodes[pIdx].bars[lIdx]
 *   - update hub badge via hub.setName(...) / hub.setImage(url)
 *   - update answers via paintAnswers({ answers, descriptions })
 */
export function createHub({ answers = {}, descriptions = {}, name = '', imageUrl = '' } = {}) {
  const group = new THREE.Group();

  // Ring outline circle
  {
    const ringPts = [];
    const N = 256;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new THREE.LineBasicMaterial({ color: 0x2a3340, transparent: true, opacity: 0.55 });
    group.add(new THREE.Line(ringGeo, ringMat));
  }

  const pillarNodes = [];
  const allBarMeshes = [];

  PILLARS.forEach((p, pIdx) => {
    const angle = (pIdx / PILLARS.length) * Math.PI * 2 - Math.PI / 2;
    const cx = Math.cos(angle) * RING_RADIUS;
    const cz = Math.sin(angle) * RING_RADIUS;

    const pillarGroup = new THREE.Group();
    group.add(pillarGroup);

    // Node box
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
    node.rotation.y = -angle;
    pillarGroup.add(node);

    // Spoke
    const spoke = new THREE.Group();
    spoke.position.set(cx, 0, cz);
    spoke.rotation.y = -angle;
    pillarGroup.add(spoke);

    // 7 layer bars × 3 phase lanes
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

      const commentDotGeo = new THREE.SphereGeometry(0.1, 12, 8);
      const commentDotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color) });
      const commentDot = new THREE.Mesh(commentDotGeo, commentDotMat);
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
    pillarGroup.add(iconObj.sprite);

    // Pillar label
    const spokeEnd = NODE_LEN / 2 + NODE_GAP + LAYERS.length * (LAYER_LEN + LAYER_GAP) + 0.55;
    const labelX = cx + Math.cos(angle) * spokeEnd;
    const labelZ = cz + Math.sin(angle) * spokeEnd;
    const labelSpr = makeLabelSprite(`${p.n}. ${p.name}`, '#ffffff');
    labelSpr.scale.set(3.4, 0.85, 1);
    labelSpr.position.set(labelX, 0.4, labelZ);
    pillarGroup.add(labelSpr);

    pillarNodes.push({ pIdx, node, spoke, bars, labelSpr, iconObj, p, angle, cx, cz });
  });

  // Hub badge in the center
  const centerDot = (() => {
    const geo = new THREE.CircleGeometry(0.5, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2a3340, transparent: true, opacity: 0.7 });
    const dot = new THREE.Mesh(geo, mat);
    dot.rotation.x = -Math.PI / 2;
    group.add(dot);
    return dot;
  })();

  const hubCanvas = document.createElement('canvas');
  hubCanvas.width = hubCanvas.height = HUB_TEX_SIZE;
  const hubCtx = hubCanvas.getContext('2d');
  const hubTex = new THREE.CanvasTexture(hubCanvas);
  hubTex.colorSpace = THREE.SRGBColorSpace;
  hubTex.minFilter = THREE.LinearFilter;
  hubTex.needsUpdate = true;
  const hubSpriteMat = new THREE.SpriteMaterial({ map: hubTex, transparent: true, depthTest: true, depthWrite: true });
  const hubSprite = new THREE.Sprite(hubSpriteMat);
  const hubDiameter = HUB_RADIUS * 2;
  hubSprite.scale.set(hubDiameter, hubDiameter, 1);
  hubSprite.position.set(0, 0, 0);
  hubSprite.visible = false;
  group.add(hubSprite);

  let imgEl = null;
  let currentName = '';

  function refreshBadge() {
    const hasName = currentName && currentName.trim();
    const hasImg = !!imgEl;
    if (!hasName && !hasImg) {
      hubSprite.visible = false;
      centerDot.visible = true;
      return;
    }
    centerDot.visible = false;
    paintHubCanvas(hubCtx, HUB_TEX_SIZE, currentName, imgEl);
    hubTex.needsUpdate = true;
    hubSprite.visible = true;
  }

  function setName(n) { currentName = n || ''; refreshBadge(); }
  function setImage(url) {
    if (!url) { imgEl = null; refreshBadge(); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgEl = img; refreshBadge(); };
    img.onerror = () => { imgEl = null; refreshBadge(); };
    img.src = url;
  }

  // Remember the latest answers so the font-load callback can repaint
  // with the right dim/lit state once the FA font is ready.
  let lastAnswers = answers || {};

  function pillarHasAnyAnswer(pIdx, ans) {
    for (let l = 0; l < LAYERS.length; l++) {
      const v = ans[answerKey(pIdx, l)];
      if (v && v !== 'none') return true;
    }
    return false;
  }

  const INACTIVE_NODE_COLOR = new THREE.Color('#2a3340');

  function updateIconForPillar(pn, hasAny) {
    // Active pillars get white icons at full alpha; empty pillars stay
    // visible but dimmed so you can still read the pillar but the eye is
    // drawn to the active ones.
    const color = hasAny ? '#ffffff' : '#5b6d82';
    const alpha = hasAny ? 1.0 : 0.35;
    drawIcon(pn.iconObj.ctx, pn.p.icon, color, pn.iconObj.canvas.width, alpha);
    pn.iconObj.tex.needsUpdate = true;
  }

  function updateNodeForPillar(pn, hasAny) {
    // The colored ring node should only be lit in the pillar's color when
    // that pillar has at least one answered layer. Empty pillars get a
    // dim neutral node so a glance shows which pillars the hub has
    // engaged with.
    const base = hasAny ? new THREE.Color(pn.p.color) : INACTIVE_NODE_COLOR;
    pn.node.material.color.copy(base);
    pn.node.material.emissive.copy(hasAny ? base.clone().multiplyScalar(0.5) : new THREE.Color(0x000000));
    pn.node.material.emissiveIntensity = hasAny ? 0.6 : 0;
    pn.node.material.opacity = hasAny ? 1.0 : 0.55;
    pn.node.material.needsUpdate = true;
    pn.labelSpr.material.opacity = hasAny ? 0.85 : 0.3;
  }

  function paintAnswers({ answers: nextAnswers = {}, descriptions: nextDescriptions = {} } = {}) {
    lastAnswers = nextAnswers;
    pillarNodes.forEach((pn, pIdx) => {
      pn.bars.forEach((bar, lIdx) => {
        const phase = nextAnswers[answerKey(pIdx, lIdx)] || 'none';
        const litUntil = PHASE_ORDER.indexOf(phase);
        ['survive', 'build', 'scale'].forEach((ph, si) => {
          const m = bar.segs[ph];
          const isLit = (si + 1) <= litUntil;
          m.material.color.copy(isLit ? PHASE_COLORS[ph] : PHASE_COLORS.none);
          m.material.emissive.copy(isLit ? PHASE_COLORS[ph].clone().multiplyScalar(0.35) : new THREE.Color(0x000000));
          m.material.opacity = isLit ? 1.0 : 0.55;
          m.material.needsUpdate = true;
        });
        const desc = nextDescriptions[answerKey(pIdx, lIdx)];
        bar.commentDot.visible = !!(desc && desc.trim());
      });
      const hasAny = pillarHasAnyAnswer(pIdx, nextAnswers);
      updateIconForPillar(pn, hasAny);
      updateNodeForPillar(pn, hasAny);
    });
  }

  // Initial paint
  paintAnswers({ answers, descriptions });
  setName(name);
  if (imageUrl) setImage(imageUrl);

  // The first paint runs before the FA webfont loads, so icons render as
  // tofu / fallback. Repaint with the same dim/lit logic when the font
  // arrives so empty pillars stay dimmed.
  if (document.fonts && document.fonts.load) {
    document.fonts.load('900 64px "Font Awesome 6 Free"').then(() => {
      pillarNodes.forEach((pn, pIdx) => {
        updateIconForPillar(pn, pillarHasAnyAnswer(pIdx, lastAnswers));
      });
    }).catch(() => {});
  }

  return {
    group,
    pillarNodes,
    allBarMeshes,
    paintAnswers,
    hub: { setName, setImage, refreshBadge },
  };
}
