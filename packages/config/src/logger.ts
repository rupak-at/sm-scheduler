import pino from 'pino';

export function createLogger(service: string, level: string) {
  return pino({
    level,
    base: { service },
    redact: {
      paths: ['authorization', 'cookie', 'accessToken', 'refreshToken', 'password'],
      censor: '[REDACTED]',
    },
  });
}
