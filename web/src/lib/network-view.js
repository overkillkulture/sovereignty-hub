import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { supabase } from './supabase.js';
import {
  createHub,
  RING_RADIUS, NODE_LEN, NODE_GAP, LAYER_LEN, LAYER_GAP,
  LAYERS, PILLARS,
  answerKey,
} from './hub-viz.js';

// True radial distance from a hub's center to the outer tip of its label
// sprite. The bar layout puts the node at RING_RADIUS, then the spoke
// extends outward by `NODE_LEN/2 + NODE_GAP + 7 * (LAYER_LEN + LAYER_GAP) + 0.55`,
// then the label sprite extends another ~1.7 units past that.
const SPOKE_END_FROM_HUB =
  RING_RADIUS + NODE_LEN / 2 + NODE_GAP + LAYERS.length * (LAYER_LEN + LAYER_GAP) + 0.55;
const LABEL_HALF_WIDTH = 1.7;
const HUB_FULL_RADIUS = SPOKE_END_FROM_HUB + LABEL_HALF_WIDTH;

// Extra gap between hub footprints in the grid.
const VISUAL_GAP = 10;
const HUB_FOOTPRINT = (HUB_FULL_RADIUS + VISUAL_GAP) * 2;

const COL_STEP = HUB_FOOTPRINT;
const ROW_STEP = HUB_FOOTPRINT;

const COLS_DESKTOP = 3;
const COLS_MOBILE = 1;

// ---------- DOM handles (populated lazily on first open) ----------
let overlay = null;
let host = null;
let countEl = null;
let titleEl = null;
let loadingEl = null;
let emptyEl = null;
let closeBtn = null;
let popupEl = null;
let popupIconEl = null;
let popupTitleEl = null;
let popupBodyEl = null;

// ---------- THREE.js state (recreated each open / disposed on close) ----------
let renderer = null;
let raycaster = null;
let mouseNDC = null;
let animFrame = null;

// View mode: 'grid' or 'viewer'
let mode = 'grid';

// Grid mode state
let gridScene = null;
let gridCamera = null;
let hubs = []; // [{ group, pillarNodes, record, x, z, pickDisc }]
let allBarMeshes = [];
let hubPickMeshes = []; // invisible discs for picking the hub center

// Viewer-mode rotate-to-pillar animation
let viewerAnimState = null; // { startRotY, endRotY, startTime, duration }

// Viewer mode state (single hub centered for reading)
let viewerScene = null;
let viewerCamera = null;
let viewerControls = null;       // OrbitControls — gives orbit/zoom/pan
let viewerHub = null;            // { group, pillarNodes, allBarMeshes, record }
let viewerBarMeshes = [];
let viewerDragState = null;      // tracks click-vs-drag for bar-click detection
let popupTarget = null;          // { pIdx, lIdx }

// ---------- Camera state (orbit model) ----------
// Camera orbits a target point on the grid plane. Pitch (elevation) and
// yaw (azimuth) tilt the view; distance is the zoom. All four are smoothed
// toward their *Goal counterparts each frame.
const cameraTarget = new THREE.Vector3(0, 0, 0);
const cameraTargetGoal = new THREE.Vector3(0, 0, 0);
let cameraDistance = 30;
let cameraDistanceGoal = 30;
let cameraAzimuth = 0;                                              // yaw, radians
let cameraAzimuthGoal = 0;
const ELEV_DEFAULT = THREE.MathUtils.degToRad(90);                  // 100% top-down
const ELEV_MIN = THREE.MathUtils.degToRad(15);
const ELEV_MAX = THREE.MathUtils.degToRad(90);
let cameraElevation = ELEV_DEFAULT;
let cameraElevationGoal = ELEV_DEFAULT;
const ZOOM_MIN = 8;
const ZOOM_MAX = 300;

