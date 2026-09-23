export interface CapSymbol {
  id: string;
  lucide: string;
  label: string;
  category: string;
  description: string;
  fill: boolean;
  strokeWidth: number;
  topPath: string;
  centerPath: string;
}

export declare const CAP_SYMBOLS: readonly CapSymbol[];
export declare const CAP_SYMBOL_MAP: Record<string, CapSymbol>;
export declare function getCapSymbol(id: string): CapSymbol | null;
export declare function detectSymbolFromText(text: string): string | null;
