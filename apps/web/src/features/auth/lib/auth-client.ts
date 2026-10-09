'use client';

import { createAuthClient } from 'better-auth/react';

// Same-origin requests keep cookies on the web domain; Express owns authentication.
export const authClient = createAuthClient();