// ---------- Drag state ----------
// dragState.kind:
//   'rotate-hub' — left-drag on a hub spins that hub
//   'orbit'      — left-drag on empty space tilts/yaws the grid camera
//   'pan'        — right-drag anywhere pans the camera target
let dragState = null;
let pinchState = null;
const DRAG_THRESHOLD_PX = 6;
const HUB_PICK_RADIUS = RING_RADIUS * 1.05;     // include center disc in pick

// ---------- Public API ----------
export function open() {
  ensureDom();
  overlay.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  mode = 'grid';
  updateChrome();
  startScene();
  loadHubs();
}

export function close() {
  if (overlay) overlay.hidden = true;
  document.documentElement.style.overflow = '';
  hidePopup();
  stopScene();
}

export function isOpen() {
  return overlay && !overlay.hidden;
}

// Back-button behavior: in viewer → return to grid; in grid → close overlay
function onBack() {
  if (mode === 'viewer') exitViewer();
  else close();
}

// ---------- DOM setup ----------
function ensureDom() {
  if (overlay) return;
  overlay = document.getElementById('network-overlay');
  host = document.getElementById('network-canvas-host');
  countEl = document.getElementById('network-count');
  titleEl = document.getElementById('network-title');
  loadingEl = document.getElementById('network-loading');
  emptyEl = document.getElementById('network-empty');
  closeBtn = document.getElementById('network-close');
  popupEl = document.getElementById('network-viewer-popup');
  popupIconEl = popupEl.querySelector('.vp-icon');
  popupTitleEl = popupEl.querySelector('.vp-title');
  popupBodyEl = popupEl.querySelector('.vp-body');

  closeBtn.addEventListener('click', onBack);
  popupEl.querySelector('.vp-close').addEventListener('click', hidePopup);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) onBack();
  });
}

function updateChrome() {
  if (mode === 'viewer') {
    titleEl.textContent = viewerHub?.record?.hub_name || 'Hub';
    countEl.textContent = '';
  } else {
    titleEl.textContent = 'All Hubs';
    countEl.textContent = hubs.length ? `· ${hubs.length} hub${hubs.length === 1 ? '' : 's'}` : '';
  }
}

function addLights(s) {
  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  s.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(8, 18, 6);
  s.add(dir);
}

// ---------- THREE setup / teardown ----------
function startScene() {
  gridScene = new THREE.Scene();
  gridScene.background = null;

  const rect = host.getBoundingClientRect();
  gridCamera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 2000);
  cameraTarget.set(0, 0, 0);
  cameraTargetGoal.set(0, 0, 0);
  cameraDistance = 30;
  cameraDistanceGoal = 30;
  cameraAzimuth = 0;
  cameraAzimuthGoal = 0;
  cameraElevation = ELEV_DEFAULT;
  cameraElevationGoal = ELEV_DEFAULT;
  positionGridCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(rect.width, rect.height);
  host.appendChild(renderer.domElement);

  addLights(gridScene);

  raycaster = new THREE.Raycaster();
  mouseNDC = new THREE.Vector2();

  window.addEventListener('resize', onResize);
  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerup', onPointerUp);
  host.addEventListener('pointercancel', onPointerUp);
  host.addEventListener('wheel', onWheel, { passive: false });
  host.addEventListener('contextmenu', onContextMenu);
  host.addEventListener('touchstart', onTouchStart, { passive: false });
  host.addEventListener('touchmove', onTouchMove, { passive: false });
  host.addEventListener('touchend', onTouchEnd);
  host.addEventListener('touchcancel', onTouchEnd);

  loop();
}

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

