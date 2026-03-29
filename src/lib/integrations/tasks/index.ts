export * from './types';
export { microsoftTodoProvider } from './microsoft-todo';
export { googleTasksProvider } from './google-tasks';

import { microsoftTodoProvider } from './microsoft-todo';
import { googleTasksProvider } from './google-tasks';
import type { TaskProvider } from './types';

/**
 * Registry of all available task providers.
 * Add new providers here as they are implemented.
 */
export const taskProviders: Record<string, TaskProvider> = {
  microsoft_todo: microsoftTodoProvider,
  google_tasks: googleTasksProvider,
};

/**
 * Get a task provider by its ID.
 */
export function getTaskProvider(providerId: string): TaskProvider | undefined {
  return taskProviders[providerId];
}
