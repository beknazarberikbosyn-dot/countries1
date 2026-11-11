// Hand-drawn symbol for each country, shown in the top-left tile of the card.
// Every symbol is an original SVG drawing (viewBox 0 0 120 120) shaded with
// gradients so it reads as a small sculpted object.

const svg = (id, body, defs = '') =>
  `<svg viewBox="0 0 120 120" role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
  `<defs>${defs}<filter id="${id}-drop" x="-30%" y="-30%" width="160%" height="160%">` +
  `<feDropShadow dx="0" dy="3.5" stdDeviation="3" flood-color="#000" flood-opacity="0.32"/></filter></defs>` +
  `<g filter="url(#${id}-drop)">${body}</g></svg>`;

function shanyrak() {
  const id = 'sy-kz';
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r1 = 49, r2 = i % 2 ? 55 : 58;
    return `<line x1="${60 + Math.cos(a) * r1}" y1="${60 + Math.sin(a) * r1}" x2="${60 + Math.cos(a) * r2}" y2="${60 + Math.sin(a) * r2}"/>`;
  }).join('');
  const defs =
    `<linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".45" stop-color="#e9b21d"/><stop offset="1" stop-color="#9a6b06"/></linearGradient>` +
    `<radialGradient id="${id}-in" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#2a8fc8"/><stop offset="1" stop-color="#0a3a5c"/></radialGradient>` +
    `<clipPath id="${id}-c"><circle cx="60" cy="60" r="41"/></clipPath>`;
  const body =
    `<g stroke="url(#${id}-g)" stroke-width="3.2" stroke-linecap="round">${rays}</g>` +
    `<circle cx="60" cy="60" r="41" fill="url(#${id}-in)"/>` +
    `<g clip-path="url(#${id}-c)" fill="none" stroke="url(#${id}-g)" stroke-width="5.5" stroke-linecap="round">` +
    `<path d="M45 14 Q53 60 45 106"/><path d="M60 12 V108"/><path d="M75 14 Q67 60 75 106"/>` +
    `<path d="M14 45 Q60 53 106 45"/><path d="M12 60 H108"/><path d="M14 75 Q60 67 106 75"/></g>` +
    `<circle cx="60" cy="60" r="43" fill="none" stroke="url(#${id}-g)" stroke-width="8"/>` +
    `<circle cx="60" cy="60" r="43" fill="none" stroke="#fff6cf" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="2 5"/>`;
  return svg(id, body, defs);
}

function kalpak() {
  const id = 'sy-kg';
  const defs =
    `<linearGradient id="${id}-felt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9cdb5"/><stop offset=".35" stop-color="#fffaf0"/><stop offset=".7" stop-color="#f3ead8"/><stop offset="1" stop-color="#c9bb9e"/></linearGradient>` +
    `<linearGradient id="${id}-vel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a3a"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient>`;
  const body =
    `<path d="M30 90 C31 60 42 27 60 15 C78 27 89 60 90 90 Z" fill="url(#${id}-felt)"/>` +
    `<path d="M60 15 C55 40 54 64 56 88" fill="none" stroke="#bfae8c" stroke-width="1.4"/>` +
    `<g fill="none" stroke="#7e120d" stroke-width="2" stroke-linecap="round">` +
    `<path d="M44 66 C48 58 54 58 56 64 C58 70 52 72 50 67"/><path d="M76 66 C72 58 66 58 64 64 C62 70 68 72 70 67"/>` +
    `<path d="M50 46 C54 40 58 42 58 47"/><path d="M70 46 C66 40 62 42 62 47"/></g>` +
    `<path d="M24 92 C40 80 80 80 96 92 L94 102 C78 94 42 94 26 102 Z" fill="url(#${id}-vel)"/>` +
    `<path d="M55 95 L60 82 L65 95 Z" fill="#fffaf0"/>` +
    `<path d="M24 92 C40 80 80 80 96 92" fill="none" stroke="#ffd200" stroke-width="1.6"/>` +
    `<circle cx="60" cy="14" r="3.6" fill="#7e120d"/><path d="M60 17 C57 9 52 6 49 7 M60 17 C63 9 68 6 71 7" stroke="#7e120d" stroke-width="1.6" fill="none"/>`;
  return svg(id, body, defs);
}