function stopScene() {
  if (animFrame != null) cancelAnimationFrame(animFrame);
  animFrame = null;
  window.removeEventListener('resize', onResize);
  if (host) {
    host.removeEventListener('pointerdown', onPointerDown);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerup', onPointerUp);
    host.removeEventListener('pointercancel', onPointerUp);
    host.removeEventListener('wheel', onWheel);
    host.removeEventListener('contextmenu', onContextMenu);
    host.removeEventListener('touchstart', onTouchStart);
    host.removeEventListener('touchmove', onTouchMove);
    host.removeEventListener('touchend', onTouchEnd);
    host.removeEventListener('touchcancel', onTouchEnd);
  }
  for (const h of hubs) disposeGroup(h.group);
  hubs = [];
  allBarMeshes = [];
  hubPickMeshes = [];
  viewerAnimState = null;
  if (viewerHub) { disposeGroup(viewerHub.group); viewerHub = null; viewerBarMeshes = []; }
  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
  }
  gridScene = null;
  gridCamera = null;
  viewerScene = null;
  viewerCamera = null;
  dragState = null;
  viewerDragState = null;
}

function onResize() {
  if (!renderer || !host) return;
  const rect = host.getBoundingClientRect();
  if (gridCamera) {
    gridCamera.aspect = rect.width / rect.height;
    gridCamera.updateProjectionMatrix();
  }
  if (viewerCamera) {
    viewerCamera.aspect = rect.width / rect.height;
    viewerCamera.updateProjectionMatrix();
  }
  renderer.setSize(rect.width, rect.height);
  if (popupTarget) updatePopupPosition();
  if (mode === 'grid') fitAllHubs();
  else if (mode === 'viewer') fitViewerHub();
}

// ---------- Loading hubs ----------
async function loadHubs() {
  loadingEl.hidden = false;
  emptyEl.hidden = true;
  countEl.textContent = '';
  if (!supabase) {
    loadingEl.hidden = true;
    emptyEl.hidden = false;
    emptyEl.textContent = 'Supabase not configured.';
    return;
  }
  // profiles and survey_state both reference auth.users but not each other,
  // so PostgREST can't auto-join them. Fetch separately and merge.
  const [profilesRes, surveyRes] = await Promise.all([
    supabase.from('profiles').select('id, hub_name, hub_email, hub_link, hub_image_url'),
    supabase.from('survey_state').select('user_id, answers, descriptions, cursor, max_reached'),
  ]);
  loadingEl.hidden = true;
  if (profilesRes.error || surveyRes.error) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'Failed to load hubs.';
    console.error('[network] load failed', profilesRes.error || surveyRes.error);
    return;
  }
  const surveysByUser = new Map();
  for (const s of (surveyRes.data || [])) surveysByUser.set(s.user_id, s);
  const merged = (profilesRes.data || []).map((p) => ({
    ...p,
    survey_state: surveysByUser.get(p.id) || null,
  }));
  // Hide rows with no hub_name set — those are signed-in users who haven't
  // filled in their profile yet. They'd render as nameless circles.
  const populated = merged.filter((r) => r.hub_name && r.hub_name.trim());
  if (populated.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  countEl.textContent = `· ${populated.length} hub${populated.length === 1 ? '' : 's'}`;
  buildHubs(populated);
}

function buildHubs(records) {
  const cols = (window.innerWidth >= 768) ? COLS_DESKTOP : COLS_MOBILE;
  records.forEach((rec, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = (col - (cols - 1) / 2) * COL_STEP;
    const z = row * ROW_STEP;

    const survey = (Array.isArray(rec.survey_state) ? rec.survey_state[0] : rec.survey_state) || {};
    const hub = createHub({
      answers: survey.answers || {},
      descriptions: survey.descriptions || {},
      name: rec.hub_name,
      imageUrl: rec.hub_image_url || '',
    });
    hub.group.position.set(x, 0, z);
    gridScene.add(hub.group);

    // Invisible pick disc covering the whole ring footprint so clicks on
    // the center (hub badge area) also register on this hub.
    const pickGeo = new THREE.CircleGeometry(HUB_PICK_RADIUS, 32);
    const pickMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const pickDisc = new THREE.Mesh(pickGeo, pickMat);
    pickDisc.rotation.x = -Math.PI / 2;
    pickDisc.userData = { hubIdx: i };
    hub.group.add(pickDisc);
    hubPickMeshes.push(pickDisc);

    const entry = {
      idx: i, x, z,
      group: hub.group,
      pillarNodes: hub.pillarNodes,
      record: rec,
      pickDisc,
    };
    hubs.push(entry);
    for (const m of hub.allBarMeshes) {
      m.userData.hubIdx = i;
      allBarMeshes.push(m);
    }
  });
  updateChrome();
  fitAllHubs();
}

