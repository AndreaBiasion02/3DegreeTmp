import fs from 'node:fs';
import { Vector2, Vector3, Matrix3, ShapeUtils } from 'three';
import sharp from 'sharp';
const original = 'C:/Users/Andrea/Documents/Codex/2026-09-05/cre/outputs/Sei_portaconfetti_3D/Collezione_Laurea_3D/02_Economia';
function read(file) {
  const b=fs.readFileSync(file), l=b.readUInt32LE(12), j=JSON.parse(b.subarray(20,20+l).toString());
  const bin=b.subarray(28+l);
  function acc(i) { const a=j.accessors[i],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type],size={5121:1,5125:4,5126:4}[a.componentType];return Array.from({length:a.count},(_,k)=>Array.from({length:n},(_,c)=>{const o=(v.byteOffset||0)+(a.byteOffset||0)+k*(v.byteStride||n*size)+c*size;return a.componentType===5126?bin.readFloatLE(o):a.componentType===5125?bin.readUInt32LE(o):bin[o];})); }
  return {j,bin,acc};
}
const closed=read(`${original}/02_Economia_montato.glb`), open=read(`${original}/02_Economia_aperto.glb`);
const primitive=d=>d.j.meshes.find(m=>m.name==='05_freccia').primitives[0];
const cp=closed.acc(primitive(closed).attributes.POSITION),op=open.acc(primitive(open).attributes.POSITION);
// Fit the original lid opening transform; do not select vertices by world bounds.
const gram=new Array(9).fill(0),rhs=[new Vector3(),new Vector3(),new Vector3()];
cp.forEach((p,i)=>{const v=[p[1],p[2],1];for(let a=0;a<3;a++){for(let b=0;b<3;b++)gram[a*3+b]+=v[a]*v[b];for(let c=0;c<3;c++)rhs[c].setComponent(a,rhs[c].getComponent(a)+v[a]*op[i][c]);}});
const inv=new Matrix3().set(...gram).invert(); const coeff=rhs.map(r=>r.applyMatrix3(inv));
const transform=p=>[p[0],coeff[1].dot(new Vector3(p[1],p[2],1)),coeff[2].dot(new Vector3(p[1],p[2],1))];
if(cp.some((p,i)=>Math.hypot(...transform(p).map((v,c)=>v-op[i][c]))>0.001))throw Error('Original opening transform does not match');
// Follow the existing shaft contour, ending in a single solid triangular head.
const ids=[27,28,31,32,33,38,39,40,41,49,50,51,52,53,93,94,96,97,98,99,100,103,104];
const tail=[102,101,65,64,63,62,61,60,95,47,46,45,42,44,43,48,37,36,35,34,30,29];
let outline=[...ids.map(i=>cp[i].slice(0,2)),[44,24],...tail.map(i=>cp[i].slice(0,2))];
if(ShapeUtils.isClockWise(outline.map(p=>new Vector2(...p))))outline.reverse();
const n=outline.length,faces=ShapeUtils.triangulateShape(outline.map(p=>new Vector2(...p)),[]),indices=[];
for(const [a,b,c] of faces)indices.push(c,b,a,a+n,b+n,c+n);
for(let a=0;a<n;a++){const b=(a+1)%n;indices.push(a,b,b+n,a,b+n,a+n);}
const base=[...outline.map(p=>[...p,29]),...outline.map(p=>[...p,30.8])];
// Verify a closed solid with no zero-area triangles and exactly two faces per edge.
const edges=new Map();for(let k=0;k<indices.length;k+=3){const t=indices.slice(k,k+3),[a,b,c]=t.map(i=>new Vector3(...base[i]));if(b.sub(a).cross(c.sub(a)).length()<1e-7)throw Error('Degenerate triangle');for(let q=0;q<3;q++){const e=[t[q],t[(q+1)%3]].sort((a,b)=>a-b).join(',');edges.set(e,(edges.get(e)||0)+1);}}
if([...edges.values()].some(n=>n!==2))throw Error('Non-manifold arrow');
for(const state of ['montato','aperto']){
  const d=read(`public/products/economia-${state}.glb`),verts=state==='aperto'?base.map(transform):base;
  let chunks=[d.bin],length=d.bin.length;
  function append(values,type,components){const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const data=Buffer.alloc(values.length*(type===5121?1:4));values.forEach((v,i)=>type===5121?data.writeUInt8(v,i):type===5125?data.writeUInt32LE(v,i*4):data.writeFloatLE(v,i*4));const bv=d.j.bufferViews.push({buffer:0,byteOffset:length,byteLength:data.length})-1;chunks.push(data);length+=data.length;const a={bufferView:bv,componentType:type,count:values.length/components,type:components===1?'SCALAR':`VEC${components}`};if(type===5121)a.normalized=true;if(components===3){a.min=[0,1,2].map(c=>Math.min(...verts.map(p=>p[c])));a.max=[0,1,2].map(c=>Math.max(...verts.map(p=>p[c])));}return d.j.accessors.push(a)-1;}
  const p=primitive(d);p.indices=append(indices,5125,1);p.attributes={POSITION:append(verts.flat(),5126,3),COLOR_0:append(verts.flatMap(()=>[220,38,38,255]),5121,4)};
  d.j.buffers[0].byteLength=length;let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);let json=Buffer.from(JSON.stringify(d.j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  fs.writeFileSync(`public/products/economia-${state}-v3.glb`,Buffer.concat([header,json,bh,bin]));
}
// Render the actual corrected open GLB triangles into both catalog resolutions.
const d=read('public/products/economia-aperto-v3.glb'),W=1860,H=1420,pixels=Buffer.alloc(W*H*3),depth=new Float32Array(W*H).fill(-Infinity);
for(let i=0;i<W*H;i++)pixels.set([240,239,237],i*3);
const meshes=d.j.meshes.map(m=>{const p=m.primitives[0];return {points:d.acc(p.attributes.POSITION),colors:d.acc(p.attributes.COLOR_0),indices:d.acc(p.indices).flat()};});
const proj=([x,y,z])=>[.8*x+.6*y,.36*x-.48*y-.8*z,.48*x-.64*y+.6*z];
const all=meshes.flatMap(m=>m.points.map(proj)),mn=[0,1].map(c=>Math.min(...all.map(p=>p[c]))),mx=[0,1].map(c=>Math.max(...all.map(p=>p[c]))),s=Math.min(W*.82/(mx[0]-mn[0]),H*.82/(mx[1]-mn[1]));
const screen=p=>{const q=proj(p);return [(q[0]-(mn[0]+mx[0])/2)*s+W/2,(q[1]-(mn[1]+mx[1])/2)*s+H/2,q[2]];};
for(const mesh of meshes)for(let k=0;k<mesh.indices.length;k+=3){const ids=mesh.indices.slice(k,k+3),world=ids.map(i=>mesh.points[i]),[A,B,C]=world.map(screen),den=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1]);if(Math.abs(den)<1e-9)continue;const normal=new Vector3(...world[1]).sub(new Vector3(...world[0])).cross(new Vector3(...world[2]).sub(new Vector3(...world[0]))).normalize();const shade=.58+.42*Math.max(0,normal.dot(new Vector3(-.3,-.4,.86).normalize()));const rgb=mesh.colors[ids[0]].slice(0,3).map(v=>Math.min(255,Math.round(14+v*shade)));for(let y=Math.max(0,Math.floor(Math.min(A[1],B[1],C[1])));y<=Math.min(H-1,Math.ceil(Math.max(A[1],B[1],C[1])));y++)for(let x=Math.max(0,Math.floor(Math.min(A[0],B[0],C[0])));x<=Math.min(W-1,Math.ceil(Math.max(A[0],B[0],C[0])));x++){const u=((B[1]-C[1])*(x-C[0])+(C[0]-B[0])*(y-C[1]))/den,v=((C[1]-A[1])*(x-C[0])+(A[0]-C[0])*(y-C[1]))/den,w=1-u-v;if(Math.min(u,v,w)<0)continue;const z=u*A[2]+v*B[2]+w*C[2],i=y*W+x;if(z<=depth[i])continue;depth[i]=z;pixels.set(rgb,i*3);}}
for(const [file,width,height] of [['economia-v3.webp',465,355],['economia-v3@2x.webp',930,710]])await sharp(pixels,{raw:{width:W,height:H,channels:3}}).resize(width,height).webp({quality:94}).toFile(`public/products/${file}`);
console.log(`Built watertight arrow: ${base.length} vertices, ${indices.length/3} non-degenerate faces. Both models and previews saved.`);