function crown() {
  const id = 'sy-tj';
  const star = (cx, cy, r) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.42 : r;
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
    }
    return `<polygon points="${pts.join(' ')}"/>`;
  };
  const stars = Array.from({ length: 7 }, (_, i) => {
    const a = Math.PI + ((i + 1) / 8) * Math.PI;
    return star(60 + Math.cos(a) * 41, 74 + Math.sin(a) * 41, 6.2);
  }).join('');
  const defs = `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#f8c300"/><stop offset="1" stop-color="#a87400"/></linearGradient>`;
  const body =
    `<g fill="url(#${id}-g)">${stars}</g>` +
    `<g fill="url(#${id}-g)">` +
    `<path d="M38 88 C38 70 46 58 60 54 C74 58 82 70 82 88 Z"/>` +
    `<rect x="34" y="86" width="52" height="11" rx="3"/>` +
    `<circle cx="60" cy="50" r="4.5"/></g>` +
    `<g fill="none" stroke="#a87400" stroke-width="1.6"><path d="M48 86 C48 72 53 63 60 59 C67 63 72 72 72 86"/><path d="M60 59 V86"/></g>` +
    `<g fill="#cc1f1f"><circle cx="46" cy="91.5" r="2.2"/><circle cx="60" cy="91.5" r="2.2"/><circle cx="74" cy="91.5" r="2.2"/></g>`;
  return svg(id, body, defs);
}

function dome() {
  const id = 'sy-uz';
  const defs =
    `<linearGradient id="${id}-d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d6e74"/><stop offset=".45" stop-color="#5fe0d6"/><stop offset="1" stop-color="#0b5560"/></linearGradient>` +
    `<linearGradient id="${id}-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6cf98"/><stop offset="1" stop-color="#b8945a"/></linearGradient>` +
    `<pattern id="${id}-t" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#1e3a8a"/><path d="M4 0 L8 4 L4 8 L0 4 Z" fill="#2f6fd0"/><circle cx="4" cy="4" r="1.2" fill="#f1c75b"/></pattern>`;
  const ribs = [-14, -7, 0, 7, 14].map((dx) => `<path d="M${60 + dx * 0.25} 14 C${60 + dx * 1.15} 24 ${60 + dx * 1.45} 36 ${60 + dx * 1.2} 46"/>`).join('');
  const body =
    `<rect x="44" y="40" width="32" height="12" fill="url(#${id}-p)"/>` +
    `<path d="M60 12 C76 18 82 32 78 44 L42 44 C38 32 44 18 60 12 Z" fill="url(#${id}-d)"/>` +
    `<g fill="none" stroke="#0a4f5a" stroke-opacity=".55" stroke-width="1.3">${ribs}</g>` +
    `<path d="M60 12 V5" stroke="#f1c75b" stroke-width="2"/><circle cx="60" cy="5" r="2.2" fill="#f1c75b"/>` +
    `<rect x="18" y="50" width="84" height="56" rx="2" fill="url(#${id}-p)"/>` +
    `<rect x="24" y="56" width="72" height="50" fill="url(#${id}-t)"/>` +
    `<path d="M40 106 V80 C40 68 50 60 60 58 C70 60 80 68 80 80 V106 Z" fill="#0b2e57"/>` +
    `<path d="M46 106 V82 C46 72 53 66 60 64 C67 66 74 72 74 82 V106 Z" fill="#103f6e"/>` +
    `<path d="M40 80 C40 68 50 60 60 58 C70 60 80 68 80 80" fill="none" stroke="#f1c75b" stroke-width="2"/>` +
    `<rect x="18" y="50" width="84" height="5" fill="#f1c75b"/>`;
  return svg(id, body, defs);
}

function gol() {
  const id = 'sy-tm';
  const oct = (r, rot = Math.PI / 8) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = rot + (i * Math.PI) / 4;
      return `${(60 + Math.cos(a) * r).toFixed(2)},${(60 + Math.sin(a) * r).toFixed(2)}`;
    }).join(' ');
  const hooks = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x = 60 + Math.cos(a) * 50, y = 60 + Math.sin(a) * 50;
    return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(a * 180) / Math.PI + 90})"><path d="M-6 3 L0 -4 L6 3 M-3 3 L-3 -1 M3 3 L3 -1" /></g>`;
  }).join('');
  const defs = `<radialGradient id="${id}-g" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="#d23a4c"/><stop offset="1" stop-color="#7a0f20"/></radialGradient>`;
  const body =
    `<polygon points="${oct(46)}" fill="url(#${id}-g)" stroke="#fbf8f1" stroke-width="2.4"/>` +
    `<polygon points="${oct(36)}" fill="#fbf8f1"/>` +
    `<path d="M60 26 V94 M26 60 H94" stroke="#7a0f20" stroke-width="2"/>` +
    `<path d="M60 27 L93 60 L60 60 Z M27 60 L60 93 L60 60 Z" fill="#e07b1f"/>` +
    `<path d="M60 27 L27 60 L60 60 Z M93 60 L60 93 L60 60 Z" fill="#00843d"/>` +
    `<g fill="#fbf8f1"><path d="M60 40 L66 50 L60 54 L54 50 Z"/><path d="M60 80 L66 70 L60 66 L54 70 Z"/><path d="M40 60 L50 54 L54 60 L50 66 Z"/><path d="M80 60 L70 54 L66 60 L70 66 Z"/></g>` +
    `<circle cx="60" cy="60" r="5" fill="#1d2a22"/>` +
    `<g fill="none" stroke="#fbf8f1" stroke-width="2.2" stroke-linecap="round">${hooks}</g>`;
  return svg(id, body, defs);
}

