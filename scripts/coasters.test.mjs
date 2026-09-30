import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { drawnBorderCoverage } from './coaster-border-audit.mjs';
import { getPathBounds } from '../src/lib/coaster-art.mjs';
import { COASTER_BORDER_RADIUS } from '../src/lib/coaster-tracing.mjs';
import { catalogCoasterColorway, categoryCoasterColorway, coasterColorways } from '../src/lib/coaster-colorways.mjs';
import { coasterCategories } from '../src/lib/coaster-categories.mjs';
const products=JSON.parse(fs.readFileSync('src/lib/products.json')).filter(p=>p.kind==='coaster');
const palette=JSON.parse(fs.readFileSync('src/lib/filament-palette.json')).map(color=>color.hex);
const luminance=hex=>[1,3,5].map((start,index)=>{
 const channel=parseInt(hex.slice(start,start+2),16)/255;
 return (channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];
}).reduce((sum,value)=>sum+value,0);
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};
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
  for(const m of j.meshes){const a=j.accessors[m.primitives[0].attributes.POSITION],v=j.bufferViews[a.bufferView],pts=Array.from({length:a.count},(_,i)=>[0,1,2].map(c=>bin.readFloatLE((v.byteOffset||0)+i*12+c*4)));for(const t of pts)for(let c=0;c<3;c++){bounds[c][0]=Math.min(bounds[c][0],t[c]);bounds[c][1]=Math.max(bounds[c][1],t[c]);}if(m.name==='coaster_ink'){assert(Math.abs(pts.reduce((min,p)=>Math.min(min,p[2]),Infinity)-3.4)<1e-5);assert.equal(pts.reduce((max,p)=>Math.max(max,p[2]),-Infinity),4);}
  }
  assert.deepEqual(bounds,[[-37.5,37.5],[-37.5,37.5],[0,4]]);assert.deepEqual(p.dimensions,[75,75,4]);
 }
});
test('Coaster exterior walls close the perimeter, face outward, and the bottom has the base color',()=>{
 for(const p of products){
  const slug=p.slug.replace('sottobicchiere-','');
  for(const part of ['base']){
   const stl=fs.readFileSync(`public/models/sottobicchieri/${slug}-${part}.stl`),edges=new Map();
   let sidewalls=0,bottoms=0;
   for(let i=0;i<stl.readUInt32LE(80);i++){
    const offset=84+i*50,normal=[0,1,2].map(c=>stl.readFloatLE(offset+c*4));
    const points=[0,1,2].map(v=>[0,1,2].map(c=>stl.readFloatLE(offset+12+v*12+c*4)));
    const keys=points.map(point=>point.join(','));
    for(let v=0;v<3;v++){
     const a=keys[v],b=keys[(v+1)%3],key=[a,b].sort().join('|');
     const edge=edges.get(key)||{count:0,direction:0};edge.count++;edge.direction+=a<b?1:-1;edges.set(key,edge);
    }
    if(part==='base'&&new Set(points.map(point=>point[2])).size>1&&points.every(point=>Math.abs(Math.hypot(point[0],point[1])-37.5)<.0001)){
     const center=[0,1].map(c=>points.reduce((sum,point)=>sum+point[c],0)/3);
     assert(normal[0]*center[0]+normal[1]*center[1]>0,`${slug}: inward exterior wall`);sidewalls++;
    }
    if(part==='base'&&points.every(point=>point[2]===0)){assert(normal[2]<0,`${slug}: upward bottom`);bottoms++;}
   }
   for(const [key,edge] of edges){
    const endpoints=key.split('|').map(point=>point.split(',').map(Number));
    if(!endpoints.every(point=>Math.abs(Math.hypot(point[0],point[1])-37.5)<.0001))continue;
    assert.equal(edge.count,2,`${slug}: open perimeter edge`);assert.equal(edge.direction,0,`${slug}: inconsistent perimeter orientation`);
   }
   if(part==='base'){assert(sidewalls>0);assert(bottoms>0);}
  }
  const glb=fs.readFileSync('public'+p.model),length=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+length)),bin=glb.subarray(28+length);
  const primitive=json.meshes.find(mesh=>mesh.name==='coaster_base').primitives[0];
  const position=json.accessors[primitive.attributes.POSITION],color=json.accessors[primitive.attributes.COLOR_0];
  const positionView=json.bufferViews[position.bufferView],colorView=json.bufferViews[color.bufferView];
  const expected=[1,3,5].map(i=>parseInt(p.colors.structure.slice(i,i+2),16));
  let bottoms=0;
  for(let i=0;i<position.count;i++)if(bin.readFloatLE(positionView.byteOffset+i*12+8)===0){
   assert.deepEqual([...bin.subarray(colorView.byteOffset+i*4,colorView.byteOffset+i*4+3)],expected,`${slug}: bottom filament color`);bottoms++;
  }
  assert(bottoms>0);
 }
});
test('Catalog coaster artwork is generated, reusable, and split into two printable ink colors',()=>{
 assert.equal(products.length,54);
 for(const [index,p] of products.entries()){
  const slug=p.slug.replace('sottobicchiere-','');
  const art=JSON.parse(fs.readFileSync(`scripts/coaster-artworks/${slug}.json`,'utf8'));
  assert.equal(art.imageComposition,true);
  assert(art.paths.some(path=>path.role==='foreground'));
  assert(art.paths.some(path=>path.role==='accent'));
  assert.deepEqual(p.colors,catalogCoasterColorway(index));
  const svg=fs.readFileSync(`public/models/sottobicchieri/${slug}.svg`,'utf8');
  for(const color of Object.values(p.colors)) assert(svg.includes(`fill="${color}"`),`${slug}: preview color ${color} missing`);
  for(const color of ['nera','rossa']){
   const stl=fs.readFileSync(`public/models/sottobicchieri/${slug}-grafica-${color}.stl`);
   assert(stl.readUInt32LE(80)>0,`${slug}: missing ${color} ink triangles`);
  }
  const glb=fs.readFileSync('public'+p.model),length=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+length));
  assert.deepEqual(json.meshes.map(mesh=>mesh.name),['coaster_base','coaster_ink','coaster_accent']);
 }
});
test('Default colorways use available filaments and keep both printed inks legible',()=>{
 assert(coasterColorways.length>=6);
 assert(new Set(coasterColorways.map(colors=>colors.structure)).size>=4);
 for(const colors of coasterColorways){
  assert.equal(new Set(Object.values(colors)).size,3);
  for(const color of Object.values(colors)) assert(palette.includes(color),`Unavailable filament ${color}`);
  assert(contrast(colors.structure,colors.accent)>=4.5,`Main ink contrast: ${JSON.stringify(colors)}`);
  assert(contrast(colors.structure,colors.detail)>=4,`Detail ink contrast: ${JSON.stringify(colors)}`);
 }
 for(const category of ['meme','party','faculty','student','gaming','personal','free']) assert(coasterColorways.includes(categoryCoasterColorway(category)));
});
test('Every inspiration example uses the identical catalog preview and its normalized border',async()=>{
 for(const category of coasterCategories){
  for(const example of category.examples){
   const product=products.find(product=>product.slug===example.productSlug);
   assert(product,`${example.title}: missing from catalog`);
   assert.equal(example.image,product.image);
   assert.equal(example.title,product.name);
   if(product.slug==='sottobicchiere-brindisi-neo-disoccupato'){
    assert(example.brief.includes('neo-laureato'));assert(example.brief.includes('disoccupato'));assert(example.brief.includes('linea orizzontale'));
   }else assert(example.brief.includes(product.name));
   const slug=product.slug.replace('sottobicchiere-','');
   const art=JSON.parse(fs.readFileSync(`scripts/coaster-artworks/${slug}.json`,'utf8'));
   assert.equal(art.paths[0].fill,false);assert.match(art.paths[0].d,/\bA\s/);
   assert(Math.abs(getPathBounds(art.paths[0].d).maxRadius-COASTER_BORDER_RADIUS)<.01);
   const colors=Object.values(product.colors).map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
   const {data}=await sharp(`public${example.image}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const counts=[0,0,0];
   for(let i=0;i<data.length;i+=4){
    if(data[i+3]<240)continue;
    for(let c=0;c<colors.length;c++)if(colors[c].every((channel,k)=>Math.abs(data[i+k]-channel)<=12))counts[c]++;
   }
   counts.forEach((count,index)=>assert(count>100,`${example.title}: color ${index} missing from example`));
  }
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
