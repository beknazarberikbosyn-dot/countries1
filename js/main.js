import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { COUNTRIES, SOURCES } from './countries.js';
import { SYMBOLS } from './symbols.js';

/* ------------------------------------------------------------------ *
 *  CIS Atlas: one page, ten countries, each a sculpted map on a plinth
 * ------------------------------------------------------------------ */

const $ = (s, el = document) => el.querySelector(s);
const MAP = 6; // half-size of the map square in world units
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isSmall = () => innerWidth < 980;
const NUM_SCALE = { kz: 0.72, kg: 0.9, tj: 1.12, uz: 1.0, tm: 0.84, az: 0.64, am: 0.9, md: 0.98, by: 1.02, ru: 0.8 };
const SYM_CAPTION = { tj: '#ffffff', am: '#fff4e6', az: '#1d1a4f' };

const ui = {
  name: $('#countryName'),
  native: $('#countryNative'),
  status: $('#status'),
  card: $('#card'),
  symArt: $('#symArt'),
  symCaption: $('#symCaption'),
  capital: $('#capital'),
  capTime: $('#capTime'),
  cis: $('#cis'),
  desc: $('#desc'),
  facts: $('#facts'),
  leaderName: $('#leaderName'),
  leaderSince: $('#leaderSince'),
  leaderNote: $('#leaderNote'),
  medal: $('#medal'),
  footnote: $('#footnote'),
  prev: $('#prevBtn'),
  next: $('#nextBtn'),
  prevName: $('#prevName'),
  nextName: $('#nextName'),
  route: $('#route'),
  counter: $('#counter'),
  labels: $('#labels'),
  roomA: $('#roomA'),
  roomB: $('#roomB'),
  loader: $('#loader'),
  loaderBar: $('#loaderBar'),
  about: $('#about'),
};

/* ------------------------------ helpers ------------------------------ */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outBack: (t) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, clamp(hsl.l + amt, 0, 1));
  return '#' + c.getHexString();
}

// tiny tween runner, ticked by the render loop
const tweens = new Set();
function tween(duration, onUpdate, easing = ease.inOutCubic) {
  return new Promise((resolve) => {
    if (duration <= 0) { onUpdate(1); resolve(); return; }
    tweens.add({ start: performance.now(), duration, onUpdate, easing, resolve });
  });
}
function runTweens(now) {
  for (const tw of tweens) {
    const t = clamp((now - tw.start) / tw.duration, 0, 1);
    tw.onUpdate(tw.easing(t));
    if (t >= 1) { tweens.delete(tw); tw.resolve(); }
  }
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});
const geoCache = new Map();
const loadGeo = (code) => {
  if (!geoCache.has(code)) geoCache.set(code, fetch(`data/geo/${code}.json`).then((r) => r.json()));
  return geoCache.get(code);
};
const flagCache = new Map();
const loadFlag = (code) => {
  if (!flagCache.has(code)) flagCache.set(code, loadImage(`assets/flags/${code}.svg`));
  return flagCache.get(code);
};
const fontReady = (c) => {
  const f = c.font;
  return document.fonts.load(`${f.style === 'italic' ? 'italic ' : ''}${f.weight} 64px "${f.family}"`).catch(() => {});
};

/* ------------------------------ renderer ------------------------------ */

const canvas = $('#stage');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let maxAniso = 4;

const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.2);
const key = new THREE.DirectionalLight(0xffffff, 3);
const rim = new THREE.DirectionalLight(0xffffff, 1);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.3, color: 0x000000 }));
let blob;

if (renderer) {
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  maxAniso = renderer.capabilities.getMaxAnisotropy();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  scene.add(hemi);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 70 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 5;
  scene.add(key, key.target, rim, rim.target);

  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // soft contact shadow under the plinth
  const bc = document.createElement('canvas');
  bc.width = bc.height = 256;
  const bx = bc.getContext('2d');
  const g = bx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  bx.fillStyle = g;
  bx.fillRect(0, 0, 256, 256);
  const blobTex = new THREE.CanvasTexture(bc);
  blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, color: 0x000000, opacity: 0.6 }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.003;
  blob.renderOrder = -1;
  scene.add(blob);
}

/* ------------------------------ textures ------------------------------ */

