import { APIError } from 'better-auth/api';
import { instagramPlugin } from '../integrations/instagram/oauth/instagram.plugin.js';
import type { InstagramPluginOptions } from '../integrations/instagram/oauth/instagram.plugin.js';
import { INSTAGRAM_EMAIL_DOMAIN } from '../integrations/instagram/oauth/identity.js';
import type { PrismaClient } from '../database/index.js';
import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { toNodeHandler } from 'better-auth/node';
import type { AuthGateway } from '../types/auth.types.js';
import { facebookPlugin } from '../integrations/facebook/facebook.plugin.js';
import type { FacebookPluginOptions } from '../integrations/facebook/facebook.plugin.js';
import { tiktokPlugin } from '../integrations/tiktok/tiktok.plugin.js';
import type { TikTokPluginOptions } from '../integrations/tiktok/tiktok.plugin.js';

interface AuthOptions {
  database: PrismaClient;
  secret: string;
  webOrigin: string;
  production: boolean;
  instagram?: InstagramPluginOptions;
  facebook?: FacebookPluginOptions;
  tiktok?: TikTokPluginOptions;
}

export function createAuthentication(options: AuthOptions): AuthGateway {
  const auth = betterAuth({
    appName: 'Social Scheduler',
    baseURL: options.webOrigin,
    secret: options.secret,
    database: prismaAdapter(options.database, { provider: 'postgresql' }),
    trustedOrigins: [options.webOrigin],
    plugins: [
      ...(options.instagram ? [instagramPlugin(options.instagram)] : []),
      ...(options.facebook ? [facebookPlugin(options.facebook)] : []),
      ...(options.tiktok ? [tiktokPlugin(options.tiktok)] : []),
    ],
    account: { accountLinking: { enabled: false } },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.email.toLowerCase().endsWith(`@${INSTAGRAM_EMAIL_DOMAIN}`))
              throw new APIError('BAD_REQUEST', { message: 'This email domain is reserved.' });
            return { data: user };
          },
        },
      },
    },
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: {
      useSecureCookies: options.production,
      database: { generateId: 'uuid' },
      // Do not trust arbitrary client-supplied forwarding headers on the public API.
      ipAddress: { ipAddressHeaders: [] },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
      },
    },
    // Avoid logging authentication request bodies or raw adapter errors.
    logger: { disabled: true },
  });
  return {
    handler: toNodeHandler(auth),
    getSession: (headers) => auth.api.getSession({ headers }),
  };
}
