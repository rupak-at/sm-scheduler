'use client';

import type { ComponentProps } from 'react';
import { DropdownMenu as Menu } from 'radix-ui';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          'z-50 min-w-44 rounded-xl border border-line bg-paper p-1.5 text-sm shadow-lg',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}
export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'flex min-h-11 cursor-default items-center gap-2 rounded-lg px-3 py-2 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface',
        className,
      )}
      {...props}
    />
  );
}
