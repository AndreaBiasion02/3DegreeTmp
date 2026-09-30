// Rebuild category examples through the same mesh/preview pipeline as the catalog.
import { spawnSync } from 'node:child_process';
import { coasterCategories } from '../src/lib/coaster-categories.mjs';

const slugs = new Set(coasterCategories.flatMap(category => category.examples.map(example => example.productSlug)));
for (const slug of slugs) {
  const result = spawnSync(process.execPath, ['scripts/build-generated-coasters.mjs', '--only', slug.replace(/^sottobicchiere-/, '')], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Failed to rebuild ${slug}`);
}
console.log(`Rebuilt ${slugs.size} catalog examples. Category cards use these same assets.`);
