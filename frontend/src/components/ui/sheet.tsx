'use client';

import type { ComponentProps } from 'react';
import { Dialog } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Sheet = Dialog.Root;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px]" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-[960px] flex-col border-l border-line bg-paper shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
