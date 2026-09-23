import fs from 'node:fs';
import path from 'node:path';
import pc from 'polygon-clipping';
import { ShapePath, ShapeUtils, Vector2, Vector3 } from 'three';
import sharp from 'sharp';

// All coordinates are millimetres. Inlays occupy 36.2–37 mm, exactly flush.
const TOP = 37, FLOOR = 36.2;
const poly = points => [points.map(p=>p.map(v=>Math.round(v*1e6)/1e6))];
const rect = (x,y,w,h) => poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
const disk = (x,y,r,n=36) => poly(Array.from({length:n},(_,i)=>[x+r*Math.cos(i*2*Math.PI/n),y+r*Math.sin(i*2*Math.PI/n)]));
const union = (...shapes) => pc.union(...shapes);
const diff = (a,b) => pc.difference(a,b);
function stroke(points, width = 1.6) {
  if (points.length < 2) return [];
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) continue;
    const s = width / 2 / len, n = [-dy * s, dx * s];
    segments.push(poly([
      [a[0] + n[0], a[1] + n[1]],
      [b[0] + n[0], b[1] + n[1]],
      [b[0] - n[0], b[1] - n[1]],
      [a[0] - n[0], a[1] - n[1]],
    ]));
  }
  const joints = points.slice(1, -1).map(p => disk(p[0], p[1], width / 2, 16));
  const caps = [
    disk(points[0][0], points[0][1], width / 2, 16),
    disk(points.at(-1)[0], points.at(-1)[1], width / 2, 16)
  ];
  return union(...segments, ...joints, ...caps);
}

const { CAP_SYMBOLS } = await import('../src/lib/cap-symbols.mjs');

function arcToPoints(x1, y1, rx, ry, phiDeg, fA, fS, x2, y2, segments = 16) {
  const phi = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  let rxSq = rx * rx, rySq = ry * ry;
  const x1pSq = x1p * x1p, y1pSq = y1p * y1p;
  const lambda = (x1pSq / rxSq) + (y1pSq / rySq);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda; ry *= sqrtLambda;
    rxSq = rx * rx; rySq = ry * ry;
  }
  const sign = fA === fS ? -1 : 1;
  const sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq));
  const coef = sign * Math.sqrt(sq);
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  function angle(u, v) {
    const dot = u[0] * v[0] + u[1] * v[1];
    const len = Math.hypot(...u) * Math.hypot(...v);
    const s = (u[0] * v[1] - u[1] * v[0] < 0) ? -1 : 1;
    return s * Math.acos(Math.max(-1, Math.min(1, dot / len)));
  }
  const theta1 = angle([1, 0], [(x1p - cxp) / rx, (y1p - cyp) / ry]);
  let dTheta = angle([(x1p - cxp) / rx, (y1p - cyp) / ry], [(-x1p - cxp) / rx, (-y1p - cyp) / ry]);
  if (!fS && dTheta > 0) dTheta -= 2 * Math.PI;
  else if (fS && dTheta < 0) dTheta += 2 * Math.PI;
  const points = [];
  for (let i = 1; i <= segments; i++) {
    const t = theta1 + (i / segments) * dTheta;
    const px = rx * Math.cos(t), py = ry * Math.sin(t);
    points.push([cosPhi * px - sinPhi * py + cx, sinPhi * px + cosPhi * py + cy]);
  }
  return points;
}

function parseCenterPathToPolylines(d) {
  const polylines = [];
  let currentPolyline = [];
  const regex = /([a-df-z])([^a-df-z]*)/gi;
  let match, curX = 0, curY = 0, startX = 0, startY = 0;
  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1].toUpperCase();
    const nums = match[2].trim().match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/gi)?.map(Number) || [];
    if (cmd === 'M') {
      if (currentPolyline.length > 1) polylines.push(currentPolyline);
      curX = nums[0]; curY = nums[1];
      startX = curX; startY = curY;
      currentPolyline = [[curX, curY]];
    } else if (cmd === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        curX = nums[i]; curY = nums[i + 1];
        currentPolyline.push([curX, curY]);
      }
    } else if (cmd === 'H') {
      for (const x of nums) { curX = x; currentPolyline.push([curX, curY]); }
    } else if (cmd === 'V') {
      for (const y of nums) { curY = y; currentPolyline.push([curX, curY]); }
    } else if (cmd === 'A') {
      for (let i = 0; i + 6 < nums.length; i += 7) {
        const [rx, ry, rot, large, sweep, targetX, targetY] = nums.slice(i, i + 7);
        const arcPts = arcToPoints(curX, curY, rx, ry, rot, large, sweep, targetX, targetY, 12);
        currentPolyline.push(...arcPts);
        curX = targetX; curY = targetY;
      }
    } else if (cmd === 'Z') {
      currentPolyline.push([startX, startY]);
      if (currentPolyline.length > 1) polylines.push(currentPolyline);
      currentPolyline = [];
    }
  }
  if (currentPolyline.length > 1) polylines.push(currentPolyline);
  return polylines;
}

