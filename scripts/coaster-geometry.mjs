import fs from 'node:fs';
import {ShapeUtils,Vector2,Vector3} from 'three';
const cleanRing = ring => {const r=ring.map(p=>p.map(v=>Math.round(v*1e6)/1e6)).filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>1e-5);if(r.length>1&&Math.hypot(r[0][0]-r.at(-1)[0],r[0][1]-r.at(-1)[1])<1e-5)r.pop();return r;};
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
function writeGlb(meshes,file){const j={asset:{version:'2.0',generator:'3Degree flush faculty caps'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]},chunks=[];let length=0;
  function accessor(array,type,size){let pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const data=Buffer.alloc(array.length*(type===5121?1:4));array.forEach((v,i)=>type===5121?data.writeUInt8(v,i):data.writeFloatLE(v,i*4));const view=j.bufferViews.push({buffer:0,byteOffset:length,byteLength:data.length})-1;chunks.push(data);length+=data.length;const a={bufferView:view,componentType:type,count:array.length/size,type:`VEC${size}`};if(type===5121)a.normalized=true;else {a.min=Array.from({length:size},(_,c)=>Math.min(...array.filter((_,i)=>i%size===c)));a.max=Array.from({length:size},(_,c)=>Math.max(...array.filter((_,i)=>i%size===c)));}return j.accessors.push(a)-1;}
  meshes.forEach((m,i)=>{const points=m.tris.flat(),normals=m.tris.flatMap(t=>{const n=new Vector3(...t[1]).sub(new Vector3(...t[0])).cross(new Vector3(...t[2]).sub(new Vector3(...t[0]))).normalize().toArray();return [n,n,n];});j.meshes.push({name:m.name,primitives:[{attributes:{POSITION:accessor(points.flat(),5126,3),NORMAL:accessor(normals.flat(),5126,3),COLOR_0:accessor(points.flatMap(()=>[...m.color,255]),5121,4)},mode:4}]});j.nodes.push({mesh:i,name:m.name,matrix:[.001,0,0,0,0,0,-.001,0,0,.001,0,0,0,0,0,1]});j.scenes[0].nodes.push(i);});
  j.buffers[0].byteLength=length;let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);let json=Buffer.from(JSON.stringify(j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(file,Buffer.concat([h,json,bh,bin]));
}
function writeStl(tris,file){const b=Buffer.alloc(84+tris.length*50);b.write('3Degree | millimetres | flush inlay');b.writeUInt32LE(tris.length,80);tris.forEach((t,i)=>{const normal=new Vector3(...t[1]).sub(new Vector3(...t[0])).cross(new Vector3(...t[2]).sub(new Vector3(...t[0]))).normalize().toArray();[...normal,...t.flat()].forEach((v,k)=>b.writeFloatLE(v,84+i*50+k*4));});fs.writeFileSync(file,b);}

export {faceTriangles,walls,writeGlb,writeStl};
