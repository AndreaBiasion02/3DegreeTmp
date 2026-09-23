"use client";

import { useId } from 'react';
import { fontFamilies } from '@/lib/coaster-design.mjs';

export type Artwork = {
  title: string; concept: string; background: string; foreground: string;
  texts: { text: string; x: number; y: number; size: number; maxWidth: number;
    font: 'sans' | 'serif' | 'mono'; anchor: 'start' | 'middle' | 'end'; inverse: boolean }[];
  paths: { d: string; fill: boolean; strokeWidth: number }[];
  symbol?: string;
};

function measuredWidth(text: string, size: number, font: Artwork['texts'][number]['font']) {
  const units = [...text].reduce((sum, char) => sum + (font === 'mono' ? .62 : /[MW@%]/.test(char) ? .95 : /[ilI.,! '’]/.test(char) ? .3 : .62), 0);
  return Math.max(1, units * size);
}

export default function CoasterArtPreview({ art }: { art: Artwork }) {
  const clipId = useId().replaceAll(':', '');
  const exportClipId = `${clipId}-export`;
  const label = `Sottobicchiere: ${art.texts.map(t => t.text).join(' ')}`;

  return (
    <div className="relative mx-auto aspect-[465/355] w-full overflow-hidden rounded-[1.25rem] bg-[#f0efed]">
      {/* 3D tilted preview matching scripts/build-coasters.mjs exactly */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 465 355"
        role="img"
        aria-label={label}
        className="block h-full w-full"
      >
        <rect width="465" height="355" fill="#f0efed" />
        <ellipse cx="235" cy="302" rx="141" ry="12" fill="#222222" opacity=".10" />
        <g transform="translate(232.5 177) scale(3.97142857 3.78571429)">
          <circle cy="3" r="35" fill="#222222" />
          <circle r="35" fill={art.background} />
          <defs>
            <clipPath id={clipId}>
              <circle r="35" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {/* Map 100x100 (center 50,49, radius 48) to center 0,0, radius 35 */}
            <g transform="scale(0.72916667) translate(-50 -49)">
              <circle cx="50" cy="49" r="42" fill="none" stroke={art.foreground} strokeWidth="1.1" />
              {art.paths.map((path, index) => (
                <path
                  key={index}
                  d={path.d}
                  fill={path.fill ? art.foreground : 'none'}
                  stroke={path.fill ? 'none' : art.foreground}
                  strokeWidth={path.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {art.texts.map((t, index) => (
                <text
                  key={index}
                  x={t.x}
                  y={t.y}
                  textAnchor={t.anchor}
                  fontFamily={fontFamilies[t.font]}
                  fontSize={t.size}
                  fontWeight="700"
                  textLength={Math.min(t.maxWidth, measuredWidth(t.text, t.size, t.font))}
                  lengthAdjust="spacingAndGlyphs"
                  fill={t.inverse ? art.background : art.foreground}
                  data-font={t.font}
                >
                  {t.text}
                </text>
              ))}
            </g>
          </g>
        </g>
      </svg>

      {/* Flat 70mm top-down SVG for vector export without shadows */}
      <svg
        data-export-svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="2 1 96 96"
        width="70mm"
        height="70mm"
        className="sr-only"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={exportClipId}>
            <circle cx="50" cy="49" r="48" />
          </clipPath>
        </defs>
        <circle cx="50" cy="49" r="48" fill={art.background} />
        <g clipPath={`url(#${exportClipId})`}>
          <circle cx="50" cy="49" r="42" fill="none" stroke={art.foreground} strokeWidth="1.1" />
          {art.paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill={path.fill ? art.foreground : 'none'}
              stroke={path.fill ? 'none' : art.foreground}
              strokeWidth={path.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {art.texts.map((t, index) => (
            <text
              key={index}
              x={t.x}
              y={t.y}
              textAnchor={t.anchor}
              fontFamily={fontFamilies[t.font]}
              fontSize={t.size}
              fontWeight="700"
              textLength={Math.min(t.maxWidth, measuredWidth(t.text, t.size, t.font))}
              lengthAdjust="spacingAndGlyphs"
              fill={t.inverse ? art.background : art.foreground}
              data-font={t.font}
            >
              {t.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