function getSymbolShape(id) {
  const sym = CAP_SYMBOLS.find(s => s.id === id);
  if (!sym) throw new Error(`Unknown symbol ${id}`);
  const lines = parseCenterPathToPolylines(sym.centerPath);
  const strokeParts = lines.map(line => stroke(line.map(([x, y]) => [x - 50, -(y - 50)]), 2.25));
  return union(...strokeParts);
}

// 11. Laurea Alloro: Botanical Laurel Wreath
function curve(a, b, c, d, n = 16) {
  return Array.from({ length: n + 1 }, (_, i) => {
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
const laurel = union(
  ...laurelParts,
  stroke([[-4.5, -18.5], [0, -16], [4.5, -18.5]], 1.5),
  disk(0, -16, 1.8)
);

const symbols = {
  'laurea-alloro': { label: 'Corona d’alloro', shape: laurel },
  architettura: { label: 'Compasso', shape: getSymbolShape('architettura') },
  economia: { label: 'Grafico in crescita', shape: getSymbolShape('economia') },
  farmacia: { label: 'Capsula', shape: getSymbolShape('farmacia') },
  giurisprudenza: { label: 'Bilancia', shape: getSymbolShape('giurisprudenza') },
  ingegneria: { label: 'Ingranaggio', shape: getSymbolShape('ingegneria') },
  lettere: { label: 'Libro aperto', shape: getSymbolShape('lettere') },
  medicina: { label: 'Croce', shape: getSymbolShape('medicina') },
  psicologia: { label: 'Cervello', shape: getSymbolShape('psicologia') },
  'scienze-politiche': { label: 'Edificio istituzionale', shape: getSymbolShape('scienze-politiche') },
  veterinaria: { label: 'Impronta', shape: getSymbolShape('veterinaria') },
};
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const cleanRing = ring => {
  const r = ring.map(p => p.map(v => Math.round(v * 1e6) / 1e6)).filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-4);
  if (r.length > 1 && Math.hypot(r[0][0] - r.at(-1)[0], r[0][1] - r.at(-1)[1]) < 1e-4) r.pop();
  return r;
};
function faceTriangles(shape, z, reverse = false) {
  const result = [];
  for (const polygon of shape) {
    const rings = polygon.map(cleanRing), points = rings.flat();
    for (const t of ShapeUtils.triangulateShape(rings[0].map(p => new Vector2(...p)), rings.slice(1).map(r => r.map(p => new Vector2(...p))))) {
      const tri = t.map(i => [...points[i], z]);
      const a = tri[0], b = tri[1], c = tri[2];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cross) <= 1e-6) continue;
      if ((cross > 0) === reverse) tri.reverse();
      result.push(tri);
    }
  }
  const boundary = shape.flatMap(p => p.flatMap(cleanRing));
  const pending = [...result], conforming = [];
  let steps = 0;
  while (pending.length && steps < 5000) {
    steps++;
    const t = pending.pop();
    let split = false;
    for (let i = 0; i < 3 && !split; i++) {
      const a = t[i], b = t[(i + 1) % 3], c = t[(i + 2) % 3], dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
      if (length < 1e-6) continue;
      for (const p of boundary) {
        if (Math.hypot(p[0] - a[0], p[1] - a[1]) < 1e-3 || Math.hypot(p[0] - b[0], p[1] - b[1]) < 1e-3) continue;
        const q = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length;
        if (q > 1e-4 && q < 1 - 1e-4 && Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) < 1e-5) {
          const v = [...p, z];
          const cross1 = Math.abs((v[0] - a[0]) * (c[1] - a[1]) - (v[1] - a[1]) * (c[0] - a[0]));
          const cross2 = Math.abs((b[0] - v[0]) * (c[1] - v[1]) - (b[1] - v[1]) * (c[0] - v[0]));
          if (cross1 > 1e-6 && cross2 > 1e-6) {
            pending.push([a, v, c], [v, b, c]);
            split = true;
            break;
          }
        }
      }
    }
    if (!split) conforming.push(t);
  }
  return pending.length ? result : conforming;
}
function walls(shape, bottom, top, reverse = false) {
  const tris = [];
  for (const polygon of shape) for (const raw of polygon) {
    const r = cleanRing(raw);
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-4) continue;
      const pair = [[[...a, bottom], [...b, bottom], [...b, top]], [[...a, bottom], [...b, top], [...a, top]]];
      if (reverse) pair.forEach(t => t.reverse());
      tris.push(...pair);
    }
  }
  return tris;
}
const cad=JSON.parse(fs.readFileSync('public/models/tocco-meshes.json','utf8'));
function triangles(mesh){const p=mesh.attributes.position.array;return Array.from({length:mesh.index.array.length/3},(_,k)=>mesh.index.array.slice(k*3,k*3+3).map(i=>p.slice(i*3,i*3+3)));}
const original=cad.map(triangles),upper=original[2].filter(t=>t.every(p=>Math.abs(p[2]-TOP)<1e-5));
const topShape=union(...upper.map(t=>poly(t.map(p=>p.slice(0,2)))));
const body=original[2].filter(t=>!t.every(p=>Math.abs(p[2]-TOP)<1e-5));
function area(shape){return shape.reduce((s,p)=>s+p.reduce((s,r)=>s+r.slice(1).reduce((s,b,i)=>s+r[i][0]*b[1]-b[0]*r[i][1],0)/2,0),0);}
function writeGlb(meshes,file){const j={asset:{version:'2.0',generator:'3Degree flush faculty caps'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]},chunks=[];let length=0;
  function accessor(array,type,size){let pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const data=Buffer.alloc(array.length*(type===5121?1:4));array.forEach((v,i)=>type===5121?data.writeUInt8(v,i):data.writeFloatLE(v,i*4));const view=j.bufferViews.push({buffer:0,byteOffset:length,byteLength:data.length})-1;chunks.push(data);length+=data.length;const a={bufferView:view,componentType:type,count:array.length/size,type:`VEC${size}`};if(type===5121)a.normalized=true;else {a.min=Array.from({length:size},(_,c)=>Math.min(...array.filter((_,i)=>i%size===c)));a.max=Array.from({length:size},(_,c)=>Math.max(...array.filter((_,i)=>i%size===c)));}return j.accessors.push(a)-1;}
  meshes.forEach((m,i)=>{const points=m.tris.flat(),normals=m.tris.flatMap(t=>{const n=new Vector3(...t[1]).sub(new Vector3(...t[0])).cross(new Vector3(...t[2]).sub(new Vector3(...t[0]))).normalize().toArray();return [n,n,n];});j.meshes.push({name:m.name,primitives:[{attributes:{POSITION:accessor(points.flat(),5126,3),NORMAL:accessor(normals.flat(),5126,3),COLOR_0:accessor(points.flatMap(()=>[...m.color,255]),5121,4)},mode:4}]});j.nodes.push({mesh:i,name:m.name,matrix:[.001,0,0,0,0,0,-.001,0,0,.001,0,0,0,0,0,1]});j.scenes[0].nodes.push(i);});
  j.buffers[0].byteLength=length;let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);let json=Buffer.from(JSON.stringify(j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(file,Buffer.concat([h,json,bh,bin]));
}
function writeStl(tris,file){const b=Buffer.alloc(84+tris.length*50);b.write('3Degree | millimetres | flush inlay');b.writeUInt32LE(tris.length,80);tris.forEach((t,i)=>{const normal=new Vector3(...t[1]).sub(new Vector3(...t[0])).cross(new Vector3(...t[2]).sub(new Vector3(...t[0]))).normalize().toArray();[...normal,...t.flat()].forEach((v,k)=>b.writeFloatLE(v,84+i*50+k*4));});fs.writeFileSync(file,b);}
async function render(meshes,file){const W=1860,H=1420,pixels=Buffer.alloc(W*H*3),depth=new Float32Array(W*H).fill(-Infinity);for(let i=0;i<W*H;i++)pixels.set([240,239,237],i*3);
 const project=([x,y,z])=>[W/2+17*(.86*x+.5*y),1120+17*(.3*x-.52*y-.8*z),.4*x-.7*y+.6*z];
 for(const m of meshes)for(const t of m.tris){const [A,B,C]=t.map(project),den=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1]);if(Math.abs(den)<1e-8)continue;const n=new Vector3(...t[1]).sub(new Vector3(...t[0])).cross(new Vector3(...t[2]).sub(new Vector3(...t[0]))).normalize();const shade=.55+.45*Math.max(0,n.dot(new Vector3(-.2,-.4,.9).normalize())),color=m.color.map(v=>Math.min(255,Math.round(10+v*shade)));for(let y=Math.max(0,Math.floor(Math.min(A[1],B[1],C[1])));y<=Math.min(H-1,Math.ceil(Math.max(A[1],B[1],C[1])));y++)for(let x=Math.max(0,Math.floor(Math.min(A[0],B[0],C[0])));x<=Math.min(W-1,Math.ceil(Math.max(A[0],B[0],C[0])));x++){const u=((B[1]-C[1])*(x-C[0])+(C[0]-B[0])*(y-C[1]))/den,v=((C[1]-A[1])*(x-C[0])+(A[0]-C[0])*(y-C[1]))/den,w=1-u-v;if(Math.min(u,v,w)<0)continue;const z=u*A[2]+v*B[2]+w*C[2],i=y*W+x;if(z<=depth[i])continue;depth[i]=z;pixels.set(color,i*3);}}
 for(const [suffix,w,h] of [['',465,355],['@2x',930,710],['@4x',1860,1420]])await sharp(pixels,{raw:{width:W,height:H,channels:3}}).resize(w,h).webp({quality:92}).toFile(`${file}${suffix}.webp`);
}
const products=JSON.parse(fs.readFileSync('src/lib/products.json','utf8')),report=[];
if(!products.some(p=>p.slug==='bomboniera-laurea-alloro'))products.push({slug:'bomboniera-laurea-alloro',dimensions:[65,65,37],preset:{structureColor:'#222222',text:'',fontKey:'great-vibes'}});
for(const p of products){if(p.kind==='coaster')continue;if(!p.slug.startsWith('bomboniera-')){p.collection=p.kind==='cap'?'tocchi-laurea':'forme-di-laurea';continue;}const key=p.slug.slice(11),symbol=symbols[key];if(!symbol)throw Error(`Missing design ${key}`);
 const shape=union(symbol.shape),cut=diff(topShape,shape);if(Math.abs(area(topShape)-area(cut)-area(shape))>1e-5)throw Error(`Inset outside lid: ${key}`);
 const lid=[...body,...faceTriangles(cut,TOP),...faceTriangles(shape,FLOOR),...walls(shape,FLOOR,TOP,true)];
 const inlay=[...faceTriangles(shape,TOP),...faceTriangles(shape,FLOOR,true),...walls(shape,FLOOR,TOP)];
 const color=rgb('#dc2626');const meshes=[{name:'struttura_base',tris:original[0],color:rgb('#222222')},{name:'fascia',tris:original[1],color},{name:'struttura_coperchio',tris:lid,color:rgb('#222222')},{name:'bordo',tris:original[3],color},{name:'simbolo_intarsio',tris:inlay,color}];
 const prefix=`public/products/${p.slug}-facolta`;
 writeGlb(meshes,`${prefix}-montato.glb`);writeGlb(meshes.map((m,i)=>({...m,tris:i<2?m.tris:m.tris.map(t=>t.map(([x,y,z])=>[x,y+5,z+20]))})),`${prefix}-aperto.glb`);
 await render(meshes,prefix);
 const dir=`public/models/facolta/${key}`;fs.mkdirSync(dir,{recursive:true});writeStl(lid,`${dir}/coperchio.stl`);writeStl(inlay,`${dir}/simbolo.stl`);
 p.kind='faculty-cap';p.collection='tocchi-laurea';p.name=`Tocco ${key.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ')}`;p.description=`${symbol.label} sulla faccia superiore, con un disegno a filo in colore a contrasto. Un tocco dedicato al tuo percorso di laurea.`;p.assembly='Tocco da 65 × 65 mm con simbolo colorato incassato a filo del coperchio, senza rilievo.';p.image=`/products/${p.slug}-facolta.webp`;p.model=`/products/${p.slug}-facolta-montato.glb`;p.openModel=`/products/${p.slug}-facolta-aperto.glb`;p.symbol=symbol.label;p.modelVersion='faculty-flush-v1';p.preset={...p.preset,middleColor:'#dc2626',lineColor:'#dc2626',textColor:'#dc2626'};
 report.push({faculty:key,symbol:symbol.label,topMm:TOP,inlayBottomMm:FLOOR,inlayDepthMm:TOP-FLOOR,minDesignedStrokeMm:3.6,areaMm2:area(shape),lidTriangles:lid.length,inlayTriangles:inlay.length});console.log(`${key}: flush symbol, GLBs, STL components and previews`);
}
fs.writeFileSync('src/lib/products.json',JSON.stringify(products,null,2)+'\n');fs.writeFileSync('public/models/facolta/geometry-report.json',JSON.stringify(report,null,2)+'\n');
const thumbs=await Promise.all(products.filter(p=>p.kind==='faculty-cap').map(p=>sharp('public'+p.image).resize(372,284).toBuffer()));
await sharp({create:{width:1860,height:Math.ceil(thumbs.length/5)*284,channels:3,background:'#f0efed'}}).composite(thumbs.map((input,i)=>({input,left:(i%5)*372,top:Math.floor(i/5)*284}))).png().toFile('public/models/facolta/anteprima-collezione.png');
