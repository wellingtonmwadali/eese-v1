'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className = '', align = 'center', sideOffset = 4, ...props }, ref) => (
  // No Portal — renders inline so it stays inside the Dialog's focus scope
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={[
      'z-[60] rounded-xl border border-gray-200 bg-white p-0 shadow-xl outline-none',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    ].join(' ')}
    {...props}
  />
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
