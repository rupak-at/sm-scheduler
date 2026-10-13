import { useEffect, useState } from 'react';
export function useEditorSchedule(initial: string | null) {
  const [scheduled, setScheduled] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!initial) return;
    const value = new Date(initial);
    setScheduled(
      new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    );
  }, [initial]);
  return { scheduled, setScheduled, timezone };
}