function mapTexture(geo, c, shapeKind, hw, hh) {
  const size = isSmall() ? 1536 : 2048;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const m = c.theme.map;
  const s = size / 2;
  const P = ([x, y]) => [s + x * s, s - y * s];

  const path = (pts) => {
    pts.forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
  };
  const line = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  };

  // water with a soft light pool in the middle
  ctx.fillStyle = m.water;
  ctx.fillRect(0, 0, size, size);
  const pool = ctx.createRadialGradient(s * 0.9, s * 0.85, 0, s, s, s * 1.1);
  pool.addColorStop(0, 'rgba(255,255,255,0.10)');
  pool.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, size, size);

  // graticule
  ctx.strokeStyle = m.grid;
  ctx.lineWidth = size / 1100;
  for (const g of geo.graticule) line(g.pts);

  // land
  for (const l of geo.land) {
    ctx.fillStyle = l.main ? m.main : m.land;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = size / 1400;
    for (const poly of l.polys) {
      ctx.beginPath();
      poly.forEach(path);
      ctx.fill('evenodd');
      ctx.stroke();
    }
  }
  // fine graticule over land too, very faint
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = m.grid;
  ctx.lineWidth = size / 1400;
  for (const g of geo.graticule) line(g.pts);
  ctx.globalAlpha = 1;

  // coastlines and borders
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = m.coast;
  ctx.lineWidth = size / 650;
  for (const l of geo.coasts) line(l);
  ctx.strokeStyle = m.border;
  ctx.lineWidth = size / 700;
  ctx.setLineDash([size / 140, size / 260]);
  for (const l of geo.borders) line(l);
  ctx.setLineDash([]);

  // labels
  const inShape = (x, y) => {
    if (shapeKind === 'circle' || shapeKind === 'hex' || shapeKind === 'oct') return Math.hypot(x, y) < 0.78;
    return Math.abs(x) < (hw / MAP) * 0.86 && Math.abs(y) < (hh / MAP) * 0.82;
  };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size / 300)}px`;
  ctx.fillStyle = m.label;
  for (const lb of geo.labels) {
    if (!inShape(lb.x, lb.y)) continue;
    const fs = clamp(lb.size * size * 0.035, size * 0.0125, size * 0.021);
    ctx.font = `600 ${fs}px Geologica, system-ui, sans-serif`;
    const [x, y] = P([lb.x, lb.y]);
    ctx.fillText(lb.name.toUpperCase(), x, y);
  }
  ctx.fillStyle = m.sea;
  for (const sl of geo.seas) {
    if (!inShape(sl.x, sl.y)) continue;
    ctx.font = `italic 500 ${size * 0.017}px Geologica, system-ui, sans-serif`;
    const [x, y] = P([sl.x, sl.y]);
    ctx.fillText(sl.name, x, y);
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // scale bar and north arrow, tucked inside the plinth outline
  const kmPerPx = geo.kmPerUnit / s;
  const targetKm = kmPerPx * size * 0.16;
  const mag = Math.pow(10, Math.floor(Math.log10(targetKm)));
  const nice = [1, 2, 2.5, 5, 10].map((k) => k * mag).reduce((a, b) => (Math.abs(b - targetKm) < Math.abs(a - targetKm) ? b : a));
  const barPx = nice / kmPerPx;
  const isRound = shapeKind === 'circle' || shapeKind === 'hex' || shapeKind === 'oct';
  const by = isRound ? s + s * 0.66 : s + (hh / MAP) * s * 0.84;
  const bx = s - barPx / 2;
  ctx.strokeStyle = m.label;
  ctx.fillStyle = m.label;
  ctx.lineWidth = size / 500;
  ctx.beginPath();
  ctx.moveTo(bx, by - size * 0.006); ctx.lineTo(bx, by); ctx.lineTo(bx + barPx, by); ctx.lineTo(bx + barPx, by - size * 0.006);
  ctx.stroke();
  ctx.font = `600 ${size * 0.0135}px Geologica, system-ui, sans-serif`;
  ctx.fillText(`${nice.toLocaleString('en-US')} km`, s, by + size * 0.017);

  const ny = isRound ? s - s * 0.72 : s - (hh / MAP) * s * 0.8;
  const nx = s;
  ctx.beginPath();
  ctx.moveTo(nx, ny - size * 0.022);
  ctx.lineTo(nx + size * 0.009, ny + size * 0.006);
  ctx.lineTo(nx, ny);
  ctx.lineTo(nx - size * 0.009, ny + size * 0.006);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 ${size * 0.014}px Geologica, system-ui, sans-serif`;
  ctx.fillText('N', nx, ny + size * 0.024);

  // degree ticks around round plinths, like the bezel of an instrument
  if (shapeKind === 'circle') {
    ctx.strokeStyle = m.label;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r1 = s * 0.955, r2 = s * (i % 6 === 0 ? 0.915 : 0.94);
      ctx.lineWidth = size / (i % 6 === 0 ? 650 : 1100);
      ctx.beginPath();
      ctx.moveTo(s + Math.cos(a) * r1, s + Math.sin(a) * r1);
      ctx.lineTo(s + Math.cos(a) * r2, s + Math.sin(a) * r2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function flagTexture(img, ex, ey) {
  const ta = ex / ey; // aspect of the country's bounding box
  const W = 2048;
  const H = clamp(Math.round(W / ta), 256, 4096);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // meet the shape halfway: stretch the flag partly towards the box, crop the rest
  const fa = 4 / 3;
  if (ta < fa) {
    // taller than the flag: show the full width, then carry the edge rows up and down
    const dh = W / fa, top = (H - dh) / 2;
    ctx.drawImage(img, 0, top, W, dh);
    const iw = img.naturalWidth || 640, ih = img.naturalHeight || 480;
    ctx.drawImage(img, 0, 0, iw, 2, 0, 0, W, top + 1);
    ctx.drawImage(img, 0, ih - 2, iw, 2, 0, top + dh - 1, W, H - top - dh + 1);
  } else {
    // wider than the flag: meet the shape halfway, stretch a little and crop the rest
    const r = Math.sqrt(fa * ta);
    let dw, dh;
    if (r > ta) { dh = H; dw = H * r; } else { dw = W; dh = W / r; }
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  // a whisper of light falloff so the enamel reads as a surface
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function strataTexture(colors) {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 256;
  const ctx = cv.getContext('2d');
  const bands = [0, 0.18, 0.3, 0.52, 0.62, 0.8, 1];
  for (let i = 0; i < bands.length - 1; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(0, bands[i] * 256, 4, (bands[i + 1] - bands[i]) * 256 + 1);
  }
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------ geometry ------------------------------ */

function plinthShape(kind, hw, hh) {
  const s = new THREE.Shape();
  if (kind === 'circle') {
    s.absarc(0, 0, hw, 0, Math.PI * 2, false);
    return s;
  }
  if (kind === 'hex' || kind === 'oct') {
    const n = kind === 'hex' ? 6 : 8;
    const r = hw / Math.cos(Math.PI / n);
    const rot = kind === 'hex' ? 0 : Math.PI / 8;
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i) s.lineTo(x, y); else s.moveTo(x, y);
    }
    s.closePath();
    return s;
  }
  const r = kind === 'square' ? Math.min(hw, hh) * 0.06 : Math.min(hw, hh) * 0.22;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

function plinthSize(kind, geo) {
  const [ex, ey] = geo.extent;
  if (kind === 'circle') return [MAP * 0.985, MAP * 0.985];
  if (kind === 'hex') return [MAP * 0.86, MAP * 0.86];
  if (kind === 'oct') return [MAP * 0.915, MAP * 0.915];
  if (kind === 'square') return [MAP * 0.97, MAP * 0.97];
  return [MAP * clamp(ex * 1.3, 0.56, 0.97), MAP * clamp(ey * 1.3, 0.56, 0.97)];
}

const clipMat = (mat) => { mat.clippingPlanes = [clipPlane]; mat.clipShadows = true; return mat; };

function extrudeUp(shapes, depth, bevel, uv) {
  const geom = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.75,
    bevelSegments: 2,
    curveSegments: 72,
    UVGenerator: uv,
  });
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, bevel, 0);
  geom.computeVertexNormals();
  return geom;
}

async function buildModel(c) {
  const [geo, flag] = await Promise.all([loadGeo(c.code), loadFlag(c.code)]);
  await document.fonts.load('600 32px Geologica').catch(() => {});
  const sc = c.scene;
  const group = new THREE.Group();
  const holder = new THREE.Group(); // sways and rotates
  group.add(holder);

  const kind = sc.pedestal.shape;
  const [hw, hh] = plinthSize(kind, geo);
  const pedH = sc.pedestal.height;
  const plinthH = sc.pedestal.plinth ? 0.24 : 0;
  const baseY = sc.pedestal.float ? 0.95 : 0;
  let y = baseY;

  // lower plinth
  if (plinthH) {
    const g = extrudeUp(plinthShape(kind, hw * 1.075, hh * 1.075 + (hw - hh) * 0), plinthH, 0.05);
    const m = new THREE.Mesh(g, clipMat(new THREE.MeshStandardMaterial({ color: sc.pedestal.plinthColor, roughness: 0.7, metalness: 0.05 })));
    m.position.y = y;
    m.castShadow = m.receiveShadow = true;
    holder.add(m);
    y += plinthH + 0.1;
  }

  // the map pedestal
  const mapTex = mapTexture(geo, c, kind, hw, hh);
  const pedUV = {
    generateTopUV(g, v, a, b, cc) {
      const f = (i) => new THREE.Vector2((v[i * 3] / MAP + 1) / 2, (v[i * 3 + 1] / MAP + 1) / 2);
      return [f(a), f(b), f(cc)];
    },
    generateSideWallUV(g, v, a, b, cc, d) {
      const f = (i) => new THREE.Vector2(0.5, 0.5);
      return [f(a), f(b), f(cc), f(d)];
    },
  };
  const pedGeom = extrudeUp(plinthShape(kind, hw, hh), pedH, 0.06, pedUV);
  const sideMat = clipMat(new THREE.MeshStandardMaterial({ color: sc.pedestal.side, roughness: 0.55, metalness: 0.08 }));
  const topMat = clipMat(new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.82, metalness: 0 }));
  const ped = new THREE.Mesh(pedGeom, [topMat, sideMat]);
  ped.position.y = y;
  ped.castShadow = ped.receiveShadow = true;
  holder.add(ped);
  const mapTop = y + pedH + 0.12;

  // metal bezel around the map
  const t = 0.16;
  const outer = plinthShape(kind, hw + t, hh + t);
  outer.holes.push(new THREE.Path(plinthShape(kind, hw - 0.02, hh - 0.02).getPoints(96)));
  const bezel = new THREE.Mesh(
    extrudeUp(outer, 0.16, 0.025),
    clipMat(new THREE.MeshStandardMaterial({ color: sc.pedestal.rim, metalness: 0.92, roughness: 0.28, emissive: sc.pedestal.glow || '#000000', emissiveIntensity: sc.pedestal.glow ? 0.55 : 0 })),
  );
  bezel.position.y = mapTop - 0.16;
  bezel.castShadow = true;
  holder.add(bezel);

  // the country slab: flag on top, strata on the sides
  const ex = geo.extent[0] * MAP, ey = geo.extent[1] * MAP;
  const depth = sc.slab.depth;
  const bevel = 0.05;
  const total = depth + bevel * 2;
  const slabUV = {
    generateTopUV(g, v, a, b, cc) {
      const f = (i) => new THREE.Vector2((v[i * 3] + ex) / (2 * ex), (v[i * 3 + 1] + ey) / (2 * ey));
      return [f(a), f(b), f(cc)];
    },
    generateSideWallUV(g, v, a, b, cc, d) {
      const f = (i) => new THREE.Vector2(0.5, clamp((v[i * 3 + 2] + bevel) / total, 0, 1));
      return [f(a), f(b), f(cc), f(d)];
    },
  };
  const shapes = geo.slab.map((poly) => {
    const sh = new THREE.Shape(poly[0].map(([px, py]) => new THREE.Vector2(px * MAP, py * MAP)));
    for (const h of poly.slice(1)) sh.holes.push(new THREE.Path(h.map(([px, py]) => new THREE.Vector2(px * MAP, py * MAP))));
    return sh;
  });
  const slabGeom = new THREE.ExtrudeGeometry(shapes, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.035, bevelSegments: 2, curveSegments: 1, UVGenerator: slabUV,
  });
  slabGeom.rotateX(-Math.PI / 2);
  slabGeom.translate(0, bevel, 0);
  slabGeom.computeVertexNormals();
  const flagMat = clipMat(new THREE.MeshPhysicalMaterial({ map: flagTexture(flag, ex, ey), roughness: 0.4, metalness: 0, clearcoat: 0.32, clearcoatRoughness: 0.35 }));
  const strataMat = clipMat(new THREE.MeshStandardMaterial({ map: strataTexture(sc.slab.strata), roughness: 0.7, metalness: 0.05 }));
  const slab = new THREE.Mesh(slabGeom, [flagMat, strataMat]);
  slab.position.y = mapTop + 0.004;
  slab.castShadow = slab.receiveShadow = true;
  holder.add(slab);
  const slabTop = mapTop + 0.004 + total;

  // capital pin and city studs
  const anchors = [];
  const accent = new THREE.Color(c.theme.accent);
  const pinMetal = clipMat(new THREE.MeshStandardMaterial({ color: sc.pedestal.rim, metalness: 0.95, roughness: 0.25 }));
  let pulse = null;
  for (const city of geo.cities) {
    const px = city.x * MAP, pz = -city.y * MAP;
    if (city.capital) {
      const pin = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.35, 16), pinMetal);
      stem.position.y = 0.675;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 32, 16),
        clipMat(new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.2 })),
      );
      head.position.y = 1.38;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.24, 48),
        clipMat(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide })),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      pulse = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.26, 48),
        clipMat(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide })),
      );
      pulse.rotation.x = -Math.PI / 2;
      pulse.position.y = 0.014;
      stem.castShadow = head.castShadow = true;
      pin.add(stem, head, ring, pulse);
      pin.position.set(px, slabTop, pz);
      holder.add(pin);
      const anchor = new THREE.Object3D();
      anchor.position.set(px, slabTop + 1.62, pz);
      holder.add(anchor);
      anchors.push({ obj: anchor, name: city.name, capital: true });
    } else {
      const stud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.06, 24),
        clipMat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.15 })),
      );
      stud.position.set(px, slabTop + 0.03, pz);
      stud.castShadow = true;
      holder.add(stud);
      const anchor = new THREE.Object3D();
      anchor.position.set(px, slabTop + 0.16, pz);
      holder.add(anchor);
      anchors.push({ obj: anchor, name: city.name, capital: false });
    }
  }

  const height = slabTop + 1.6;
  const fitPoints = [];
  for (const p of plinthShape(kind, hw + t, hh + t).getPoints(40)) {
    fitPoints.push(new THREE.Vector3(p.x, baseY - 0.05, -p.y), new THREE.Vector3(p.x, mapTop + 0.06, -p.y));
  }
  for (const [sx, sz] of [[-ex, -ey], [ex, -ey], [-ex, ey], [ex, ey]]) fitPoints.push(new THREE.Vector3(sx, slabTop, sz));
  const cap = anchors.find((a) => a.capital);
  if (cap) fitPoints.push(cap.obj.position.clone().add(new THREE.Vector3(0, 0.75, 0)));
  return {
    fitPoints,
    c, group, holder, anchors, pulse,
    baseY, height, mapTop, slabTop,
    radius: Math.max(hw, hh) + t,
    float: !!sc.pedestal.float,
    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    },
  };
}

