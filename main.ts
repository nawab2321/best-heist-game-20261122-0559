import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = fileURLToPath(new URL('./', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const captures = join(repository, 'screenshots');
const screenshotCount = readdirSync(captures).filter(name => !name.startsWith('.')).length;
if (screenshotCount !== 4) throw new Error('Black Vault requires four judging screenshots.');

mkdirSync(output, { recursive: true });
for (const directory of ['game', 'screenshots']) {
  cpSync(join(repository, directory), join(output, directory), { recursive: true });
}

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
if (dossier.byteLength > 1572864) throw new Error('Dossier exceeds the judging limit.');
writeFileSync(join(output, 'dossier.json'), dossier);
