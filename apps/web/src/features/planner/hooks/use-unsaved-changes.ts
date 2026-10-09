import { useEffect } from 'react';
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const navigate = (event: MouseEvent) => {
      if (!dirty || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || anchor.target === '_blank' || anchor.href === window.location.href) return;
      if (!window.confirm('Leave without saving this post?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', navigate, true);
    window.addEventListener('beforeunload', guard);
    return () => {
      document.removeEventListener('click', navigate, true);
      window.removeEventListener('beforeunload', guard);
    };
  }, [dirty]);
}