/* ------------------------------ camera & lights ------------------------------ */

const cam = { az: 0, el: 35, dist: 20, fov: 30, ty: 1.3, ox: 0, oy: 0 }; // current values (tweened)
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
let viewport = { w: innerWidth, h: innerHeight };

// the free rectangle (in px) between the title, the card and the controls
function stageArea() {
  const w = viewport.w, h = viewport.h;
  const hero = $('.hero').getBoundingClientRect();
  if (isSmall()) {
    const y0 = hero.bottom + 8;
    return { x0: 10, x1: w - 10, y0, y1: Math.min(h - 80, y0 + h * 0.46 - 14) };
  }
  const card = ui.card.getBoundingClientRect();
  return { x0: 30, x1: card.left - 34, y0: hero.bottom + 14, y1: h - 108 };
}

// find the distance and view offset that put the whole model inside the free rectangle
const fitCam = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
const fitV = new THREE.Vector3();
function framing(model) {
  const sc = model.c.scene.camera;
  const w = viewport.w, h = viewport.h;
  const area = stageArea();
  const aw = Math.max(120, area.x1 - area.x0), ah = Math.max(120, area.y1 - area.y0);
  const ty = (model.baseY + model.slabTop) / 2;
  const az = THREE.MathUtils.degToRad(sc.az), el = THREE.MathUtils.degToRad(sc.el);
  fitCam.fov = sc.fov;
  fitCam.aspect = w / h;
  fitCam.clearViewOffset();
  fitCam.updateProjectionMatrix();
  const fill = isSmall() ? 0.94 : 0.9;
  let d = 22, box = null;
  for (let it = 0; it < 6; it++) {
    fitCam.position.set(Math.sin(az) * Math.cos(el) * d, ty + Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    fitCam.lookAt(0, ty, 0);
    fitCam.updateMatrixWorld();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of model.fitPoints) {
      fitV.copy(p).project(fitCam);
      const px = (fitV.x * 0.5 + 0.5) * w, py = (-fitV.y * 0.5 + 0.5) * h;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    box = { x0, x1, y0, y1 };
    const k = Math.max((x1 - x0) / (aw * fill), (y1 - y0) / (ah * fill));
    d *= k;
  }
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  return {
    az: sc.az, el: sc.el, fov: sc.fov, dist: d, ty,
    ox: cx - (area.x0 + area.x1) / 2,
    oy: cy - (area.y0 + area.y1) / 2,
  };
}

function placeCamera() {
  const az = THREE.MathUtils.degToRad(cam.az + pointer.sx * 5);
  const el = THREE.MathUtils.degToRad(clamp(cam.el + pointer.sy * 3, 8, 80));
  camera.position.set(
    Math.sin(az) * Math.cos(el) * cam.dist,
    cam.ty + Math.sin(el) * cam.dist,
    Math.cos(az) * Math.cos(el) * cam.dist,
  );
  camera.lookAt(0, cam.ty, 0);
  camera.fov = cam.fov;
  camera.aspect = viewport.w / viewport.h;
  camera.setViewOffset(viewport.w, viewport.h, cam.ox, cam.oy, viewport.w, viewport.h);
}

function sph(azDeg, elDeg, r) {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
}

function lightTargets(c) {
  const s = c.scene;
  return {
    keyColor: new THREE.Color(s.key.color), keyI: s.key.intensity, keyPos: sph(s.key.az, s.key.el, 26),
    rimColor: new THREE.Color(s.rim.color), rimI: s.rim.intensity, rimPos: sph(s.key.az + 165, 24, 26),
    sky: new THREE.Color(s.hemi.sky), ground: new THREE.Color(s.hemi.ground), hemiI: s.hemi.intensity,
    env: s.env, exposure: s.exposure,
    shadow: new THREE.Color(c.theme.shadow),
  };
}

function applyLights(from, to, t) {
  key.color.copy(from.keyColor).lerp(to.keyColor, t);
  key.intensity = lerp(from.keyI, to.keyI, t);
  key.position.copy(from.keyPos).lerp(to.keyPos, t);
  rim.color.copy(from.rimColor).lerp(to.rimColor, t);
  rim.intensity = lerp(from.rimI, to.rimI, t);
  rim.position.copy(from.rimPos).lerp(to.rimPos, t);
  hemi.color.copy(from.sky).lerp(to.sky, t);
  hemi.groundColor.copy(from.ground).lerp(to.ground, t);
  hemi.intensity = lerp(from.hemiI, to.hemiI, t);
  scene.environmentIntensity = lerp(from.env, to.env, t);
  if (renderer) renderer.toneMappingExposure = lerp(from.exposure, to.exposure, t);
  floor.material.color.copy(from.shadow).lerp(to.shadow, t);
}

/* ------------------------------ labels ------------------------------ */

let labelEls = [];
function buildLabels(model) {
  ui.labels.replaceChildren();
  labelEls = model.anchors
    .slice()
    .sort((a, b) => (b.capital ? 1 : 0) - (a.capital ? 1 : 0))
    .map((a) => {
      const el = document.createElement('div');
      el.className = a.capital ? 'lab lab-capital' : 'lab';
      el.innerHTML = a.capital ? `<span class="lab-dot"></span>${a.name}<small>capital</small>` : a.name;
      ui.labels.appendChild(el);
      return { el, a, w: 0, h: 0 };
    });
  requestAnimationFrame(() => labelEls.forEach((l) => { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; }));
}
const tmpV = new THREE.Vector3();
function updateLabels() {
  const placed = [];
  for (const L of labelEls) {
    const { el, a } = L;
    a.obj.getWorldPosition(tmpV);
    const above = tmpV.y > 0.2;
    tmpV.project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * viewport.w;
    const y = (-tmpV.y * 0.5 + 0.5) * viewport.h;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    const top = a.capital ? y - L.h - 10 : y - L.h * 1.3;
    const r = { l: x - L.w / 2 - 4, r: x + L.w / 2 + 4, t: top - 3, b: top + L.h + 3 };
    const clash = placed.some((q) => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t);
    const show = above && tmpV.z < 1 && !clash;
    if (show) placed.push(r);
    el.style.opacity = show ? '' : '0';
  }
}

/* ------------------------------ UI ------------------------------ */

let activeLayer = ui.roomA;
function setRoom(c) {
  const t = c.theme;
  const next = activeLayer === ui.roomA ? ui.roomB : ui.roomA;
  next.style.setProperty('--bg-a', t.bgA);
  next.style.setProperty('--bg-b', t.bgB);
  next.style.setProperty('--spot', t.spot);
  next.classList.add('on');
  activeLayer.classList.remove('on');
  activeLayer = next;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t.bgB);
}

