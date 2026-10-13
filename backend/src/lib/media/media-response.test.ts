import { describe, expect, it } from 'vitest';
import { byteRange } from './media-response.js';

describe('Video byte ranges', () => {
  it.each([
    ['bytes=0-9', { start: 0, end: 9 }],
    ['bytes=80-', { start: 80, end: 99 }],
    ['bytes=-20', { start: 80, end: 99 }],
    ['bytes=-200', { start: 0, end: 99 }],
    ['bytes=50-200', { start: 50, end: 99 }],
  ])('supports range %s', (header, expected) => {
    expect(byteRange(String(header), 100)).toEqual(expected);
  });
  it.each([
    'bytes=100-',
    'bytes=20-10',
    'bytes=-0',
    'bytes=-',
    'bytes=0-1,3-4',
    'bytes=NaN-9',
    'bytes=999999999999999999999-',
  ])('rejects invalid range %s', (header) => {
    expect(byteRange(header, 100)).toBeNull();
  });
});
