/**
 *
 * Provides a styled text input component for forms.
 * Used for entering text, numbers, dates, etc.
 *
 * FEATURES:
 * - Touch-friendly height (44px minimum)
 * - Clear focus states for accessibility
 * - Consistent styling with other form elements
 * - Supports all standard input types
 *
 * USAGE:
 *   <Input placeholder="Enter your name" />
 *   <Input type="email" value={email} onChange={handleChange} />
 *   <Input type="password" />
 *
 */

import * as React from 'react';
import { cn } from '@/lib/utils';


/**
 * INPUT PROPS
 * Extends standard HTML input attributes.
 * No additional props needed - we just style the native input.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;


/**
 * INPUT COMPONENT
 * A styled text input that works with all standard input types.
 *
 * STYLING NOTES:
 * - Height is 44px (touch-friendly)
 * - Uses theme colors for consistency
 * - Focus ring matches our design system
 * - Disabled state is visually distinct
 *
 * @example Basic text input
 * <Input placeholder="Your name" />
 *
 * @example Controlled input
 * <Input
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 * />
 *
 * @example With label
 * <label>
 *   Email
 *   <Input type="email" />
 * </label>
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, onKeyDown, onClick, onFocus, onBlur, ...props }, ref) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // If user presses Enter or Space or OK button while not editing, enter edit mode
      if (!isEditing && (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 23)) {
        e.preventDefault();
        setIsEditing(true);
        requestAnimationFrame(() => {
          internalRef.current?.focus();
          internalRef.current?.select?.();
        });
        return;
      }

      // If user presses Enter or Escape while editing, finish edit mode
      if (isEditing && (e.key === 'Enter' || e.key === 'Escape')) {
        setIsEditing(false);
        internalRef.current?.blur?.();
        return;
      }

      onKeyDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      setIsEditing(true);
      onClick?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsEditing(false);
      onBlur?.(e);
    };

    const defaultInputMode = inputMode || (type === 'number' ? 'numeric' : 'text');

    return (
      <input
        type={type}
        inputMode={isEditing ? defaultInputMode : 'none'}
        data-editing={isEditing ? 'true' : 'false'}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          // Layout
          'flex w-full',
          // Height (touch-friendly - 44px)
          'h-11',
          // Padding
          'px-3 py-2',
          // Border and background
          'border border-input bg-background',
          // Shape
          'rounded-md',
          // Typography
          'text-base',
          // Placeholder styling
          'placeholder:text-muted-foreground',
          // Focus state
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          // File input specific styling
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          // Remove default appearance (for consistency across browsers)
          'appearance-none',
          // Touch optimization
          'touch-action-manipulation',
          !isEditing && 'cursor-pointer',
          // Custom classes
          className
        )}
        ref={internalRef}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