function setVars(c) {
  const t = c.theme;
  const r = document.documentElement.style;
  const vars = {
    '--ink': t.ink, '--ink-soft': t.inkSoft, '--accent': t.accent, '--accent-2': t.accent2,
    '--card': t.card, '--tile': t.tile, '--tile-ink': t.tileInk, '--tile-soft': t.tileSoft,
    '--sym-bg': t.symBg, '--sym-ink': t.symInk, '--sym-cap': SYM_CAPTION[c.code] || t.symInk,
    '--deep': t.deep, '--deep-ink': t.deepInk,
    '--medal': t.medal, '--medal-dark': shade(t.medal, -0.24), '--medal-light': shade(t.medal, 0.22),
    '--name-font': `"${c.font.family}"`, '--name-weight': c.font.weight, '--name-style': c.font.style,
    '--name-transform': c.font.transform, '--name-tracking': c.font.tracking, '--name-scale': c.font.size,
    '--name-stretch': c.font.stretch || '100%', '--num-scale': NUM_SCALE[c.code] || 1,
    '--card-ink': new THREE.Color(t.card).getHSL({}).l > 0.6 ? 'rgba(40,20,20,0.62)' : 'rgba(255,255,255,0.66)',
  };
  for (const [k, v] of Object.entries(vars)) r.setProperty(k, v);
  document.documentElement.dataset.country = c.code;
}

