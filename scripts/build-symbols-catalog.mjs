import fs from 'node:fs';
import pc from 'polygon-clipping';

const facultyIcons = [
  { id: 'graduation-cap', lucide: 'graduation-cap', label: 'Tocco di laurea', category: 'Laurea', description: 'Tocco accademico con nappa pendente' },
  { id: 'crown', isCustom: true, label: 'Corona d’alloro', category: 'Laurea', description: 'Corona d’alloro di laurea tradizionale' },
  { id: 'award', lucide: 'award', label: 'Premio accademico', category: 'Laurea', description: 'Coccarda e medaglia al merito' },
  { id: 'ingegneria', lucide: 'cog', label: 'Ingegneria', category: 'Stem', description: 'Ingranaggio meccanico dentato' },
  { id: 'economia', lucide: 'trending-up', label: 'Economia', category: 'Sociali', description: 'Grafico con freccia di crescita positiva' },
  { id: 'giurisprudenza', lucide: 'scale', label: 'Giurisprudenza', category: 'Umanistiche', description: 'Bilancia classica della giustizia a due piatti' },
  { id: 'medicina', lucide: 'cross', label: 'Medicina e Sanità', category: 'Sanitarie', description: 'Croce medica simmetrica' },
  { id: 'lettere', lucide: 'book-open', label: 'Lettere e Filosofia', category: 'Umanistiche', description: 'Libro aperto da studio' },
  { id: 'architettura', lucide: 'drafting-compass', label: 'Architettura e Design', category: 'Stem', description: 'Compasso geometrico di precisione' },
  { id: 'farmacia', lucide: 'pill', label: 'Farmacia e CTF', category: 'Sanitarie', description: 'Capsula medicinale' },
  { id: 'psicologia', lucide: 'brain', label: 'Psicologia', category: 'Sanitarie', description: 'Cervello e mente umana' },
  { id: 'scienze-politiche', lucide: 'landmark', label: 'Scienze Politiche', category: 'Sociali', description: 'Tempio istituzionale a colonne' },
  { id: 'veterinaria', lucide: 'paw-print', label: 'Veterinaria', category: 'Sanitarie', description: 'Impronta zampina animale' },
];

