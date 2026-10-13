import { systemCheckJobSchema } from '@social-scheduler/shared';

export function createSystemCheckProcessor(checkDatabase: () => Promise<unknown>) {
  return async (job: { data: unknown }) => {
    systemCheckJobSchema.parse(job.data);
    await checkDatabase();
    return { status: 'ok', checkedAt: new Date().toISOString() };
  };
}