// Position the camera so every hub fits in the viewport with a little padding.
function fitAllHubs() {
  if (!gridCamera || hubs.length === 0) return;
  const xs = hubs.map((h) => h.x);
  const zs = hubs.map((h) => h.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const spreadX = (maxX - minX) + HUB_FOOTPRINT;
  const spreadZ = (maxZ - minZ) + HUB_FOOTPRINT;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const rect = host.getBoundingClientRect();
  const aspect = rect.width / rect.height;
  const fovY = THREE.MathUtils.degToRad(gridCamera.fov);
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect);
  const hForX = (spreadX / 2) / Math.tan(fovX / 2);
  const hForZ = (spreadZ / 2) / Math.tan(fovY / 2);
  // Perpendicular distance needed to fit. cameraDistance is the slant
  // distance from target — divide by sin(elev) to convert.
  const perp = Math.max(hForX, hForZ) * 1.15;
  const dist = perp / Math.sin(cameraElevationGoal);

  cameraTargetGoal.set(centerX, 0, centerZ);
  cameraTarget.copy(cameraTargetGoal);
  cameraDistance = dist;
  cameraDistanceGoal = dist;
}

// ---------- Interaction ----------
function pickBarAt(clientX, clientY, meshList, camForRay) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camForRay);
  const hits = raycaster.intersectObjects(meshList, false);
  return hits.length > 0 ? hits[0] : null;
}

function onContextMenu(e) { e.preventDefault(); }

function onPointerDown(e) {
  if (pinchState) return;
  const isRight = e.button === 2;
  if (mode === 'grid') {
    if (isRight) {
      // Right-drag (anywhere) = pan.
      dragState = {
        kind: 'pan',
        startX: e.clientX, startY: e.clientY,
        startTargetX: cameraTargetGoal.x,
        startTargetZ: cameraTargetGoal.z,
        moved: false,
      };
      host.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== undefined && e.button !== 0) return;
    // Left-button: hit a hub (bar OR center disc) → rotate that hub on drag,
    // open viewer on click. Empty space → orbit camera.
    const meshes = [...allBarMeshes, ...hubPickMeshes];
    const hit = pickBarAt(e.clientX, e.clientY, meshes, gridCamera);
    if (hit) {
      const hubIdx = hit.object.userData.hubIdx;
      dragState = {
        kind: 'rotate-hub',
        hubIdx,
        startX: e.clientX, startY: e.clientY,
        startRotY: hubs[hubIdx].group.rotation.y,
        moved: false,
      };
    } else {
      dragState = {
        kind: 'orbit',
        startX: e.clientX, startY: e.clientY,
        startAzimuth: cameraAzimuthGoal,
        startElevation: cameraElevationGoal,
        moved: false,
      };
    }
    host.setPointerCapture(e.pointerId);
  } else if (mode === 'viewer') {
    if (e.button !== undefined && e.button !== 0) return;
    // OrbitControls does the actual drag. We just track whether the pointer
    // moved between down and up so we can distinguish click-on-bar from drag.
    viewerDragState = {
      startX: e.clientX, startY: e.clientY,
      moved: false,
      pickedBar: pickBarAt(e.clientX, e.clientY, viewerBarMeshes, viewerCamera),
    };
  }
}

