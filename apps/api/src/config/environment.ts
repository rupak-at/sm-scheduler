import { loadEnvironment, parseApiEnvironment } from '@social-scheduler/config';

export function getEnvironment() {
  loadEnvironment();
  return parseApiEnvironment(process.env);
}
