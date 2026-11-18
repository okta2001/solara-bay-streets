// Solara Bay Streets - make.fun handoff program.
// Copies the playable game and its screenshots into the output directory
// and writes the dossier that describes the entry.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

console.log(`[handoff] Solara Bay Streets`);
console.log(`[handoff] repo:   ${repoRoot}`);
console.log(`[handoff] output: ${outputDir}`);

mkdirSync(outputDir, { recursive: true });

for (const name of ['game', 'screenshots']) {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ in repo`);
  cpSync(from, to, { recursive: true });
  console.log(`[handoff] copied ${name}/ -> ${to}`);
}

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`[handoff] wrote dossier.json (${dossier.length} chars)`);

// Verify the copied tree really landed: every source directory must exist
// in the output and hold at least one file, and the dossier must be readable.
function countFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(join(dir, entry.name));
    else n += 1;
  }
  return n;
}
for (const name of ['game', 'screenshots']) {
  const dir = join(outputDir, name);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`verification failed: ${dir} is missing after copy`);
  }
  const files = countFiles(dir);
  if (files === 0) throw new Error(`verification failed: ${dir} is empty`);
  console.log(`[handoff] verified ${name}/: ${files} file(s) present`);
}
const dossierPath = join(outputDir, 'dossier.json');
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes === 0) throw new Error('verification failed: dossier.json is empty');
console.log(`[handoff] summary: game + screenshots copied, dossier.json ${dossierBytes} bytes, all checks passed`);
console.log('[handoff] done');