function onPointerMove(e) {
  if (mode === 'grid' && dragState) {
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) dragState.moved = true;
    if (!dragState.moved) return;
    if (dragState.kind === 'rotate-hub') {
      const factor = (Math.PI * 2) / 400;
      hubs[dragState.hubIdx].group.rotation.y = dragState.startRotY + dx * factor;
    } else if (dragState.kind === 'orbit') {
      const azFactor = (Math.PI * 2) / 600;
      const elFactor = Math.PI / 400;
      cameraAzimuthGoal = dragState.startAzimuth - dx * azFactor;
      cameraElevationGoal = Math.max(ELEV_MIN, Math.min(ELEV_MAX, dragState.startElevation + dy * elFactor));
    } else if (dragState.kind === 'pan') {
      // Convert pixels to world units at the target plane.
      const fovY = THREE.MathUtils.degToRad(gridCamera.fov);
      const perp = cameraDistance * Math.sin(cameraElevation);
      const worldPerPx = (2 * perp * Math.tan(fovY / 2)) / host.clientHeight;
      // Pan along camera's screen-right (rotated by azimuth on XZ) and the
      // ground-projected forward (which is -cos / -sin azimuth in XZ).
      const sinAz = Math.sin(cameraAzimuth);
      const cosAz = Math.cos(cameraAzimuth);
      const rightX = cosAz, rightZ = -sinAz;
      const fwdX = sinAz,  fwdZ = cosAz; // ground-projected forward from camera toward target
      cameraTargetGoal.x = dragState.startTargetX - dx * worldPerPx * rightX - dy * worldPerPx * fwdX;
      cameraTargetGoal.z = dragState.startTargetZ - dx * worldPerPx * rightZ - dy * worldPerPx * fwdZ;
    }
  } else if (mode === 'viewer' && viewerDragState) {
    const dx = e.clientX - viewerDragState.startX;
    const dy = e.clientY - viewerDragState.startY;
    if (!viewerDragState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) viewerDragState.moved = true;
    // Actual orbit/zoom/pan happens inside OrbitControls.
  }
}

function onPointerUp(e) {
  try { host.releasePointerCapture(e.pointerId); } catch (_) {}
  if (mode === 'grid' && dragState) {
    const wasClick = !dragState.moved && dragState.kind === 'rotate-hub';
    const clickedHubIdx = dragState.hubIdx;
    dragState = null;
    if (wasClick) {
      const rec = hubs[clickedHubIdx]?.record;
      if (rec) enterViewer(rec);
    }
  } else if (mode === 'viewer' && viewerDragState) {
    const wasClick = !viewerDragState.moved;
    const hit = viewerDragState.pickedBar;
    viewerDragState = null;
    if (wasClick && hit) {
      const { pIdx, lIdx } = hit.object.userData;
      rotateHubToPillar(pIdx);
      showPopupForLayer(pIdx, lIdx);
    } else if (wasClick) {
      hidePopup();
    }
  }
}

function onWheel(e) {
  e.preventDefault();
  if (mode !== 'grid') return;
  const factor = Math.pow(1.0015, e.deltaY);
  cameraDistanceGoal = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cameraDistanceGoal * factor));
}

function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function onTouchStart(e) {
  if (e.touches.length === 2 && mode === 'grid') {
    dragState = null;
    pinchState = {
      startDistance: touchDistance(e.touches),
      startCamDistance: cameraDistanceGoal,
    };
  }
}

function onTouchMove(e) {
  if (pinchState && e.touches.length === 2 && mode === 'grid') {
    e.preventDefault();
    const d = touchDistance(e.touches);
    if (d > 0 && pinchState.startDistance > 0) {
      const factor = pinchState.startDistance / d;
      cameraDistanceGoal = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchState.startCamDistance * factor));
    }
  }
}

function onTouchEnd(e) {
  if (e.touches.length < 2) pinchState = null;
}

