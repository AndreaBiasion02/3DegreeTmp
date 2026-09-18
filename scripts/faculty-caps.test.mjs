import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const products=JSON.parse(fs.readFileSync('src/lib/products.json'));
const collections=JSON.parse(fs.readFileSync('src/lib/collections.json'));
function glb(file){const b=fs.readFileSync('public'+file),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length)),bin=b.subarray(28+length);return {j,positions(name){const m=j.meshes.find(m=>m.name===name),a=j.accessors[m.primitives[0].attributes.POSITION],v=j.bufferViews[a.bufferView];return Array.from({length:a.count},(_,i)=>[0,1,2].map(c=>bin.readFloatLE((v.byteOffset||0)+i*12+c*4)));}};}
function area(points,z){let area=0;for(let i=0;i<points.length;i+=3){const [a,b,c]=points.slice(i,i+3);if([a,b,c].every(p=>Math.abs(p[2]-z)<1e-4))area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}return area;}
test('Four disjoint collections contain every product and link to correct product lists',()=>{
 assert.equal(collections.length,4);assert.deepEqual(collections.map(c=>products.filter(p=>p.collection===c.slug).length),[6,11,1,42]);
 for(const p of products)assert(collections.some(c=>c.slug===p.collection));
 for(const c of collections){const html=fs.readFileSync(`out/collections/${c.slug}/index.html`,'utf8');const schema=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(s=>s['@type']==='CollectionPage');assert.deepEqual(schema.mainEntity.itemListElement.map(x=>x.name),products.filter(p=>p.collection===c.slug).map(p=>p.name));}
});
test('Faculty symbols are solid 0.8 mm inlays flush with the lid in both states',()=>{
 const cad=JSON.parse(fs.readFileSync('public/models/tocco-meshes.json'))[2];
 const originalLid=cad.index.array.map(i=>cad.attributes.position.array.slice(i*3,i*3+3));
 const originalRecessArea=area(originalLid,36.2);
 const reports=JSON.parse(fs.readFileSync('public/models/facolta/geometry-report.json'));let signatures=new Set();
 for(const p of products.filter(p=>p.kind==='faculty-cap')){
  const closed=glb(p.model),open=glb(p.openModel),insert=closed.positions('simbolo_intarsio'),lid=closed.positions('struttura_coperchio');
  const zs=insert.map(p=>p[2]);assert(Math.abs(Math.min(...zs)-36.2)<1e-4);assert.equal(Math.max(...zs),37);assert.equal(Math.max(...lid.map(p=>p[2])),37);
  signatures.add(JSON.stringify(insert));
  // A closed insert must have every welded edge shared by exactly two faces.
  const edges=new Map();for(let i=0;i<insert.length;i+=3){const t=insert.slice(i,i+3);const u=t[1].map((v,c)=>v-t[0][c]),v=t[2].map((v,c)=>v-t[0][c]);assert(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-7);for(let k=0;k<3;k++){const e=[t[k],t[(k+1)%3]].map(p=>p.map(v=>v.toFixed(4)).join(',')).sort().join('|');edges.set(e,(edges.get(e)||0)+1);}}
  assert([...edges.values()].every(n=>n===2),p.slug+' insert manifold');
  const record=reports.find(r=>p.slug===`bomboniera-${r.faculty}`);assert(Math.abs(area(insert,37)-record.areaMm2)<.01);assert(Math.abs(area(lid,36.2)-originalRecessArea-record.areaMm2)<.01);
  const opened=open.positions('simbolo_intarsio');insert.forEach((point,i)=>point.forEach((v,c)=>assert(Math.abs(opened[i][c]-v-[0,5,20][c])<1e-4)));
  const bounds=[0,1,2].map(c=>{const pts=closed.j.meshes.flatMap(m=>closed.positions(m.name));return Math.max(...pts.map(p=>p[c]))-Math.min(...pts.map(p=>p[c]));});assert.deepEqual(bounds,[65,65,37]);
 }
 assert.equal(signatures.size,11);
});