// Botanical laurel wreath generator matching official 3Degree physical tocco cap
function buildLaurelWreathPaths() {
  const poly = points => [points.map(p => p.map(v => Math.round(v * 1e6) / 1e6))];
  const disk = (x, y, r, n = 48) => poly(Array.from({ length: n }, (_, i) => [x + r * Math.cos(i * 2 * Math.PI / n), y + r * Math.sin(i * 2 * Math.PI / n)]));
  const union = (...shapes) => pc.union(...shapes);
  const stroke = (points, width = 3.6) => union(
    ...points.slice(1).map((b, i) => {
      const a = points[i], dx = b[0] - a[0], dy = b[1] - a[1], s = width / 2 / Math.hypot(dx, dy), n = [-dy * s, dx * s];
      return poly([[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]]);
    }),
    ...points.slice(1, -1).map(p => disk(...p, width / 2))
  );

  function curve(a, b, c, d, n = 16) {
    return Array.from({ length: n }, (_, i) => {
      const t = i / n, u = 1 - t;
      return [0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
    });
  }

  const laurelParts = [];
  function laurelLeaf(x, y, dx, dy, length = 5.7, width = 3) {
    const d = Math.hypot(dx, dy), u = [dx / d, dy / d], n = [-u[1], u[0]];
    const p = (along, across) => [x + u[0] * along + n[0] * across, y + u[1] * along + n[1] * across];
    return poly([
      ...curve(p(0, 0), p(length * 0.25, width * 0.68), p(length * 0.72, width * 0.64), p(length, 0)),
      ...curve(p(length, 0), p(length * 0.68, -width * 0.58), p(length * 0.24, -width * 0.62), p(0, 0)),
    ]);
  }

  for (const side of [-1, 1]) {
    const branch = a => [side * 17 * Math.cos(a), 16 * Math.sin(a)];
    laurelParts.push(stroke(Array.from({ length: 49 }, (_, i) => branch((-85 + i * 3) * Math.PI / 180)), 1.4));
    for (const degrees of [-76, -57, -38, -19, 0, 19, 38, 57]) {
      const a = degrees * Math.PI / 180, [x, y] = branch(a);
      const tangent = [-side * Math.sin(a), Math.cos(a)], out = [side * Math.cos(a), Math.sin(a)];
      laurelParts.push(laurelLeaf(x, y, tangent[0] * 0.85 + out[0] * 0.7, tangent[1] * 0.85 + out[1] * 0.7));
      const b = a + 0.08, [ix, iy] = branch(b);
      laurelParts.push(laurelLeaf(ix, iy, -side * Math.sin(b) * 0.75 - side * Math.cos(b) * 0.7, Math.cos(b) * 0.75 - Math.sin(b) * 0.7, 5.2, 3));
    }
  }

  const laurel = union(...laurelParts, stroke([[-5, -18.5], [2, -15.8]], 1.4), stroke([[5, -18.5], [-2, -15.8]], 1.4));

  function simplifyPoints(pts, tol = 0.08) {
    if (pts.length <= 2) return pts;
    const sqTol = tol * tol;
    function getSqSegDist(p, p1, p2) {
      let x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
      if (dx !== 0 || dy !== 0) {
        const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) { x = p2[0]; y = p2[1]; }
        else if (t > 0) { x += dx * t; y += dy * t; }
      }
      dx = p[0] - x; dy = p[1] - y;
      return dx * dx + dy * dy;
    }
    function simplifyDP(points) {
      let maxSqDist = 0, index = 0;
      for (let i = 1; i < points.length - 1; i++) {
        const sqDist = getSqSegDist(points[i], points[0], points[points.length - 1]);
        if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
      }
      if (maxSqDist > sqTol) {
        const left = simplifyDP(points.slice(0, index + 1));
        const right = simplifyDP(points.slice(index));
        return left.slice(0, -1).concat(right);
      } else {
        return [points[0], points[points.length - 1]];
      }
    }
    return simplifyDP(pts);
  }

  const simplified = laurel.map(poly => poly.map(ring => simplifyPoints(ring, 0.08)));

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const poly of simplified) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (-y < minY) minY = -y;
        if (-y > maxY) maxY = -y;
      }
    }
  }
  const w = maxX - minX;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  function makePath(targetCx, targetCy, targetW) {
    const scale = targetW / w;
    return simplified.map(poly => poly.map(ring => {
      return 'M ' + ring.map(([x, y]) => {
        const px = +(targetCx + (x - cx) * scale).toFixed(2);
        const py = +(targetCy + (-y - cy) * scale).toFixed(2);
        return px + ' ' + py;
      }).join(' L ') + ' Z';
    }).join(' ')).join(' ');
  }

  return {
    topPath: makePath(50.0, 23.0, 15.0),
    centerPath: makePath(50.0, 50.0, 30.0),
  };
}

