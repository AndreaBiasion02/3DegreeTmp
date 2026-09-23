import { createElement, useId } from 'react';
import { composeCoaster, icons, iconPaths, layouts, typographies, libraryIcons, fontFamilies } from '@/lib/coaster-design.mjs';

export type CoasterDesign = {
  title: string; secondaryIcon?: string; iconStyle?: 'outline' | 'sticker' | 'badge'; lines: string[]; emphasis: number;
  typography: keyof typeof typographies; icon: keyof typeof icons;
  layout: keyof typeof layouts; background: string; foreground: string;
};

const fonts = fontFamilies;
export function SymbolGraphic({ name }: { name: string }) {
  if (name === 'none') return null;
  const library = libraryIcons as unknown as Record<string, { nodes: [string, Record<string, string>][] }>;
  if (library[name]) return <>{library[name].nodes.map(([tag, attrs], i) => createElement(tag, { ...attrs, key: i }))}</>;
  return <path d={(iconPaths as Record<string, string>)[name]} />;
}

export default function CoasterPreview({ design }: { design: CoasterDesign }) {
  const clipId = useId().replaceAll(':', '');
  const { texts, icon, rotation } = composeCoaster(design);
  const ink = design.foreground;
  const hero = texts.find(t => t.emphasis);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="2 1 96 96" width="70mm" height="70mm" role="img" aria-label={`Sottobicchiere: ${design.lines.filter(s => s.trim()).join(' ')}`} className="mx-auto h-auto w-full max-w-[350px]">
    <defs><clipPath id={clipId}><circle cx="50" cy="49" r="48" /></clipPath></defs>
    <circle cx="50" cy="49" r="48" fill={design.background} />
    <g clipPath={`url(#${clipId})`}><g transform={`rotate(${rotation} 50 49)`}>
      {design.layout === 'classic' && <circle cx="50" cy="49" r="42" fill="none" stroke={ink} strokeWidth=".6" />}
      {design.layout === 'stamp' && <g fill="none" stroke={ink}><circle cx="50" cy="49" r="43" strokeWidth="1.5" /><circle cx="50" cy="49" r="39.5" strokeWidth=".45" /><path d="M25 18h50M28 73h12M60 73h12" strokeWidth=".8" /></g>}
      {design.layout === 'bold' && <g stroke={ink} strokeWidth="1.5"><path d="m22 18 7-3m42 0 7 3M21 78l7 4m44 0 7-4" /></g>}
      {design.layout === 'minimal' && <path d="M19 20h20M19 74h12" stroke={ink} strokeWidth="1.5" />}
      {design.layout === 'ticket' && <g stroke={ink} fill="none"><rect x="13" y="22" width="74" height="51" rx="2" strokeWidth="1.1" /><path d="M13 30h74" strokeWidth=".8" /><g fill={ink} stroke="none"><circle cx="18" cy="26" r="1" /><circle cx="22" cy="26" r="1" /><circle cx="26" cy="26" r="1" /></g></g>}
      {design.layout === 'split' && hero && <rect x="7" y={hero.y - hero.fontSize * .8 - 3} width="86" height={hero.fontSize + 6} rx="2" fill={ink} />}
      {design.layout === 'orbit' && <g fill="none" stroke={ink}><circle cx="50" cy="49" r="43" strokeWidth=".65" strokeDasharray="48 10 5 10" /><circle cx="50" cy="49" r="39" strokeWidth=".35" /><circle cx="83" cy="22" r="3" fill={ink} /><path d="m17 72 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill={ink} /></g>}
      {design.layout === 'laurel' && <g stroke={ink} fill="none" strokeWidth=".8"><path d="M40 88Q2 69 18 28M60 88Q98 69 82 28" />{[0,1,2,3,4,5].map(i => <g key={i}><ellipse cx={14 + i * .8} cy={30 + i * 9} rx="2" ry="5" transform={`rotate(-35 ${14 + i * .8} ${30 + i * 9})`} fill={ink} /><ellipse cx={86 - i * .8} cy={30 + i * 9} rx="2" ry="5" transform={`rotate(35 ${86 - i * .8} ${30 + i * 9})`} fill={ink} /></g>)}</g>}
      {design.layout === 'confetti' && <g fill={ink} stroke={ink} strokeWidth="1.1">{[0,1,2,3,4,5,6,7,8,9,10,11].map(i => <g key={i} transform={`rotate(${i * 30} 50 49)`}>{i % 2 ? <circle cx="50" cy="7" r="1.2" /> : <path d="m48 7 4 3m-4 0 4-3" />}</g>)}</g>}
      {design.layout === 'medal' && <g fill="none" stroke={ink}><circle cx="50" cy="49" r="38" strokeWidth=".8" />{Array.from({length:36},(_,i) => <path key={i} d="M50 5v4" strokeWidth={i % 3 ? '.6' : '1.5'} transform={`rotate(${i * 10} 50 49)`} />)}</g>}
      {texts.map(t => <text key={t.index} x={t.x} y={t.y} textAnchor={t.anchor as 'middle' | 'start'} fontFamily={fonts[t.font as keyof typeof fonts]} fontWeight={t.emphasis ? 900 : 700} fontSize={t.fontSize} textLength={t.width} lengthAdjust="spacingAndGlyphs" fill={t.inverse ? design.background : ink} data-font={t.font} data-emphasis={t.emphasis ? 'true' : undefined}>{t.text}</text>)}
      {[design.icon, design.secondaryIcon || 'none'].filter(name => name !== 'none').map((name, i, symbols) => {
        const x = icon.x + (symbols.length === 2 ? (i === 0 ? -icon.size * .65 : icon.size * .65) : 0);
        const sticker = design.iconStyle === 'sticker';
        return <g key={i} transform={`translate(${x} ${icon.y}) scale(${icon.size / 24})`}>
          {sticker && <circle cx="12" cy="12" r="15" fill={ink} />}
          {design.iconStyle === 'badge' && <rect x="-3" y="-3" width="30" height="30" rx="7" stroke={ink} strokeWidth="1.5" fill="none" />}
          <g fill="none" stroke={sticker ? design.background : ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><SymbolGraphic name={name} /></g>
        </g>;
      })}
    </g></g>
  </svg>;
}
