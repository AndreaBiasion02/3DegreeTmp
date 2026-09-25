import { CAP_SYMBOLS } from './cap-symbols';

export interface CoasterSymbol {
  id: string;
  label: string;
  category: string;
  description?: string;
  paths: Array<{ d: string; fill: boolean; strokeWidth: number }>;
}

export const COASTER_LIFESTYLE_SYMBOLS: CoasterSymbol[] = [
  {
    id: 'toast',
    label: 'Calici da brindisi',
    category: 'Festa e Lifestyle',
    description: 'Due calici che brindano',
    paths: [{ d: 'M 45 20 L 48 24 V 27 M 46 27 H 50 M 55 20 L 52 24 V 27 M 50 27 H 54 M 49.5 20.5 L 50.5 22', fill: false, strokeWidth: 1.4 }],
  },
  {
    id: 'beer',
    label: 'Boccale di birra',
    category: 'Festa e Lifestyle',
    description: 'Boccale schiumoso pop',
    paths: [{ d: 'M 46 20 H 52 V 27 H 46 Z M 52 22 H 55 V 25 H 52 M 45 20 Q 49 18 53 20', fill: false, strokeWidth: 1.4 }],
  },
  {
    id: 'coffee',
    label: 'Tazzina di caffè',
    category: 'Festa e Lifestyle',
    description: 'Tazzina con fumo caldo',
    paths: [{ d: 'M 45 23 H 53 V 26 A 4 4 0 0 1 45 26 Z M 53 24 H 55 V 26 H 53 M 47 21 C 47 20 49 20 49 19 M 51 21 C 51 20 53 20 53 19', fill: false, strokeWidth: 1.4 }],
  },
  {
    id: 'star',
    label: 'Stella celebrativa',
    category: 'Festa e Lifestyle',
    description: 'Stella a 5 punte brillante',
    paths: [{ d: 'M 50 18 L 51.5 22.5 L 56 22.5 L 52.5 25 L 54 29.5 L 50 27 L 46 29.5 L 47.5 25 L 44 22.5 L 48.5 22.5 Z', fill: false, strokeWidth: 1.3 }],
  },
  {
    id: 'divider',
    label: 'Linea divisoria inferiore',
    category: 'Grafica',
    description: 'Accento orizzontale pulito in basso',
    paths: [{ d: 'M 34 73 H 66', fill: false, strokeWidth: 1.5 }],
  },
];

export const ALL_COASTER_SYMBOLS: CoasterSymbol[] = [
  ...CAP_SYMBOLS.filter(s => s.category === 'Laurea').map(s => ({
    id: s.id,
    label: s.label,
    category: 'Simboli di Laurea',
    description: s.description,
    paths: [{ d: s.topPath, fill: s.fill ?? false, strokeWidth: s.strokeWidth ?? 1.5 }],
  })),
  ...COASTER_LIFESTYLE_SYMBOLS,
  ...CAP_SYMBOLS.filter(s => s.category !== 'Laurea').map(s => ({
    id: s.id,
    label: s.label,
    category: 'Facoltà Universitarie',
    description: s.description,
    paths: [{ d: s.topPath, fill: s.fill ?? false, strokeWidth: s.strokeWidth ?? 1.5 }],
  })),
];

export function getCoasterSymbol(id: string): CoasterSymbol | undefined {
  return ALL_COASTER_SYMBOLS.find(s => s.id === id);
}
