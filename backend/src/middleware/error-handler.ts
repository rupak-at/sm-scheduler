import { ZodError } from 'zod';
import { WorkspaceError } from '../lib/workspace-error.js';
import { InstagramError } from '../integrations/instagram/http.js';
import { FacebookError } from '../integrations/facebook/http.js';
import type { ErrorRequestHandler } from 'express';

// Keep implementation details and connection credentials out of public responses.
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof WorkspaceError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    response.status(422).json({
      error: 'Check the submitted fields.',
      fields: error.issues.map((issue) => issue.path.join('.')),
    });
    return;
  }
  if (error instanceof InstagramError) {
    response.status(422).json({
      error: 'Instagram could not verify this connection. Reconnect or try again shortly.',
      code: error.code,
    });
    return;
  }
  if (error instanceof FacebookError) {
    response.status(422).json({
      error: 'Facebook could not verify this Page. Reconnect or try again shortly.',
      code: error.code,
    });
    return;
  }
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2034') {
    response.status(409).json({ error: 'This item changed. Reload and try again.' });
    return;
  }
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