function buta() {
  const id = 'sy-az';
  const defs =
    `<radialGradient id="${id}-g" cx=".45" cy=".7" r=".8"><stop offset="0" stop-color="#fff1b0"/><stop offset=".35" stop-color="#ffb23a"/><stop offset=".75" stop-color="#f05a12"/><stop offset="1" stop-color="#a8260a"/></radialGradient>` +
    `<linearGradient id="${id}-i" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#00b5e2"/><stop offset="1" stop-color="#2c2775"/></linearGradient>`;
  const body =
    `<path d="M76 10 C70 22 48 30 36 48 C24 66 28 92 48 102 C68 112 94 100 96 78 C98 60 82 50 70 56 C60 61 62 76 72 74 C64 72 64 62 72 61 C80 60 84 70 82 78 C79 92 62 98 50 90 C38 82 38 64 50 50 C60 38 74 30 76 10 Z" fill="url(#${id}-g)"/>` +
    `<path d="M70 26 C60 36 44 44 40 62 C37 76 46 90 60 92" fill="none" stroke="url(#${id}-i)" stroke-width="3" stroke-linecap="round"/>` +
    `<g fill="#fff4dc"><circle cx="52" cy="58" r="2.4"/><circle cx="48" cy="68" r="2.4"/><circle cx="50" cy="78" r="2.4"/><circle cx="58" cy="85" r="2.4"/><circle cx="58" cy="48" r="2.4"/></g>`;
  return svg(id, body, defs);
}

function pomegranate() {
  const id = 'sy-am';
  const defs =
    `<radialGradient id="${id}-g" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#ff6a5a"/><stop offset=".55" stop-color="#d90012"/><stop offset="1" stop-color="#6e0008"/></radialGradient>` +
    `<linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ad06a"/><stop offset="1" stop-color="#3f7a2a"/></linearGradient>`;
  const seeds = [[54, 74], [62, 70], [70, 76], [58, 82], [66, 84], [50, 84], [74, 86], [62, 92]]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.3" ry="4" fill="#ff2a3a" stroke="#ffd3d3" stroke-width=".8"/>`).join('');
  const body =
    `<path d="M88 34 C98 26 108 30 110 36 C100 42 92 40 88 34 Z" fill="url(#${id}-l)"/>` +
    `<path d="M50 30 L52 18 L56 26 L60 14 L64 26 L68 18 L70 30 Z" fill="#a8000d"/>` +
    `<circle cx="60" cy="68" r="38" fill="url(#${id}-g)"/>` +
    `<path d="M44 70 C46 62 54 58 62 60 C72 62 80 70 80 80 C80 94 66 100 56 98 C46 96 42 82 44 70 Z" fill="#f6d4c2"/>` +
    `<path d="M47 72 C49 66 55 63 62 64 C70 66 76 72 76 80 C76 91 65 96 57 94 C49 92 45 82 47 72 Z" fill="#8a0010"/>` +
    seeds +
    `<ellipse cx="44" cy="48" rx="9" ry="5" fill="#fff" fill-opacity=".35" transform="rotate(-35 44 48)"/>`;
  return svg(id, body, defs);
}

function grapes() {
  const id = 'sy-md';
  const defs =
    `<radialGradient id="${id}-g" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff6c4"/><stop offset=".5" stop-color="#e4c34a"/><stop offset="1" stop-color="#8a6d10"/></radialGradient>` +
    `<linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8d96a"/><stop offset="1" stop-color="#4e7a22"/></linearGradient>`;
  const layer = (rows, r, fill, extra = '') =>
    rows.map(([n, y]) => Array.from({ length: n }, (_, i) => {
      const x = 60 - ((n - 1) * 12.5) / 2 + i * 12.5;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
    }).join('')).join('');
  const grapesSvg =
    layer([[3, 56], [2, 68], [1, 80]], 7.4, '#6b520a') +
    layer([[4, 50], [3, 62], [2, 74], [1, 86]], 7.2, `url(#${id}-g)`, 'stroke="#6b520a" stroke-opacity=".35"') +
    layer([[1, 98]], 6.6, `url(#${id}-g)`, 'stroke="#6b520a" stroke-opacity=".35"');
  const body =
    `<path d="M60 44 C60 32 64 24 72 18" fill="none" stroke="#6b4a1e" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M66 26 C70 14 86 8 98 14 C92 18 96 24 104 24 C98 30 102 36 108 38 C96 44 84 40 78 34 C76 40 70 40 66 36 C70 32 68 28 66 26 Z" fill="url(#${id}-l)"/>` +
    `<path d="M70 30 C80 26 90 26 100 30" fill="none" stroke="#3c5f19" stroke-width="1.2"/>` +
    `<path d="M50 34 C44 30 42 22 48 20 C54 18 54 26 49 26" fill="none" stroke="#6b8a2a" stroke-width="1.8" stroke-linecap="round"/>` +
    grapesSvg;
  return svg(id, body, defs);
}

