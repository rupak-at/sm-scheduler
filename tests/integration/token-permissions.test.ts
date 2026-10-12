import { describe, expect, it } from 'vitest';
import { createWorkspaceFixture } from './fixtures/workspace.js';

describe('Publishing access after Instagram connection', () => {
  it('revokes lost publishing access before a worker can create or publish media', async () => {
    const fixture = await createWorkspaceFixture();
    try {
      fixture.state.scopes = false;
      await expect(fixture.tokens.validToken(fixture.channel.id)).rejects.toMatchObject({
        code: 'PERMISSION_REQUIRED',
        details: { operation: 'publishing_access' },
      });
      const account = await fixture.db.socialAccount.findUniqueOrThrow({
        where: { id: fixture.channel.id },
      });
      expect(account.status).toBe('REVOKED');
      expect(account.tokenCiphertext).toBeNull();
      expect(fixture.state.containerCalls).toBe(0);
      expect(fixture.state.publishCalls).toBe(0);
      const paths = fixture.fetcher.mock.calls.map(([input]) => new URL(String(input)).pathname);
      expect(paths).toContain(`/v25.0/${fixture.state.accountId}/content_publishing_limit`);
      expect(paths.some((path) => path.endsWith('/permissions'))).toBe(false);
    } finally {
      await fixture.close();
    }
  });
});
