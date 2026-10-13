import { CircleAlert, CircleCheck, CircleDashed, Clock3, LoaderCircle, Ban } from 'lucide-react';
import type { PlannerPost } from '@social-scheduler/shared';
const statuses = {
  DRAFT: { label: 'Draft', icon: CircleDashed, style: 'bg-surface text-ink' },
  SCHEDULED: { label: 'Scheduled', icon: Clock3, style: 'bg-surface text-ink' },
  PROCESSING: { label: 'Publishing', icon: LoaderCircle, style: 'bg-surface text-ink' },
  PUBLISHED: { label: 'Published', icon: CircleCheck, style: 'bg-success-surface text-success' },
  FAILED: { label: 'Failed', icon: CircleAlert, style: 'bg-destructive/5 text-destructive' },
  UNCERTAIN: {
    label: 'Unconfirmed',
    icon: CircleAlert,
    style: 'bg-destructive/5 text-destructive',
  },
  CANCELLED: { label: 'Cancelled', icon: Ban, style: 'bg-surface text-ink' },
};
export function PostStatus({ status }: { status: PlannerPost['status'] }) {
  const { label, icon: Icon, style } = statuses[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-4 font-medium whitespace-nowrap ${style}`}
    >
      <Icon
        className={`size-3 ${status === 'PROCESSING' ? 'motion-safe:animate-spin' : ''}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