// Pan/orbit are free-form; no clamping. Users can fit-all again to re-center.
function clampCameraTarget() { /* no-op */ }

function positionGridCamera() {
  if (!gridCamera) return;
  // Spherical orbit around cameraTarget.
  const cosE = Math.cos(cameraElevation);
  const sinE = Math.sin(cameraElevation);
  gridCamera.position.set(
    cameraTarget.x + cameraDistance * cosE * Math.sin(cameraAzimuth),
    cameraTarget.y + cameraDistance * sinE,
    cameraTarget.z + cameraDistance * cosE * Math.cos(cameraAzimuth),
  );
  gridCamera.lookAt(cameraTarget);
}

// ---------- Viewer mode (single hub fullscreen) ----------
function enterViewer(rec) {
  mode = 'viewer';
  hidePopup();
  // Build a fresh hub at origin in its own scene
  viewerScene = new THREE.Scene();
  viewerScene.background = null;
  addLights(viewerScene);
  const survey = (Array.isArray(rec.survey_state) ? rec.survey_state[0] : rec.survey_state) || {};
  const built = createHub({
    answers: survey.answers || {},
    descriptions: survey.descriptions || {},
    name: rec.hub_name,
    imageUrl: rec.hub_image_url || '',
  });
  viewerHub = {
    group: built.group,
    pillarNodes: built.pillarNodes,
    record: rec,
    answers: survey.answers || {},
    descriptions: survey.descriptions || {},
  };
  viewerBarMeshes = built.allBarMeshes;
  viewerScene.add(built.group);
  built.group.rotation.y = 0;

  const rect = host.getBoundingClientRect();
  viewerCamera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 500);

  // OrbitControls gives drag-orbit + wheel-zoom + right-drag-pan, matching
  // the main viz.
  viewerControls = new OrbitControls(viewerCamera, renderer.domElement);
  viewerControls.target.set(0, 0, 0);
  viewerControls.enableDamping = true;
  viewerControls.dampingFactor = 0.12;
  viewerControls.minDistance = 4;
  viewerControls.maxDistance = 200;

  fitViewerHub();
  updateChrome();
}

function exitViewer() {
  hidePopup();
  if (viewerControls) { viewerControls.dispose(); viewerControls = null; }
  if (viewerHub) {
    disposeGroup(viewerHub.group);
    viewerHub = null;
    viewerBarMeshes = [];
  }
  viewerScene = null;
  viewerCamera = null;
  viewerDragState = null;
  viewerAnimState = null;
  mode = 'grid';
  updateChrome();
}

// ---------- Popup (viewer mode) ----------
function showPopupForLayer(pIdx, lIdx) {
  const desc = viewerHub?.descriptions?.[answerKey(pIdx, lIdx)];
  if (!desc || !desc.trim()) { hidePopup(); return; }
  const pillar = PILLARS[pIdx];
  const layer = LAYERS[lIdx];
  popupIconEl.className = `vp-icon ${pillar.faClass}`;
  popupIconEl.style.color = pillar.color;
  popupTitleEl.textContent = `${pillar.name} · ${layer.name}`;
  popupBodyEl.textContent = desc;
  popupTarget = { pIdx, lIdx };
  popupEl.hidden = false;
  updatePopupPosition();
}

function hidePopup() {
  popupTarget = null;
  if (popupEl) popupEl.hidden = true;
}