function nodeToPath(node) {
  const [tag, attrs] = node;
  if (tag === 'path') return attrs.d;
  if (tag === 'circle') {
    const cx = Number(attrs.cx), cy = Number(attrs.cy), r = Number(attrs.r);
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
  }
  if (tag === 'rect') {
    const x = Number(attrs.x || 0), y = Number(attrs.y || 0), w = Number(attrs.width), h = Number(attrs.height);
    return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
  if (tag === 'line') {
    return `M ${attrs.x1} ${attrs.y1} L ${attrs.x2} ${attrs.y2}`;
  }
  return '';
}

// Convert any SVG path d to purely absolute commands M, L, C, S, Q, A, Z
function toAbsolutePath(d) {
  const result = [];
  const regex = /([a-df-z])([^a-df-z]*)/gi;
  let match;
  let curX = 0, curY = 0;
  let startX = 0, startY = 0;

  while ((match = regex.exec(d)) !== null) {
    const origCmd = match[1];
    const isRel = origCmd === origCmd.toLowerCase() && origCmd !== 'z';
    const cmd = origCmd.toUpperCase();
    const nums = match[2].trim().match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/gi)?.map(Number) || [];

    if (cmd === 'M') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        if (i === 0) {
          curX = isRel && (result.length > 0) ? curX + nums[i] : nums[i];
          curY = isRel && (result.length > 0) ? curY + nums[i + 1] : nums[i + 1];
          startX = curX;
          startY = curY;
          result.push(`M ${curX} ${curY}`);
        } else {
          curX = isRel ? curX + nums[i] : nums[i];
          curY = isRel ? curY + nums[i + 1] : nums[i + 1];
          result.push(`L ${curX} ${curY}`);
        }
      }
    } else if (cmd === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        curX = isRel ? curX + nums[i] : nums[i];
        curY = isRel ? curY + nums[i + 1] : nums[i + 1];
        result.push(`L ${curX} ${curY}`);
      }
    } else if (cmd === 'H') {
      for (const x of nums) {
        curX = isRel ? curX + x : x;
        result.push(`H ${curX}`);
      }
    } else if (cmd === 'V') {
      for (const y of nums) {
        curY = isRel ? curY + y : y;
        result.push(`V ${curY}`);
      }
    } else if (cmd === 'C') {
      for (let i = 0; i + 5 < nums.length; i += 6) {
        const x1 = isRel ? curX + nums[i] : nums[i];
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1];
        const x2 = isRel ? curX + nums[i + 2] : nums[i + 2];
        const y2 = isRel ? curY + nums[i + 3] : nums[i + 3];
        curX = isRel ? curX + nums[i + 4] : nums[i + 4];
        curY = isRel ? curY + nums[i + 5] : nums[i + 5];
        result.push(`C ${x1} ${y1} ${x2} ${y2} ${curX} ${curY}`);
      }
    } else if (cmd === 'S') {
      for (let i = 0; i + 3 < nums.length; i += 4) {
        const x2 = isRel ? curX + nums[i] : nums[i];
        const y2 = isRel ? curY + nums[i + 1] : nums[i + 1];
        curX = isRel ? curX + nums[i + 2] : nums[i + 2];
        curY = isRel ? curY + nums[i + 3] : nums[i + 3];
        result.push(`S ${x2} ${y2} ${curX} ${curY}`);
      }
    } else if (cmd === 'Q') {
      for (let i = 0; i + 3 < nums.length; i += 4) {
        const x1 = isRel ? curX + nums[i] : nums[i];
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1];
        curX = isRel ? curX + nums[i + 2] : nums[i + 2];
        curY = isRel ? curY + nums[i + 3] : nums[i + 3];
        result.push(`Q ${x1} ${y1} ${curX} ${curY}`);
      }
    } else if (cmd === 'A') {
      for (let i = 0; i + 6 < nums.length; i += 7) {
        const rx = nums[i];
        const ry = nums[i + 1];
        const rot = nums[i + 2];
        const large = nums[i + 3];
        const sweep = nums[i + 4];
        curX = isRel ? curX + nums[i + 5] : nums[i + 5];
        curY = isRel ? curY + nums[i + 6] : nums[i + 6];
        result.push(`A ${rx} ${ry} ${rot} ${large} ${sweep} ${curX} ${curY}`);
      }
    } else if (cmd === 'Z') {
      curX = startX;
      curY = startY;
      result.push('Z');
    }
  }
  return result.join(' ');
}

