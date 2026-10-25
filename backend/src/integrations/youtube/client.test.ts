import { describe, expect, it } from 'vitest';
import { youtubeFixture } from '../../../../tests/integration/fixtures/youtube.js';
import { youtubeVerifier } from './client.js';
import { YouTubeUploads, youtubeSessionUrl } from './uploads.js';

describe('YouTube authorization and upload trust boundaries', () => {
  it('uses offline authorization, an explicit account choice and a browser-bound PKCE challenge', () => {
    const fixture = youtubeFixture();
    const verifier = youtubeVerifier('fixture-secret', 'state', 'browser');
    const url = new URL(fixture.client.authorizationUrl('state', verifier));
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).not.toBe(verifier);
    expect(youtubeVerifier('fixture-secret', 'state', 'other')).not.toBe(verifier);
  });
  it('requires actual grants and an offline token, and verifies immutable channel identity', async () => {
    const fixture = youtubeFixture();
    fixture.state.granted = false;
    await expect(fixture.client.exchange('code', 'verifier')).rejects.toThrow(
      'PERMISSION_REQUIRED',
    );
    fixture.state.granted = true;
    fixture.state.offline = false;
    await expect(fixture.client.exchange('code', 'verifier')).rejects.toThrow(
      'OFFLINE_ACCESS_REQUIRED',
    );
    fixture.state.offline = true;
    await expect(fixture.client.channel('access', 'foreign')).rejects.toThrow('ACCOUNT_MISMATCH');
    fixture.fetcher.mockResolvedValueOnce(
      Response.json({
        items: [{ id: 'one-channel', snippet: { title: 'One' } }],
        nextPageToken: 'more-channels',
      }),
    );
    await expect(fixture.client.channel('access')).rejects.toThrow('CHANNEL_SELECTION_REQUIRED');
  });
  it.each([
    'http://www.googleapis.com/upload/youtube/v3/videos?upload_id=x',
    'https://evil.example/?upload_id=x',
    'https://www.googleapis.com@evil.example/?upload_id=x',
    'https://www.googleapis.com:444/upload/youtube/v3/videos?upload_id=x',
    'https://www.googleapis.com/other?upload_id=x',
  ])('rejects unsafe resumable session %s', (url) => {
    expect(() => youtubeSessionUrl(url)).toThrow();
  });
  it('uses provider-confirmed offsets and does not accept malformed ranges', async () => {
    const uploads = new YouTubeUploads(
      async () => new Response(null, { status: 308, headers: { range: 'bytes=2-4' } }),
    );
    await expect(
      uploads.status(
        'token',
        'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=x',
        20,
      ),
    ).rejects.toThrow('INVALID_UPLOAD_OFFSET');
  });
});
