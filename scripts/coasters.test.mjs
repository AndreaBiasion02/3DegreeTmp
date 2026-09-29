import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { drawnBorderCoverage } from './coaster-border-audit.mjs';
import { getPathBounds } from '../src/lib/coaster-art.mjs';
import { COASTER_BORDER_RADIUS } from '../src/lib/coaster-tracing.mjs';
const products=JSON.parse(fs.readFileSync('src/lib/products.json')).filter(p=>p.kind==='coaster');
test('Every catalog coaster has a self-contained 75 mm top-view SVG and 75 mm STL base', () => {
 for (const p of products) {
  const slug=p.slug.replace('sottobicchiere-','');
  const svg=fs.readFileSync(`public/models/sottobicchieri/${slug}.svg`,'utf8');
  assert.match(svg,/width="75mm" height="75mm" viewBox="-37\.5 -37\.5 75 75"/);
  assert.match(svg,/<circle r="37\.5"/);assert(!/<text|<image|<ellipse/.test(svg));
  const stl=fs.readFileSync(`public/models/sottobicchieri/${slug}-base.stl`);
  const bounds=[[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];
  for(let i=0;i<stl.readUInt32LE(80);i++)for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++){
   const value=stl.readFloatLE(84+i*50+12+v*12+axis*4);bounds[axis][0]=Math.min(bounds[axis][0],value);bounds[axis][1]=Math.max(bounds[axis][1],value);
  }
  assert.deepEqual(bounds,[[-37.5,37.5],[-37.5,37.5],[0,4]]);
 }
});
test('Fifty-four coasters preserve the requested phrases and have high-resolution images',async()=>{
 const expected=['110 e vodka','Laureato per sbaglio','Dottore su LinkedIn','Finalmente disoccupato','Missione compiuta. Più o meno.','CTRL + ALT + LAUREA','Achievement unlocked: Dottore','Game Over: Università','Respawn: mondo del lavoro','Laureato.exe ha smesso di funzionare','ChatGPT ce l’abbiamo fatta','3 anni in 7 comodi anni','Studiavo meglio sotto pressione','Tesi? Mai sentita.','Powered by caffè e ansia','Laureato con CTRL+C / CTRL+V'];
 const extra=JSON.parse(fs.readFileSync('scripts/coasters-extra.json'));assert.equal(extra.length,38);
 assert.deepEqual(products.map(p=>p.name),[...expected,...extra.map(e=>e[1])]);assert(products.every(p=>/NFC integrato/.test(p.description)&&/NFC integrato/.test(p.assembly)));
 for(const p of products){const m=await sharp('public'+p.image.replace('.webp','@4x.webp')).metadata();assert.equal(m.width,1860);assert.equal(m.height,1420);const html=fs.readFileSync(`out/products/${p.slug}/index.html`,'utf8');const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));assert.equal(schemas.find(s=>s['@type']==='Product').category,'Sottobicchieri di laurea');}
});
test('Coasters are 75 mm wide, 4 mm thick, with a flush solid 0.6 mm graphic',()=>{
 for(const p of products){const b=fs.readFileSync('public'+p.model),l=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+l)),bin=b.subarray(28+l);const bounds=[[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];
  for(const m of j.meshes){const a=j.accessors[m.primitives[0].attributes.POSITION],v=j.bufferViews[a.bufferView],pts=Array.from({length:a.count},(_,i)=>[0,1,2].map(c=>bin.readFloatLE((v.byteOffset||0)+i*12+c*4)));for(const t of pts)for(let c=0;c<3;c++){bounds[c][0]=Math.min(bounds[c][0],t[c]);bounds[c][1]=Math.max(bounds[c][1],t[c]);}if(m.name==='coaster_ink'){assert(Math.abs(Math.min(...pts.map(p=>p[2]))-3.4)<1e-5);assert.equal(Math.max(...pts.map(p=>p[2])),4);}
  }
  assert.deepEqual(bounds,[[-37.5,37.5],[-37.5,37.5],[0,4]]);assert.deepEqual(p.dimensions,[75,75,4]);
 }
});
test('Catalog coaster artwork is generated, reusable, and split into two printable ink colors',()=>{
 assert.equal(products.length,54);
 for(const p of products){
  const slug=p.slug.replace('sottobicchiere-','');
  const art=JSON.parse(fs.readFileSync(`scripts/coaster-artworks/${slug}.json`,'utf8'));
  assert.equal(art.imageComposition,true);
  assert(art.paths.some(path=>path.role==='foreground'));
  assert(art.paths.some(path=>path.role==='accent'));
  assert.equal(p.colors.structure,art.background);
  assert.equal(p.colors.accent,art.foreground);
  assert.equal(p.colors.detail,art.accent);
  for(const color of ['nera','rossa']){
   const stl=fs.readFileSync(`public/models/sottobicchieri/${slug}-grafica-${color}.stl`);
   assert(stl.readUInt32LE(80)>0,`${slug}: missing ${color} ink triangles`);
  }
  const glb=fs.readFileSync('public'+p.model),length=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+length));
  assert.deepEqual(json.meshes.map(mesh=>mesh.name),['coaster_base','coaster_ink','coaster_accent']);
 }
});
test('Every catalog coaster has the same separate 2 mm ring and no integrated inner frame',async()=>{
 for(const p of products){
  const slug=p.slug.replace('sottobicchiere-','');
  const art=JSON.parse(fs.readFileSync(`scripts/coaster-artworks/${slug}.json`,'utf8'));
  assert.equal(art.paths[0].fill,false,slug);
  assert.match(art.paths[0].d,/\bA\s/,slug);
  assert(Math.abs(getPathBounds(art.paths[0].d).maxRadius-COASTER_BORDER_RADIUS)<.01,slug);
  assert(await drawnBorderCoverage(art.paths)<.95,slug);
 }
});