function scaleAbsoluteD(d, { cx, cy, size }) {
  const scale = size / 24;
  const result = [];
  const regex = /([MLHVCSQAZ])([^MLHVCSQAZ]*)/gi;
  let match;

  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1].toUpperCase();
    const nums = match[2].trim().match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/gi)?.map(Number) || [];

    if (['M', 'L'].includes(cmd)) {
      const transformed = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        transformed.push(Math.round(((nums[i] - 12) * scale + cx) * 100) / 100);
        transformed.push(Math.round(((nums[i + 1] - 12) * scale + cy) * 100) / 100);
      }
      result.push(`${cmd} ${transformed.join(' ')}`);
    } else if (cmd === 'H') {
      const transformed = nums.map(x => Math.round(((x - 12) * scale + cx) * 100) / 100);
      result.push(`H ${transformed.join(' ')}`);
    } else if (cmd === 'V') {
      const transformed = nums.map(y => Math.round(((y - 12) * scale + cy) * 100) / 100);
      result.push(`V ${transformed.join(' ')}`);
    } else if (['C', 'S', 'Q'].includes(cmd)) {
      const transformed = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        transformed.push(Math.round(((nums[i] - 12) * scale + cx) * 100) / 100);
        transformed.push(Math.round(((nums[i + 1] - 12) * scale + cy) * 100) / 100);
      }
      result.push(`${cmd} ${transformed.join(' ')}`);
    } else if (cmd === 'A') {
      const transformed = [];
      for (let i = 0; i + 6 < nums.length; i += 7) {
        transformed.push(
          Math.round((nums[i] * scale) * 100) / 100,
          Math.round((nums[i + 1] * scale) * 100) / 100,
          nums[i + 2],
          nums[i + 3],
          nums[i + 4],
          Math.round(((nums[i + 5] - 12) * scale + cx) * 100) / 100,
          Math.round(((nums[i + 6] - 12) * scale + cy) * 100) / 100
        );
      }
      result.push(`A ${transformed.join(' ')}`);
    } else if (cmd === 'Z') {
      result.push('Z');
    }
  }
  return result.join(' ');
}

const catalog = [];
for (const item of facultyIcons) {
  if (item.id === 'crown') {
    const laurelPaths = buildLaurelWreathPaths();
    catalog.push({
      id: item.id,
      lucide: 'laurel-wreath',
      label: item.label,
      category: item.category,
      description: item.description,
      fill: true,
      strokeWidth: 0,
      topPath: laurelPaths.topPath,
      centerPath: laurelPaths.centerPath,
    });
    continue;
  }

  if (item.id === 'economia') {
    // Bar chart with upward growth arrow following the trend (no axes)
    const combinedAbs = 'M 4 18.5 V 21 M 8 14.5 V 21 M 12 16 V 21 M 16 14.5 V 21 M 20 10.5 V 21 M 2 15 L 9 8 L 13 12 L 22 3 M 16 3 H 22 V 9';
    const topPath = scaleAbsoluteD(combinedAbs, { cx: 50, cy: 23, size: 18 });
    const centerPath = scaleAbsoluteD(combinedAbs, { cx: 50, cy: 50, size: 36 });
    catalog.push({
      id: item.id,
      lucide: 'chart-no-axes-combined',
      label: item.label,
      category: item.category,
      description: 'Grafico a barre con freccia di crescita positiva',
      fill: false,
      strokeWidth: 1.5,
      topPath,
      centerPath,
    });
    continue;
  }

  const mod = await import(`lucide-react/dist/esm/icons/${item.lucide}.mjs`);
  // Convert each node individually to absolute before joining
  const absParts = mod.__iconNode
    .map(nodeToPath)
    .filter(Boolean)
    .map(toAbsolutePath);
  const combinedAbs = absParts.join(' ');
  const topPath = scaleAbsoluteD(combinedAbs, { cx: 50, cy: 23, size: 18 });
  const centerPath = scaleAbsoluteD(combinedAbs, { cx: 50, cy: 50, size: 36 });
  catalog.push({
    id: item.id,
    lucide: item.lucide,
    label: item.label,
    category: item.category,
    description: item.description,
    fill: false,
    strokeWidth: 1.5,
    topPath,
    centerPath,
  });
}

