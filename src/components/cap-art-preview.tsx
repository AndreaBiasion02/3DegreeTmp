"use client";

import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box } from 'lucide-react';
import { fontFamilies } from '@/lib/coaster-design.mjs';
import type { Artwork } from './coaster-art-preview';

const CapArt3D = dynamic(() => import('./cap-art-3d'), {
  ssr: false,
  loading: () => (
    <div className="relative mx-auto flex aspect-[465/355] w-full items-center justify-center rounded-[1.25rem] bg-[#f0efed]">
      <p className="text-sm font-semibold text-brand-dark/70">Inizializzazione 3D…</p>
    </div>
  ),
});

function measuredWidth(text: string, size: number, font: Artwork['texts'][number]['font']) {
  const units = [...text].reduce((sum, char) => sum + (font === 'mono' ? .62 : /[MW@%]/.test(char) ? .95 : /[ilI.,! '’]/.test(char) ? .3 : .62), 0);
  return Math.max(1, units * size);
}

export default function CapArtPreview({
  art,
  allow3D = true,
}: {
  art: Artwork;
  allow3D?: boolean;
}) {
  const [is3D, setIs3D] = useState(false);
  const clipId = useId().replaceAll(':', '');
  const exportClipId = `${clipId}-export`;
  const baseGradId = `${clipId}-base-grad`;
  const bandGradId = `${clipId}-band-grad`;
  const rimGradId = `${clipId}-rim-grad`;

  // For tocco, the cap structure is always black, while the chosen color applies to scritte, banda and sottile anello
  const defaultGreen = '#218c45';
  const accentColor = (!art.foreground || art.foreground === '#ffffff') ? defaultGreen : art.foreground;
  const structureColor = '#222222';
  const label = `Tocco di laurea: ${art.texts.map(t => t.text).join(' ')}`;

  if (is3D && allow3D) {
    return (
      <div className="relative mx-auto aspect-[465/355] w-full">
        <CapArt3D art={{ ...art, background: structureColor, foreground: accentColor }} onClose={() => setIs3D(false)} />
      </div>
    );
  }

  return (
    <div className="group relative mx-auto aspect-[465/355] w-full overflow-hidden rounded-[1.25rem] bg-[#f0efed]">
      {/* Photorealistic 2D Tocco Preview matching official CAD render geometry */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 465 355"
        role="img"
        aria-label={label}
        className="block h-full w-full select-none"
      >
        <defs>
          {/* Black cylinder body gradient with round 3D studio lighting */}
          <linearGradient id={baseGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#121212" />
            <stop offset="25%" stopColor="#252525" />
            <stop offset="60%" stopColor="#303030" />
            <stop offset="85%" stopColor="#1f1f1f" />
            <stop offset="100%" stopColor="#141414" />
          </linearGradient>

          {/* Colored ribbon band gradient with realistic cylindrical sheen */}
          <linearGradient id={bandGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.75" />
            <stop offset="25%" stopColor={accentColor} stopOpacity="0.95" />
            <stop offset="55%" stopColor={accentColor} stopOpacity="1" />
            <stop offset="85%" stopColor={accentColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.7" />
          </linearGradient>

          {/* Thin accent ring gradient right under the lid */}
          <linearGradient id={rimGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.75" />
          </linearGradient>

          <clipPath id={clipId}>
            <rect x="0" y="0" width="100" height="100" rx="3.5" />
          </clipPath>
        </defs>

        <rect width="465" height="355" fill="#f0efed" />

        {/* ======================================================== */}
        {/* 1. CYLINDER BASE (Full width 232.6 px from CAD projection) */}
        {/* ======================================================== */}
        <g>
          {/* Upper black cylinder under the lid (Z = 25 to 35 mm) */}
          <path
            d="M 116.2 165
               C 116.2 210, 172 235, 232.5 235
               C 293 235, 348.8 210, 348.8 165
               L 348.8 200
               C 348.8 245, 293 270, 232.5 270
               C 172 270, 116.2 245, 116.2 200 Z"
            fill={`url(#${baseGradId})`}
          />

          {/* Thin accent ring under the lid (bordo) */}
          <path
            d="M 116.2 165
               C 116.2 210, 172 235, 232.5 235
               C 293 235, 348.8 210, 348.8 165
               L 348.8 171
               C 348.8 216, 293 241, 232.5 241
               C 172 241, 116.2 216, 116.2 171 Z"
            fill={`url(#${rimGradId})`}
          />

          {/* Slim colored ribbon band (fascia, height ~28px) */}
          <path
            d="M 116.2 200
               C 116.2 245, 172 270, 232.5 270
               C 293 270, 348.8 245, 348.8 200
               L 348.8 228
               C 348.8 273, 293 298, 232.5 298
               C 172 298, 116.2 273, 116.2 228 Z"
            fill={`url(#${bandGradId})`}
          />

          {/* Band bottom border accent */}
          <path
            d="M 116.2 228 C 116.2 273, 172 298, 232.5 298 C 293 298, 348.8 273, 348.8 228"
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="0.9"
          />

          {/* Black lower base cylinder (struttura_base, Z = 0 to 15 mm) */}
          <path
            d="M 116.2 228
               C 116.2 273, 172 298, 232.5 298
               C 293 298, 348.8 273, 348.8 228
               L 348.8 280
               C 348.8 325, 293 350, 232.5 350
               C 172 350, 116.2 325, 116.2 280 Z"
            fill={`url(#${baseGradId})`}
          />

          {/* Rounded bottom table contact contour */}
          <path
            d="M 116.2 280 C 116.2 325, 172 350, 232.5 350 C 293 350, 348.8 325, 348.8 280"
            fill="none"
            stroke="#444444"
            strokeWidth="0.8"
            opacity=".35"
          />
        </g>

        {/* ======================================================== */}
        {/* 2. SQUARE MORTARBOARD LID (65 × 65 mm CAD projected)      */}
        {/* ======================================================== */}
        <g>
          {/* Lid thickness: front-left face (Corner 0 -> Corner 1) */}
          <path
            d="M 44.65 184.59 L 282.23 267.46 L 282.23 277.66 L 44.65 194.79 Z"
            fill="#151515"
          />
          {/* Lid thickness: front-right face (Corner 1 -> Corner 2) */}
          <path
            d="M 282.23 267.46 L 420.35 123.81 L 420.35 134.01 L 282.23 277.66 Z"
            fill="#232323"
          />

          {/* Lid thickness bottom bevel highlight */}
          <path
            d="M 44.65 194.79 L 282.23 277.66 L 420.35 134.01"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Lid top diamond face (Z = 37 mm) - always black structure */}
          <polygon
            points="182.78,40.94 420.35,123.81 282.23,267.46 44.65,184.59"
            fill={structureColor}
          />

          {/* Top face perimeter highlight */}
          <polygon
            points="182.78,40.94 420.35,123.81 282.23,267.46 44.65,184.59"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.9"
          />

          {/* ======================================================== */}
          {/* 3. PROJECTED ARTWORK (Exact affine matrix onto diamond)   */}
          {/* ======================================================== */}
          <g transform="matrix(2.3757 0.8287 -1.3813 1.4365 182.78 40.94)">
            <g clipPath={`url(#${clipId})`}>
              {/* Inner square border */}
              <rect
                x="5"
                y="5"
                width="90"
                height="90"
                rx="3"
                fill="none"
                stroke={accentColor}
                strokeWidth="1.1"
              />

              {/* Vector paths */}
              {art.paths.map((path, index) => (
                <path
                  key={index}
                  d={path.d}
                  fill={path.fill ? accentColor : 'none'}
                  fillRule="evenodd"
                  stroke={path.fill ? 'none' : accentColor}
                  strokeWidth={path.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Texts */}
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
                  fill={t.inverse ? structureColor : accentColor}
                  data-font={t.font}
                >
                  {t.text}
                </text>
              ))}
            </g>
          </g>
        </g>
      </svg>

      {/* 3D View button toggle */}
      {allow3D && (
        <div className="absolute bottom-3 right-3 z-10 transition-opacity">
          <button
            type="button"
            onClick={() => setIs3D(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-brand-dark shadow-md backdrop-blur transition hover:bg-white hover:shadow-lg"
          >
            <Box size={14} aria-hidden="true" />
            Ruota in 3D ↗
          </button>
        </div>
      )}

      {/* Flat 65mm top-down SVG for vector export without perspective/shadows */}
      <svg
        data-export-svg
        data-cap-art
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width="65mm"
        height="65mm"
        className="sr-only"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={exportClipId}>
            <rect width="100" height="100" rx="4" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="4" fill={structureColor} />
        <g clipPath={`url(#${exportClipId})`}>
          <rect x="5" y="5" width="90" height="90" rx="3" fill="none" stroke={accentColor} strokeWidth="1.1" />
          {art.paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill={path.fill ? accentColor : 'none'}
              fillRule="evenodd"
              stroke={path.fill ? 'none' : accentColor}
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
              fill={t.inverse ? structureColor : accentColor}
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