function ornament() {
  const id = 'sy-by';
  const N = 15, c = 7, cell = 6.4, o = 60 - (N * cell) / 2;
  let rects = '';
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const d = Math.abs(i - c) + Math.abs(j - c);
      const onAxis = i === c || j === c;
      const fill =
        d === 7 ||
        (d === 5 && (i + j) % 2 === 0) ||
        d === 3 ||
        (d <= 1 && onAxis) ||
        (d === 0) ||
        (onAxis && d >= 5 && d <= 7) ||
        (Math.abs(i - c) === Math.abs(j - c) && d === 2);
      if (fill) rects += `<rect x="${(o + i * cell).toFixed(2)}" y="${(o + j * cell).toFixed(2)}" width="${cell - 0.7}" height="${cell - 0.7}" rx=".8"/>`;
    }
  }
  const defs = `<linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0464e"/><stop offset="1" stop-color="#9a141b"/></linearGradient>`;
  const body = `<g fill="url(#${id}-g)">${rects}</g>`;
  return svg(id, body, defs);
}

function domes() {
  const id = 'sy-ru';
  const onion = (cx, base, w, h, fill) =>
    `<path d="M${cx} ${base - h} C${cx - w * 0.32} ${base - h * 0.72} ${cx - w * 0.62} ${base - h * 0.5} ${cx - w * 0.5} ${base - h * 0.18} C${cx - w * 0.42} ${base} ${cx + w * 0.42} ${base} ${cx + w * 0.5} ${base - h * 0.18} C${cx + w * 0.62} ${base - h * 0.5} ${cx + w * 0.32} ${base - h * 0.72} ${cx} ${base - h} Z" fill="${fill}"/>`;
  const defs =
    `<linearGradient id="${id}-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e0c22"/><stop offset=".45" stop-color="#ff5a6e"/><stop offset="1" stop-color="#8e0c22"/></linearGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0f2a6b"/><stop offset=".45" stop-color="#6f98ff"/><stop offset="1" stop-color="#0f2a6b"/></linearGradient>` +
    `<linearGradient id="${id}-c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6b06"/><stop offset=".45" stop-color="#ffe7a0"/><stop offset="1" stop-color="#9a6b06"/></linearGradient>` +
    `<pattern id="${id}-s" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="7" height="7" fill="url(#${id}-b)"/><rect width="3" height="7" fill="#fff" fill-opacity=".85"/></pattern>` +
    `<linearGradient id="${id}-w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8cfdb"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#b3bccb"/></linearGradient>`;
  const body =
    `<rect x="22" y="70" width="18" height="30" fill="url(#${id}-w)"/><rect x="80" y="70" width="18" height="30" fill="url(#${id}-w)"/>` +
    `<rect x="47" y="56" width="26" height="44" fill="url(#${id}-w)"/>` +
    onion(31, 72, 22, 30, `url(#${id}-a)`) + onion(89, 72, 22, 30, `url(#${id}-s)`) +
    onion(60, 58, 32, 42, `url(#${id}-c)`) +
    `<g stroke="#9a6b06" stroke-width="2"><path d="M31 42 V34"/><path d="M89 42 V34"/><path d="M60 16 V6"/></g>` +
    `<g fill="#f6d77a"><circle cx="31" cy="33" r="2"/><circle cx="89" cy="33" r="2"/><circle cx="60" cy="5" r="2.4"/></g>` +
    `<g fill="#13233f" fill-opacity=".75"><path d="M55 100 V84 C55 80 65 80 65 84 V100 Z"/><rect x="28" y="80" width="6" height="10" rx="3"/><rect x="86" y="80" width="6" height="10" rx="3"/></g>` +
    `<rect x="16" y="99" width="88" height="7" rx="1.5" fill="#c8cfdb"/>`;
  return svg(id, body, defs);
}

export const SYMBOLS = {
  shanyrak, kalpak, crown, dome, gol, buta, pomegranate, grapes, ornament, domes,
};
