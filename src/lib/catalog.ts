import data from "./products.json";
export type CapPreset = {
  structureColor: string;
  middleColor: string;
  lineColor: string;
  text: string;
  fontKey: string;
  textColor: string;
};
export type Product = {
  slug: string;
  name: string;
  description: string;
  dimensions: number[];
  assembly: string;
  image: string;
  model: string;
  openModel: string;
  kind?: "cap" | "faculty-cap";
  collection: string;
  symbol?: string;
  preset?: CapPreset;
  modelVersion?: string;
};
export const products: Product[] = data as Product[];
