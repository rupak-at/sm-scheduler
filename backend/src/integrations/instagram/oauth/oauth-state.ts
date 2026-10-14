import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '../../../database/index.js';
import { InstagramError } from '../http.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export async function createOAuthState(
  db: PrismaClient,
  mode: 'login' | 'connect' | 'facebook-connect' | 'tiktok-connect',
  userId?: string,
  sessionId?: string,
) {
  const state = randomBytes(32).toString('hex');
  const browser = randomBytes(32).toString('hex');
  await db.oAuthAttempt.create({
    data: {
      stateHash: hash(state),
      browserHash: hash(browser),
      mode,
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  return { state, browser };
}
export async function consumeOAuthState(db: PrismaClient, state: string, browser: string) {
  const stateHash = hash(state);
  const attempt = await db.oAuthAttempt.findUnique({ where: { stateHash } });
  if (
    !attempt ||
    attempt.browserHash !== hash(browser) ||
    attempt.expiresAt.getTime() <= Date.now()
  )
    throw new InstagramError('INVALID_OAUTH_STATE');
  const result = await db.oAuthAttempt.deleteMany({
    where: { stateHash, browserHash: hash(browser), expiresAt: { gt: new Date() } },
  });
  if (result.count !== 1) throw new InstagramError('INVALID_OAUTH_STATE');
  return attempt;
}