function updatePopupPosition() {
  if (!popupTarget || !viewerHub || !viewerCamera || !renderer) return;
  const pn = viewerHub.pillarNodes[popupTarget.pIdx];
  const bar = pn.bars[popupTarget.lIdx];
  bar.group.updateMatrixWorld(true);
  const centerWorld = new THREE.Vector3().setFromMatrixPosition(bar.group.matrixWorld);
  const outerWorld = new THREE.Vector3(LAYER_LEN / 2, 0, 0).applyMatrix4(bar.group.matrixWorld);
  const ndcCenter = centerWorld.clone().project(viewerCamera);
  const ndcOuter = outerWorld.clone().project(viewerCamera);
  const rect = renderer.domElement.getBoundingClientRect();
  const ox = (ndcOuter.x * 0.5 + 0.5) * rect.width;
  const cy = (1 - (ndcCenter.y * 0.5 + 0.5)) * rect.height;
  const MARGIN = 36;
  popupEl.style.left = `${ox + MARGIN}px`;
  popupEl.style.top = `${cy}px`;
  popupEl.style.transform = 'translate(0, -50%)';
  popupEl.style.opacity = (ndcCenter.z > 1) ? '0' : '1';
}

// ---------- Render loop ----------
function loop() {
  if (!renderer) return;
  if (mode === 'grid') {
    cameraTarget.x += (cameraTargetGoal.x - cameraTarget.x) * 0.2;
    cameraTarget.z += (cameraTargetGoal.z - cameraTarget.z) * 0.2;
    cameraDistance += (cameraDistanceGoal - cameraDistance) * 0.2;
    cameraAzimuth += (cameraAzimuthGoal - cameraAzimuth) * 0.2;
    cameraElevation += (cameraElevationGoal - cameraElevation) * 0.2;
    positionGridCamera();
    renderer.render(gridScene, gridCamera);
  } else if (mode === 'viewer' && viewerScene && viewerCamera) {
    if (viewerAnimState) stepViewerAnim();
    if (viewerControls) viewerControls.update();
    renderer.render(viewerScene, viewerCamera);
    if (popupTarget) updatePopupPosition();
  }
  animFrame = requestAnimationFrame(loop);
}

function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

function rotateHubToPillar(pIdx) {
  if (!viewerHub) return;
  // Pillar local angle a = (pIdx/N)*2π - π/2. With rotation.y = θ, the pillar
  // ends up at WORLD angle (a - θ). We want WORLD angle = -π/2 (toward
  // camera = "top of screen"), so θ = a + π/2 = (pIdx/N)*2π.
  const targetRotY = (pIdx / PILLARS.length) * Math.PI * 2;
  const current = viewerHub.group.rotation.y;
  // Shortest path: normalize delta into (-π, π]
  let delta = targetRotY - current;
  delta = ((delta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  if (Math.abs(delta) < 0.001) return;
  viewerAnimState = {
    startRotY: current,
    endRotY: current + delta,
    startTime: performance.now(),
    duration: 550,
  };
}

function stepViewerAnim() {
  const t = Math.min(1, (performance.now() - viewerAnimState.startTime) / viewerAnimState.duration);
  const e = easeInOutCubic(t);
  viewerHub.group.rotation.y = viewerAnimState.startRotY + (viewerAnimState.endRotY - viewerAnimState.startRotY) * e;
  if (t >= 1) viewerAnimState = null;
}

// Fit the viewer hub so its full footprint (bars + labels) fills the viewport.
function fitViewerHub() {
  if (!viewerCamera) return;
  const rect = host.getBoundingClientRect();
  const aspect = rect.width / rect.height;
  const fovY = THREE.MathUtils.degToRad(viewerCamera.fov);
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect);
  // Use the TRUE hub radius (out to label tip) so labels don't get clipped.
  const fullR = HUB_FULL_RADIUS;
  const distForX = fullR / Math.tan(fovX / 2);
  const distForY = fullR / Math.tan(fovY / 2);
  const distance = Math.max(distForX, distForY) * 1.1;
  // Mostly top-down with a small forward tilt for visual depth.
  const elev = THREE.MathUtils.degToRad(80);
  viewerCamera.position.set(
    0,
    distance * Math.sin(elev),
    distance * Math.cos(elev),
  );
  viewerCamera.lookAt(0, 0, 0);
  if (viewerControls) {
    viewerControls.target.set(0, 0, 0);
    viewerControls.update();
  }
}