const crownSymbol = catalog.find(s => s.id === 'crown');
const capSymbol = catalog.find(s => s.id === 'graduation-cap');

const mjsContent = `// Auto-generated faculty and graduation symbols catalog using Lucide Icons (100x100 SVG space)
// Official Lucide Icon library integration with unified absolute coordinates

export const CAP_SYMBOLS = ${JSON.stringify(catalog, null, 2)};

export const CAP_SYMBOL_MAP = Object.fromEntries([
  ...CAP_SYMBOLS.map(s => [s.id, s]),
  ['crown', ${JSON.stringify(crownSymbol)}],
  ['corona', ${JSON.stringify(crownSymbol)}],
  ['alloro', ${JSON.stringify(crownSymbol)}],
  ['laurea-alloro', ${JSON.stringify(crownSymbol)}],
  ['corona-alloro', ${JSON.stringify(crownSymbol)}],
  ['laurea-corona', ${JSON.stringify(crownSymbol)}],
  ['laurea-tocco', ${JSON.stringify(capSymbol)}],
]);

export function getCapSymbol(id) {
  if (!id) return null;
  return CAP_SYMBOL_MAP[id] || null;
}

export function detectSymbolFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.toLowerCase();
  if (/\\b(ingegner|ing\\b|robot|meccanic|informatic|elettron)/i.test(s)) return 'ingegneria';
  if (/\\b(econom|finanz|aziend|manag|commerc|market|business)/i.test(s)) return 'economia';
  if (/\\b(giurisprud|legge|avvocat|giurid|diritto|magistrat)/i.test(s)) return 'giurisprudenza';
  if (/\\b(medicin|chirurg|odont|inferm|sanit)/i.test(s)) return 'medicina';
  if (/\\b(letter|filosof|lingu|stori|ben[i ]cultural|letteratur)/i.test(s)) return 'lettere';
  if (/\\b(architett|design|urbanist|ediliz)/i.test(s)) return 'architettura';
  if (/\\b(farmac|ctf|farmaceut)/i.test(s)) return 'farmacia';
  if (/\\b(psicolog|cognitiv|ment[e ]|psich)/i.test(s)) return 'psicologia';
  if (/\\b(politic|diploma|istituzion|relazion[i ]internazional)/i.test(s)) return 'scienze-politiche';
  if (/\\b(veterinar|animal|zamp)/i.test(s)) return 'veterinaria';
  if (/\\b(allor|coron|traguard|laureat|proclam)/i.test(s)) return 'crown';
  if (/\\b(premio|medagli|eccell)/i.test(s)) return 'award';
  if (/\\b(tocco|cappell)/i.test(s)) return 'graduation-cap';
  return null;
}
`;

const dtsContent = `export interface CapSymbol {
  id: string;
  lucide: string;
  label: string;
  category: string;
  description: string;
  fill: boolean;
  strokeWidth: number;
  topPath: string;
  centerPath: string;
}

export declare const CAP_SYMBOLS: readonly CapSymbol[];
export declare const CAP_SYMBOL_MAP: Record<string, CapSymbol>;
export declare function getCapSymbol(id: string): CapSymbol | null;
export declare function detectSymbolFromText(text: string): string | null;
`;

fs.writeFileSync('src/lib/cap-symbols.mjs', mjsContent);
fs.writeFileSync('src/lib/cap-symbols.d.ts', dtsContent);
fs.writeFileSync('src/lib/cap-symbols.ts', `export * from './cap-symbols.mjs';\nexport type { CapSymbol } from './cap-symbols.d';\n`);
console.log('Successfully re-generated src/lib/cap-symbols.mjs with botanical graduation laurel wreath.');
