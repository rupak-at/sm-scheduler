import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const rootEnv = fileURLToPath(new URL('../.env', import.meta.url));
const rootExample = fileURLToPath(new URL('../.env.example', import.meta.url));
let configuration = readFileSync(existsSync(rootEnv) ? rootEnv : rootExample, 'utf8');
if (!/^BETTER_AUTH_SECRET=.+$/m.test(configuration)) {
  configuration = configuration.replace(/^BETTER_AUTH_SECRET=.*\n?/m, '');
  configuration += `\nBETTER_AUTH_SECRET=${randomBytes(32).toString('base64')}\n`;
}
if (!/^TOKEN_ENCRYPTION_KEY=.+$/m.test(configuration)) {
  configuration = configuration.replace(/^TOKEN_ENCRYPTION_KEY=.*\n?/m, '');
  configuration += `\nTOKEN_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\n`;
}
writeFileSync(rootEnv, configuration, { mode: 0o600 });
chmodSync(rootEnv, 0o600);

const webEnv = fileURLToPath(new URL('../frontend/.env.local', import.meta.url));
if (!existsSync(webEnv)) {
  const example = new URL('../frontend/.env.example', import.meta.url);
  writeFileSync(webEnv, readFileSync(example), { mode: 0o600 });
}
process.stdout.write('Local environment configured. Existing values preserved.\n');
