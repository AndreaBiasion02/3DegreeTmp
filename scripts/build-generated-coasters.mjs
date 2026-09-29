import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ShapePath } from 'three';
import pc from 'polygon-clipping';
import sharp from 'sharp';
import { writeGlb, writeStl } from './coaster-geometry.mjs';
import { drawnBorderCoverage } from './coaster-border-audit.mjs';
import { catalogCoasterColorway } from '../src/lib/coaster-colorways.mjs';

const radius = 37.5, scale = 75 / 96;
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
const products = JSON.parse(fs.readFileSync('src/lib/products.json', 'utf8'));
const round = v => Math.round(v*10000)/10000;
const circle = (r, n = 160) => [[Array.from({length:n+1},(_,i)=>[round(r*Math.cos(i*2*Math.PI/n)),round(r*Math.sin(i*2*Math.PI/n))])]];
const disk = circle(radius);
const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
const shapePath = d => {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi) || [];
  const result = new ShapePath();
  let i=0, command='', x=0, y=0, startX=0, startY=0;
  const number = () => { if (i >= tokens.length || /^[a-z]$/i.test(tokens[i])) throw new Error(`Invalid path data: ${d.slice(0,80)}`); return Number(tokens[i++]); };
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    if (!command) throw new Error(`Missing SVG command: ${d.slice(0,80)}`);
    const relative = command === command.toLowerCase(), c = command.toUpperCase();
    const point = () => {const a=number(),b=number();return relative?[x+a,y+b]:[a,b];};
    if(c==='M') { [x,y]=point(); result.moveTo(x,y); startX=x;startY=y;command=relative?'l':'L'; }
    else if(c==='L') { [x,y]=point();result.lineTo(x,y); }
    else if(c==='H') {const a=number();x=relative?x+a:a;result.lineTo(x,y);}
    else if(c==='V') {const a=number();y=relative?y+a:a;result.lineTo(x,y);}
    else if(c==='C') {const [x1,y1]=point(),[x2,y2]=point(),[nx,ny]=point();result.bezierCurveTo(x1,y1,x2,y2,nx,ny);x=nx;y=ny;}
    else if(c==='Q') {const [x1,y1]=point(),[nx,ny]=point();result.quadraticCurveTo(x1,y1,nx,ny);x=nx;y=ny;}
    else if(c==='Z') {result.currentPath.closePath();x=startX;y=startY;command='';}
    else throw new Error(`Unsupported SVG command ${command}`);
  }
  return result;
};
const ringToMm = vectors => {
  const ring = vectors.map(v=>[round((v.x-50)*scale),round((49-v.y)*scale)]).filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
  if (ring.length && Math.hypot(ring[0][0]-ring.at(-1)[0],ring[0][1]-ring.at(-1)[1])>1e-7) ring.push([...ring[0]]);
  return ring;
};
const polygonsFromArt = path => {
  if (!path.fill) {
    if (/\bA\s+[\d.]+\s+[\d.]+/.test(path.d)) {
      const width=path.strokeWidth*scale, outer=radius-2+width/2;
      return pc.difference(circle(outer),circle(outer-width));
    }
    throw new Error('Unsupported open path in generated art');
  }
  return shapePath(path.d).toShapes().map(shape => {
    const {shape: contour, holes} = shape.extractPoints(3);
    return [ringToMm(contour),...holes.map(ringToMm)];
  }).filter(p=>p[0].length>=4);
};
const svgPath = shape => shape.map(poly=>poly.map(ring=>'M'+ring.map(([x,y])=>`${x.toFixed(3)},${(-y).toFixed(3)}`).join('L')+'Z').join('')).join('');
const meshSvg = (colors, black, red, phrase, outer=false) => `<svg xmlns="http://www.w3.org/2000/svg" width="${outer?1860:'75mm'}" height="${outer?1420:'75mm'}" viewBox="${outer?'0 0 465 355':'-37.5 -37.5 75 75'}"><title>${phrase.replaceAll('&','&amp;').replaceAll('<','&lt;')}</title>${outer?'<rect width="465" height="355" fill="#f0efed"/><ellipse cx="235" cy="302" rx="141" ry="12" fill="#222222" opacity=".10"/><g transform="translate(232.5 177) scale(3.70666667 3.53333333)"><circle cy="3" r="37.5" fill="#222222"/>':''}<circle r="37.5" fill="${colors.structure}"/><path d="${svgPath(black)}" fill="${colors.accent}" fill-rule="evenodd"/><path d="${svgPath(red)}" fill="${colors.detail}" fill-rule="evenodd"/>${outer?'</g>':''}</svg>`;
const report=[];
for (const [index, product] of products.filter(p=>p.kind==='coaster').entries()) {
  if (only && !product.slug.endsWith(only)) continue;
  const colors=catalogCoasterColorway(index);
  const slug=product.slug.replace(/^sottobicchiere-/,'');
  const file=`scripts/coaster-artworks/${slug}.json`;
  if (!fs.existsSync(file)) throw new Error(`Missing generated artwork: ${file}`);
  const artwork=JSON.parse(fs.readFileSync(file,'utf8'));
  if (!artwork.paths[0]?.d.includes(' A ') || await drawnBorderCoverage(artwork.paths)>=.95) throw new Error(`Unnormalized generated border: ${slug}`);
  const blackParts=artwork.paths.filter(p=>p.role==='foreground').flatMap(polygonsFromArt);
  const redParts=artwork.paths.filter(p=>p.role==='accent').flatMap(polygonsFromArt);
  console.log(`Tracing ${slug}: ${blackParts.length} dark shapes, ${redParts.length} red shapes`);
  if (!blackParts.length) throw new Error(`No ink in ${slug}`);
  const result=spawnSync('python',['scripts/coaster-mesh.py'],{input:JSON.stringify({disk,black:blackParts,red:redParts}),encoding:'utf8',maxBuffer:100*1024*1024});
  if(result.status!==0)throw new Error(`Mesh construction failed for ${slug}: ${result.stderr||result.error?.message}`);
  const {baseTris,blackTris,redTris,black,red}=JSON.parse(result.stdout);
  writeGlb([{name:'coaster_base',tris:baseTris,color:rgb(colors.structure)},{name:'coaster_ink',tris:blackTris,color:rgb(colors.accent)},...(redTris.length?[{name:'coaster_accent',tris:redTris,color:rgb(colors.detail)}]:[])],`public/products/${product.slug}.glb`);
  writeStl(baseTris,`public/models/sottobicchieri/${slug}-base.stl`);
  writeStl([...blackTris,...redTris],`public/models/sottobicchieri/${slug}-grafica.stl`);
  writeStl(blackTris,`public/models/sottobicchieri/${slug}-grafica-nera.stl`);
  if(redTris.length) writeStl(redTris,`public/models/sottobicchieri/${slug}-grafica-rossa.stl`);
  fs.writeFileSync(`public/models/sottobicchieri/${slug}.svg`,meshSvg(colors,black,red,product.name));
  const svg=meshSvg(colors,black,red,product.name,true);
  for(const [suffix,width] of [['',465],['@2x',930],['@4x',1860]]) await sharp(Buffer.from(svg)).resize(width).webp({quality:95}).toFile(`public/products/${product.slug}${suffix}.webp`);
  product.colors={structure:colors.structure,accent:colors.accent,...(redTris.length?{detail:colors.detail}:{})};
  report.push({slug:product.slug,phrase:product.name,diameterMm:75,heightMm:4,inlayDepthMm:.6,triangles:baseTris.length+blackTris.length+redTris.length,blackParts:black.length,redParts:red.length});
  console.log(`Built ${slug}: ${report.at(-1).triangles} triangles`);
}
if (!only) {
  fs.writeFileSync('src/lib/products.json',JSON.stringify(products,null,2)+'\n');
  fs.writeFileSync('public/models/sottobicchieri/geometry-report.json',JSON.stringify(report,null,2)+'\n');
  const thumbs=await Promise.all(products.filter(p=>p.kind==='coaster').map(p=>sharp('public'+p.image).resize(465,355).toBuffer()));
  await sharp({create:{width:1860,height:Math.ceil(thumbs.length/4)*355,channels:3,background:'#f0efed'}}).composite(thumbs.map((input,i)=>({input,left:i%4*465,top:Math.floor(i/4)*355}))).png().toFile('public/models/sottobicchieri/anteprima-collezione.png');
  const newer=thumbs.slice(16);
  await sharp({create:{width:1860,height:Math.ceil(newer.length/4)*355,channels:3,background:'#f0efed'}}).composite(newer.map((input,i)=>({input,left:i%4*465,top:Math.floor(i/4)*355}))).png().toFile('public/models/sottobicchieri/anteprima-nuovi-modelli.png');
}
