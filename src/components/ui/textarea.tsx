/**
 *
 * A multi-line text input component.
 * Used for descriptions, notes, and longer text input.
 *
 * USAGE:
 *   <Textarea placeholder="Enter description..." />
 *   <Textarea value={text} onChange={(e) => setText(e.target.value)} />
 *
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, inputMode, onKeyDown, onClick, onFocus, onBlur, ...props }, ref) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isEditing && (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 23)) {
        e.preventDefault();
        setIsEditing(true);
        requestAnimationFrame(() => {
          internalRef.current?.focus();
          internalRef.current?.select?.();
        });
        return;
      }

      if (isEditing && e.key === 'Escape') {
        setIsEditing(false);
        internalRef.current?.blur?.();
        return;
      }

      onKeyDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      setIsEditing(true);
      onClick?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsEditing(false);
      onBlur?.(e);
    };

    return (
      <textarea
        inputMode={isEditing ? (inputMode || 'text') : 'none'}
        data-editing={isEditing ? 'true' : 'false'}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input',
          'bg-background px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !isEditing && 'cursor-pointer',
          className
        )}
        ref={internalRef}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
