import type { ErrorRequestHandler } from 'express';

// Keep implementation details and connection credentials out of public responses.
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  if (status === 400 || status === 413) {
    response
      .status(status)
      .json({ error: status === 400 ? 'Invalid JSON body' : 'Request too large' });
    return;
  }
  response.status(500).json({ error: 'Internal server error' });
};
