export function validateEditorSchedule(scheduled: string, scheduling: boolean): void {
  if (!scheduling) return;
  if (!scheduled) throw new Error('Choose a date and time for this post.');
  if (new Date(scheduled).getTime() < Date.now() + 60000)
    throw new Error('Choose a time at least one minute in the future.');
}

export function scheduleRequested(event: Event): boolean {
  const submitter = (event as SubmitEvent).submitter;
  return submitter instanceof HTMLButtonElement && submitter.value === 'schedule';
}