function splitName(text) {
  ui.name.replaceChildren();
  let i = 0;
  for (const word of text.split(' ')) {
    const w = document.createElement('span');
    w.className = 'word';
    for (const ch of word) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.setProperty('--i', i++);
      w.appendChild(s);
    }
    ui.name.appendChild(w);
  }
  ui.name.setAttribute('aria-label', text);
  fitName();
}

function fitName() {
  ui.name.style.setProperty('--name-fit', '1');
  const avail = ui.name.clientWidth - 6;
  let w = 0;
  ui.name.querySelectorAll('.word').forEach((el, i) => { w += el.offsetWidth + (i ? parseFloat(getComputedStyle(el).marginLeft) : 0); });
  if (w > avail && w > 0) ui.name.style.setProperty('--name-fit', (avail / w).toFixed(3));
}

function fitStats() {
  for (const v of ui.card.querySelectorAll('.stat-value')) {
    v.style.removeProperty('--fit');
    const box = v.parentElement;
    const avail = box.clientWidth - 2;
    if (v.scrollWidth > avail) v.style.setProperty('--fit', (avail / v.scrollWidth).toFixed(3));
  }
}

function fillCard(c) {
  ui.symArt.innerHTML = SYMBOLS[c.symbol.id]();
  ui.symCaption.textContent = c.symbol.caption;
  ui.symArt.title = c.symbol.caption;
  ui.capital.textContent = c.capital;
  ui.cis.textContent = c.cis;
  ui.desc.textContent = c.description;
  for (const [k, s] of Object.entries(c.stats)) {
    const el = ui.card.querySelector(`[data-stat="${k}"]`);
    $('.stat-value', el).innerHTML = `${s.value}${s.unit ? `<span class="unit"> ${s.unit}</span>` : ''}`;
    $('.stat-note', el).textContent = s.note;
  }
  ui.facts.innerHTML = c.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  ui.leaderName.textContent = c.leader.name;
  ui.leaderSince.textContent = `${c.leader.title}. ${c.leader.since}`;
  ui.leaderNote.textContent = c.leader.note || '';
  ui.leaderNote.hidden = !c.leader.note;
  ui.footnote.textContent = c.footnote || '';
  ui.footnote.hidden = !c.footnote;
  updateClock(c);
  requestAnimationFrame(fitStats);
}

