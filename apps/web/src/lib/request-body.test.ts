import { describe, expect, it } from 'vitest';
import { readBoundedBody, RequestBodyLimitError } from './request-body';

describe('Bounded workspace proxy bodies', () => {
  it('reads supported uploads without changing bytes', async () => {
    const request = new Request('http://web.example/media', {
      method: 'POST',
      body: new Uint8Array([1, 2, 3]),
    });
    expect([...(await readBoundedBody(request, 3))]).toEqual([1, 2, 3]);
  });
  it('rejects declared oversize before consuming the body', async () => {
    const request = new Request('http://web.example/media', {
      method: 'POST',
      headers: { 'content-length': '1000' },
      body: 'large',
    });
    await expect(readBoundedBody(request, 10)).rejects.toBeInstanceOf(RequestBodyLimitError);
    expect(request.bodyUsed).toBe(false);
  });
  it('rejects actual oversize even when the declared length lies', async () => {
    const request = new Request('http://web.example/media', {
      method: 'POST',
      headers: { 'content-length': '1' },
      body: 'oversize',
    });
    await expect(readBoundedBody(request, 3)).rejects.toBeInstanceOf(RequestBodyLimitError);
  });
});
