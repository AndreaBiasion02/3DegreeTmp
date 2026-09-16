import fs from 'node:fs';
import path from 'node:path';
import pc from 'polygon-clipping';
import { ShapeUtils, Vector2, Vector3 } from 'three';
import sharp from 'sharp';

// All coordinates are millimetres. Inlays occupy 36.2–37 mm, exactly flush.
const TOP = 37, FLOOR = 36.2;
const poly = points => [points.map(p=>p.map(v=>Math.round(v*1e6)/1e6))];
const rect = (x,y,w,h) => poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
const disk = (x,y,r,n=48) => poly(Array.from({length:n},(_,i)=>[x+r*Math.cos(i*2*Math.PI/n),y+r*Math.sin(i*2*Math.PI/n)]));
const union = (...shapes) => pc.union(...shapes);
const diff = (a,b) => pc.difference(a,b);
const stroke = (points,width=3.6) => union(...points.slice(1).map((b,i)=>{const a=points[i],dx=b[0]-a[0],dy=b[1]-a[1],s=width/2/Math.hypot(dx,dy),n=[-dy*s,dx*s];return poly([[a[0]+n[0],a[1]+n[1]],[b[0]+n[0],b[1]+n[1]],[b[0]-n[0],b[1]-n[1]],[a[0]-n[0],a[1]-n[1]]]);}),...points.slice(1,-1).map(p=>disk(...p,width/2)));
// A monumental portal: a semicircular void framed by a square facade.
// Broad piers and a continuous lintel keep the icon clear at actual size.
const portalVoid = union(rect(-8,-20,16,20),disk(0,0,8));
const arch = union(diff(rect(-16,-16,32,32),portalVoid),rect(-19,16,38,5),rect(-19,-21,38,5));
const economics = union(rect(-17,-17,7,9),rect(-5,-17,7,15),rect(7,-17,7,21),stroke([[-17,0],[-8,8],[0,5],[9,13]],4),poly([[4,16],[17,19],[14,6]]));
const capsuleOuter = union(rect(-9,-9,18,18),disk(-9,0,9),disk(9,0,9));
const capsuleOutline = diff(capsuleOuter,union(rect(-9,-5,18,10),disk(-9,0,5),disk(9,0,5)));
const capsule = union(capsuleOutline,rect(2,-9,7,18),disk(9,0,9));
const mortar = capsule.map(p=>p.map(r=>r.map(([x,y])=>[(x-y)*Math.SQRT1_2,(x+y)*Math.SQRT1_2])));
const scales = union(rect(-2,-16,4,32),rect(-12,-19,24,4),rect(-18,9,36,4),rect(-14,-3,3.6,15),rect(10.4,-3,3.6,15),poly([[-20,-2],[-5,-2],[-8,-8],[-17,-8]]),poly([[5,-2],[20,-2],[17,-8],[8,-8]]));
const gearOutline = poly(Array.from({length:32},(_,i)=>{const angle=(i+.5)*Math.PI/16,r=i%4===0||i%4===3?18:14;return [r*Math.cos(angle),r*Math.sin(angle)];}));
const book = union(poly([[-19,-13],[-3,-17],[-3,12],[-19,17]]),poly([[3,-17],[19,-13],[19,17],[3,12]]));
const cross = union(rect(-5,-18,10,36),rect(-18,-5,36,10));
// A single calm profile, with one generous circular opening for the mind.
// Cubic curves avoid the scalloped, fragmented look of the previous brain.
function curve(a,b,c,d,n=16){return Array.from({length:n},(_,i)=>{const t=i/n,u=1-t;return [0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]);});}
const head = poly([
  ...curve([-10,-20],[-10,-10],[-10,-10],[-14,-5]),
  ...curve([-14,-5],[-24,10],[-12,24],[2,20]),
  ...curve([2,20],[10,18],[12,13],[12,8]),
  [12,8],[18,0],[12,-2],[12,-8],
  ...curve([12,-8],[12,-12],[7,-12],[3,-12]),
  [3,-12],[3,-20],
]);
const psi = diff(head,disk(-3,7,6));
const temple = union(poly([[-20,10],[0,20],[20,10]]),rect(-18,5,36,4),rect(-16,-13,5,19),rect(-2.5,-13,5,19),rect(11,-13,5,19),rect(-19,-18,38,5));
const paw = union(disk(-13,9,5),disk(-4,15,5),disk(7,14,5),disk(15,5,5),poly([[-13,-13],[-11,-5],[-5,2],[2,3],[10,-4],[14,-13],[9,-17],[2,-15],[-6,-18]]));
const symbols = {
  architettura: {label:'Portale architettonico', shape:arch},
  economia: {label:'Grafico in crescita', shape:economics},
  farmacia: {label:'Capsula', shape:mortar},
  giurisprudenza: {label:'Bilancia', shape:scales},
  ingegneria: {label:'Ingranaggio', shape:diff(gearOutline,disk(0,0,7))},
  lettere: {label:'Libro aperto', shape:book},
  medicina: {label:'Croce', shape:cross},
  psicologia: {label:'Profilo e mente', shape:psi},
  'scienze-politiche': {label:'Edificio istituzionale', shape:temple},
  veterinaria: {label:'Impronta', shape:paw},
};
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const cleanRing = ring => {const r=ring.slice();if(r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1])r.pop();return r;};
function faceTriangles(shape,z,reverse=false) {
  const result=[];
  for(const polygon of shape){const rings=polygon.map(cleanRing),points=rings.flat();for(const t of ShapeUtils.triangulateShape(rings[0].map(p=>new Vector2(...p)),rings.slice(1).map(r=>r.map(p=>new Vector2(...p))))){const tri=t.map(i=>[...points[i],z]);const a=tri[0],b=tri[1],c=tri[2];if(((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0)===reverse)tri.reverse();result.push(tri);}}
  // Earcut may skip collinear contour vertices around aligned holes. Split
  // the spanning edges so cap triangles match every extrusion wall edge.
  const boundary=shape.flatMap(p=>p.flatMap(cleanRing));
  const pending=[...result],conforming=[];
  while(pending.length){const t=pending.pop();let split=false;for(let i=0;i<3&&!split;i++){const a=t[i],b=t[(i+1)%3],c=t[(i+2)%3],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;for(const p of boundary){const q=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length;if(q>1e-6&&q<1-1e-6&&Math.abs((p[0]-a[0])*dy-(p[1]-a[1])*dx)<1e-7){const v=[...p,z];pending.push([a,v,c],[v,b,c]);split=true;break;}}}if(!split)conforming.push(t);}
  return conforming;
}
function walls(shape,bottom,top,reverse=false){const tris=[];for(const polygon of shape)for(const raw of polygon){const r=cleanRing(raw);for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];const pair=[[[...a,bottom],[...b,bottom],[...b,top]],[[...a,bottom],[...b,top],[...a,top]]];if(reverse)pair.forEach(t=>t.reverse());tris.push(...pair);}}return tris;}
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
for(const p of products){if(!p.slug.startsWith('bomboniera-')){p.collection=p.kind==='cap'?'personalizzabili':'forme-di-laurea';continue;}const key=p.slug.slice(11),symbol=symbols[key];if(!symbol)throw Error(`Missing design ${key}`);
 const shape=union(symbol.shape),cut=diff(topShape,shape);if(Math.abs(area(topShape)-area(cut)-area(shape))>1e-5)throw Error(`Inset outside lid: ${key}`);
 const lid=[...body,...faceTriangles(cut,TOP),...faceTriangles(shape,FLOOR),...walls(shape,FLOOR,TOP,true)];
 const inlay=[...faceTriangles(shape,TOP),...faceTriangles(shape,FLOOR,true),...walls(shape,FLOOR,TOP)];
 const color=rgb('#dc2626');const meshes=[{name:'struttura_base',tris:original[0],color:rgb('#222222')},{name:'fascia',tris:original[1],color},{name:'struttura_coperchio',tris:lid,color:rgb('#222222')},{name:'bordo',tris:original[3],color},{name:'simbolo_intarsio',tris:inlay,color}];
 const prefix=`public/products/${p.slug}-facolta`;
 writeGlb(meshes,`${prefix}-montato.glb`);writeGlb(meshes.map((m,i)=>({...m,tris:i<2?m.tris:m.tris.map(t=>t.map(([x,y,z])=>[x,y+5,z+20]))})),`${prefix}-aperto.glb`);
 await render(meshes,prefix);
 const dir=`public/models/facolta/${key}`;fs.mkdirSync(dir,{recursive:true});writeStl(lid,`${dir}/coperchio.stl`);writeStl(inlay,`${dir}/simbolo.stl`);
 p.kind='faculty-cap';p.collection='tocchi-di-facolta';p.name=`Tocco ${key.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ')}`;p.description=`${symbol.label} sulla faccia superiore, con un disegno a filo in colore a contrasto. Un tocco dedicato al tuo percorso di laurea.`;p.assembly='Tocco da 65 × 65 mm con simbolo colorato incassato a filo del coperchio, senza rilievo.';p.image=`/products/${p.slug}-facolta.webp`;p.model=`/products/${p.slug}-facolta-montato.glb`;p.openModel=`/products/${p.slug}-facolta-aperto.glb`;p.symbol=symbol.label;p.modelVersion='faculty-flush-v1';p.preset={...p.preset,middleColor:'#dc2626',lineColor:'#dc2626',textColor:'#dc2626'};
 report.push({faculty:key,symbol:symbol.label,topMm:TOP,inlayBottomMm:FLOOR,inlayDepthMm:TOP-FLOOR,minDesignedStrokeMm:3.6,areaMm2:area(shape),lidTriangles:lid.length,inlayTriangles:inlay.length});console.log(`${key}: flush symbol, GLBs, STL components and previews`);
}
fs.writeFileSync('src/lib/products.json',JSON.stringify(products,null,2)+'\n');fs.writeFileSync('public/models/facolta/geometry-report.json',JSON.stringify(report,null,2)+'\n');
const thumbs=await Promise.all(products.filter(p=>p.kind==='faculty-cap').map(p=>sharp('public'+p.image).resize(372,284).toBuffer()));
await sharp({create:{width:1860,height:568,channels:3,background:'#f0efed'}}).composite(thumbs.map((input,i)=>({input,left:(i%5)*372,top:Math.floor(i/5)*284}))).png().toFile('public/models/facolta/anteprima-collezione.png');