function medalFace(c) {
  const l = c.leader;
  if (l.portrait) return `<img src="${l.portrait}" alt="" class="medal-portrait">`;
  const ring = `${l.name.toUpperCase()} • ${c.name.toUpperCase()} • `;
  return `<svg viewBox="0 0 100 100" class="medal-ring" aria-hidden="true"><defs><path id="mr-${c.code}" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0"/></defs>` +
    `<text><textPath href="#mr-${c.code}" textLength="236" lengthAdjust="spacing">${ring}</textPath></text></svg>` +
    `<span class="medal-initials">${l.initials}</span>`;
}

async function flipMedal(c, animate) {
  const front = $('.medal-front', ui.medal), back = $('.medal-back', ui.medal);
  ui.medal.setAttribute('aria-label', `Medallion for ${c.leader.name}`);
  if (!animate || reducedMotion.matches) { front.innerHTML = medalFace(c); return; }
  back.innerHTML = medalFace(c);
  ui.medal.classList.add('flipping');
  await wait(900);
  front.innerHTML = medalFace(c);
  ui.medal.classList.add('no-anim');
  ui.medal.classList.remove('flipping');
  void ui.medal.offsetWidth;
  ui.medal.classList.remove('no-anim');
}

let clockTimer = 0;
function updateClock(c) {
  clearInterval(clockTimer);
  const fmt = () => {
    try {
      const t = new Intl.DateTimeFormat('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit' }).format(new Date());
      ui.capTime.textContent = `${t} local time`;
    } catch { ui.capTime.textContent = ''; }
  };
  fmt();
  clockTimer = setInterval(fmt, 20000);
}

function buildRoute() {
  ui.route.innerHTML = COUNTRIES.map((c, i) =>
    `<li><button type="button" data-i="${i}" aria-label="${c.name}"><span class="dot"></span><span class="code">${c.code.toUpperCase()}</span><span class="tip">${c.name}</span></button></li>`,
  ).join('');
  ui.route.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const i = +b.dataset.i;
    if (i !== index) goTo(i, i > index ? 1 : -1);
  });
}

