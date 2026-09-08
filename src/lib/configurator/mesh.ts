export type OcctMesh = {
  color?: number[];
  attributes: { position: { array: number[] }; normal?: { array: number[] } };
  index?: { array: number[] };
};
