// Curated from the filament palette. Both ink colors remain legible on the base.
export const coasterColorways = [
  { structure: '#ffffff', accent: '#2458b8', detail: '#dc2626' },
  { structure: '#2458b8', accent: '#ffffff', detail: '#facc15' },
  { structure: '#222222', accent: '#ffffff', detail: '#f97316' },
  { structure: '#ffffff', accent: '#222222', detail: '#218c45' },
  { structure: '#803fa1', accent: '#ffffff', detail: '#facc15' },
  { structure: '#ffffff', accent: '#803fa1', detail: '#dc2626' },
  { structure: '#facc15', accent: '#222222', detail: '#2458b8' },
  { structure: '#222222', accent: '#f97316', detail: '#ffffff' },
  { structure: '#ffffff', accent: '#222222', detail: '#2458b8' },
];

export function catalogCoasterColorway(index) {
  return coasterColorways[index % coasterColorways.length];
}

const categoryColorway = {
  meme: 1,
  party: 2,
  faculty: 0,
  student: 4,
  gaming: 7,
  personal: 5,
  free: 3,
};

export function categoryCoasterColorway(category) {
  return coasterColorways[categoryColorway[category] ?? categoryColorway.free];
}
