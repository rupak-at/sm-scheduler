import { loadEnvironment, parseWorkerEnvironment } from '@social-scheduler/config';

export function getEnvironment() {
  loadEnvironment();
  return parseWorkerEnvironment(process.env);
}
