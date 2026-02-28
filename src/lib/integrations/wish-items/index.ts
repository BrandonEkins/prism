/**
 * Wish Item Integrations
 *
 * Re-exports all wish item providers and types.
 */

export * from './types';
export { microsoftTodoWishItemProvider } from './microsoft-todo';

import type { WishItemProvider } from './types';
import { microsoftTodoWishItemProvider } from './microsoft-todo';

/**
 * Map of all available wish item providers by their ID.
 */
export const wishItemProviders: Record<string, WishItemProvider> = {
  microsoft_todo: microsoftTodoWishItemProvider,
};

/**
 * Get a wish item provider by its ID.
 */
export function getWishItemProvider(providerId: string): WishItemProvider | null {
  return wishItemProviders[providerId] || null;
}