function updateNav() {
  const n = COUNTRIES.length;
  const p = COUNTRIES[(index - 1 + n) % n], q = COUNTRIES[(index + 1) % n];
  ui.prevName.textContent = p.name;
  ui.nextName.textContent = q.name;
  ui.prev.setAttribute('aria-label', `Previous country: ${p.name}`);
  ui.next.setAttribute('aria-label', `Next country: ${q.name}`);
  ui.route.querySelectorAll('button').forEach((b, i) => {
    b.classList.toggle('current', i === index);
    if (i === index) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  ui.counter.textContent = `${index + 1} of ${n}`;
  ui.route.style.setProperty('--progress', index / (n - 1));
}

function renderText(c) {
  splitName(c.name);
  ui.name.dataset.effect = c.font.effect;
  const nativeLang = { kz: 'kk', kg: 'ky', tj: 'tg', uz: 'uz', tm: 'tk', az: 'az', am: 'hy', md: 'ro', by: 'be', ru: 'ru' }[c.code];
  ui.native.innerHTML = c.native === c.name
    ? `<span class="official">${c.official}</span>`
    : `<span class="native-word" lang="${nativeLang}">${c.native}</span><span class="official">${c.official}</span>`;
  document.title = `${c.name} | CIS Atlas`;
}

/* ------------------------------ navigation ------------------------------ */

let index = 0;
let current = null;
let busy = false;
let queued = null;
let lights = null;
let dragRot = 0, dragVel = 0, lastInteract = 0, settledAt = 0;

async function goTo(i, dir = 1, first = false) {
  if (busy) { queued = { i, dir }; return; }
  busy = true;
  const n = COUNTRIES.length;
  index = (i + n) % n;
  const c = COUNTRIES[index];
  const quick = reducedMotion.matches;
  updateNav();
  history.replaceState(null, '', `#${c.name.toLowerCase()}`);

  // 1. text and tiles step out at once (CSS keeps animating even while the model is being built)
  if (!first) {
    ui.name.classList.add('leaving');
    ui.native.classList.add('leaving');
    ui.card.classList.add('leaving');
  }
  const fontP = fontReady(c);
  const modelP = renderer ? getModel(c) : Promise.resolve(null);
  if (!first) await wait(140);
  setRoom(c);
  setVars(c);
  const [model] = await Promise.all([modelP, fontP]);
  if (model) modelCache.delete(c.code);

  // 2. the old object sinks through the floor
  const old = current;
  if (old && !quick) {
    const r0 = old.holder.rotation.y;
    await tween(680, (t) => {
      old.group.position.y = old.baseY - t * (old.height + 1.2);
      old.holder.rotation.y = r0 + dir * 0.5 * t;
    }, ease.inCubic);
  }
  if (old) { scene.remove(old.group); old.dispose(); }

  // 2. new text and card
  renderText(c);
  fillCard(c);
  flipMedal(c, !first);
  ui.name.classList.remove('leaving');
  ui.native.classList.remove('leaving');
  ui.card.classList.remove('leaving');
  ui.card.classList.remove('entering');
  void ui.card.offsetWidth;
  ui.card.classList.add('entering');
  ui.status.textContent = `${c.name}, ${index + 1} of ${n}`;

  if (!model) { busy = false; return; }

  // 3. new object rises, camera and light glide to the new set-up
  current = model;
  scene.add(model.group);
  buildLabels(model);
  dragRot = 0; dragVel = 0;
  blob.scale.setScalar(model.radius * (model.float ? 2.0 : 2.5));
  blob.material.opacity = model.float ? 0.32 : 0.55;

  const fromCam = { ...cam };
  const toCam = framing(model);
  const fromL = lights || lightTargets(c);
  const toL = lightTargets(c);
  lights = toL;

  if (first || quick) {
    Object.assign(cam, toCam);
    applyLights(toL, toL, 1);
    model.group.position.y = model.baseY;
    if (first && !quick) {
      model.group.position.y = model.baseY - (model.height + 1.2);
      await tween(1500, (t) => {
        model.group.position.y = model.baseY - (1 - t) * (model.height + 1.2);
        model.holder.rotation.y = (1 - t) * -0.8;
      }, ease.outQuint);
    }
  } else {
    model.group.position.y = model.baseY - (model.height + 1.2);
    model.holder.rotation.y = -dir * 0.9;
    const camP = tween(1300, (t) => {
      cam.az = lerp(fromCam.az, toCam.az, t);
      cam.el = lerp(fromCam.el, toCam.el, t);
      cam.dist = lerp(fromCam.dist, toCam.dist, t);
      cam.fov = lerp(fromCam.fov, toCam.fov, t);
      cam.ty = lerp(fromCam.ty, toCam.ty, t);
      cam.ox = lerp(fromCam.ox, toCam.ox, t);
      cam.oy = lerp(fromCam.oy, toCam.oy, t);
      applyLights(fromL, toL, t);
    }, ease.inOutCubic);
    const riseP = tween(1250, (t) => {
      model.group.position.y = model.baseY - (1 - t) * (model.height + 1.2);
      model.holder.rotation.y = -dir * 0.9 * (1 - t);
    }, ease.outQuint);
    await Promise.all([camP, riseP]);
  }

  settledAt = performance.now();
  busy = false;
  prefetch(index);
  if (queued) { const q = queued; queued = null; goTo(q.i, q.dir); }
}

// neighbours are built ahead of time so the arrows respond without a pause
const modelCache = new Map();
function getModel(c) {
  if (!modelCache.has(c.code)) {
    modelCache.set(c.code, buildModel(c).then((m) => {
      m.group.traverse((o) => {
        if (!o.material) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => { if (mm.map) renderer.initTexture(mm.map); });
      });
      return m;
    }));
  }
  return modelCache.get(c.code);
}

function prefetch(i) {
  const n = COUNTRIES.length;
  const want = new Set([i + 1, i - 1].map((k) => COUNTRIES[(k + n) % n].code));
  for (const [code, p] of modelCache) {
    if (!want.has(code)) { modelCache.delete(code); p.then((m) => m.dispose()).catch(() => {}); }
  }
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  [i + 1, i - 1, i + 2].forEach((k, j) => {
    const c = COUNTRIES[(k + n) % n];
    loadGeo(c.code); loadFlag(c.code); fontReady(c);
    if (renderer && j < 2) setTimeout(() => idle(() => { if (!busy && want.has(c.code)) getModel(c); }, { timeout: 2000 }), 400 + j * 500);
  });
}

const next = () => goTo(index + 1, 1);
const prev = () => goTo(index - 1, -1);

/* ------------------------------ input ------------------------------ */

ui.next.addEventListener('click', next);
ui.prev.addEventListener('click', prev);
addEventListener('keydown', (e) => {
  if (ui.about.open || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
});

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  dragging = { x: e.clientX, id: e.pointerId };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('grabbing');
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || e.pointerId !== dragging.id) return;
  const dx = e.clientX - dragging.x;
  dragging.x = e.clientX;
  dragVel = dx * 0.0065;
  dragRot += dragVel;
  lastInteract = performance.now();
});
const endDrag = () => { dragging = null; canvas.classList.remove('grabbing'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
});

// medallion follows the pointer like a coin in the hand
const medalWrap = $('.medal-wrap');
ui.card.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const r = medalWrap.getBoundingClientRect();
  const mx = clamp((e.clientX - (r.left + r.width / 2)) / 260, -1, 1);
  const my = clamp((e.clientY - (r.top + r.height / 2)) / 260, -1, 1);
  ui.medal.style.setProperty('--ry', `${(mx * 28).toFixed(1)}deg`);
  ui.medal.style.setProperty('--rx', `${(-my * 22).toFixed(1)}deg`);
  ui.medal.style.setProperty('--sheen', `${(mx * 40).toFixed(1)}%`);
});
ui.card.addEventListener('pointerleave', () => {
  ui.medal.style.setProperty('--ry', '0deg');
  ui.medal.style.setProperty('--rx', '0deg');
  ui.medal.style.setProperty('--sheen', '0%');
});

$('#aboutBtn').addEventListener('click', () => ui.about.showModal());
$('#aboutClose').addEventListener('click', () => ui.about.close());
ui.about.addEventListener('click', (e) => { if (e.target === ui.about) ui.about.close(); });
$('#sourceList').innerHTML = SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`).join('');

/* ------------------------------ resize & loop ------------------------------ */

function resize() {
  viewport = { w: innerWidth, h: innerHeight };
  if (!renderer) return;
  const dpr = Math.min(devicePixelRatio || 1, isSmall() ? 1.6 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(viewport.w, viewport.h, false);
  fitName();
  if (current && !busy) Object.assign(cam, framing(current));
  fitStats();
}
addEventListener('resize', resize);

let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  runTweens(now);
  if (!renderer) return;

  const calm = reducedMotion.matches;
  pointer.sx = lerp(pointer.sx, calm ? 0 : pointer.x, 1 - Math.pow(0.002, dt));
  pointer.sy = lerp(pointer.sy, calm ? 0 : pointer.y, 1 - Math.pow(0.002, dt));

  if (current) {
    if (!dragging) {
      dragVel *= Math.pow(0.04, dt);
      dragRot += dragVel;
      if (now - lastInteract > 3500) dragRot *= Math.pow(0.35, dt); // ease back to the designed angle
    }
    const amp = calm ? 0 : clamp((now - settledAt) / 2500, 0, 1);
    const k = now - settledAt;
    const sway = Math.sin(k * 0.00042) * 0.055 * amp;
    if (!busy) current.holder.rotation.y = dragRot + sway;
    if (current.float && !busy) current.group.position.y = current.baseY + Math.sin(k * 0.0012) * 0.09 * amp;
    if (current.pulse) {
      const p = calm ? 0.5 : (now * 0.0006) % 1;
      current.pulse.scale.setScalar(1 + p * 3.2);
      current.pulse.material.opacity = 0.7 * (1 - p);
    }
  }
  placeCamera();
  renderer.render(scene, camera);
  updateLabels();
}

/* ------------------------------ start ------------------------------ */

async function start() {
  buildRoute();
  resize();
  const fromHash = decodeURIComponent(location.hash.slice(1)).toLowerCase();
  const startIdx = Math.max(0, COUNTRIES.findIndex((c) => c.name.toLowerCase() === fromHash || c.code === fromHash));
  ui.loaderBar.style.transform = 'scaleX(0.35)';
  await document.fonts.load('400 16px Geologica').catch(() => {});
  ui.loaderBar.style.transform = 'scaleX(0.6)';
  requestAnimationFrame(frame);
  const firstC = COUNTRIES[startIdx];
  setRoom(firstC);
  setVars(firstC);
  await Promise.all([loadGeo(firstC.code), loadFlag(firstC.code), fontReady(firstC)]);
  ui.loaderBar.style.transform = 'scaleX(1)';
  ui.loader.classList.add('done');
  setTimeout(() => ui.loader.remove(), 900);
  await goTo(startIdx, 1, true);
  // warm the remaining display fonts quietly
  COUNTRIES.forEach((c) => fontReady(c));
}

start();
