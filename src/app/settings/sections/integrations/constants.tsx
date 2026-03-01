import type { IntegrationConfig } from './types';

const MS_TODO_ICON = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0078D4">
    <path d="M0 0h11.377v11.377H0zm12.623 0H24v11.377H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z" />
  </svg>
);

const MS_TODO_ICON_SM = (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="#0078D4">
    <path d="M0 0h11.377v11.377H0zm12.623 0H24v11.377H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z" />
  </svg>
);

const MS_TODO_ICON_XS = (
  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="#0078D4">
    <path d="M0 0h11.377v11.377H0zm12.623 0H24v11.377H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z" />
  </svg>
);

export { MS_TODO_ICON, MS_TODO_ICON_SM, MS_TODO_ICON_XS };

const SHARED_ERROR_MESSAGES: Record<string, string> = {
  microsoft_auth_denied: 'Microsoft authorization was denied or cancelled.',
  microsoft_auth_failed: 'Microsoft authentication failed. Please try again.',
  missing_code: 'Authorization code was missing. Please try again.',
};

export const TASK_CONFIG: IntegrationConfig = {
  section: 'tasks',
  apiBase: '/api/task-sources',
  finalizeEndpoint: '/api/task-sources/finalize',
  oauthEntityParam: 'taskListId',
  returnSection: 'tasks',
  deleteConfirmSuffix: 'Tasks already synced will remain in Prism.',
  providers: {
    microsoft_todo: { name: 'Microsoft To-Do', icon: MS_TODO_ICON, color: '#0078D4' },
    todoist: {
      name: 'Todoist',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#E44332">
          <path d="M21 7.5L12 2 3 7.5v9l9 5.5 9-5.5v-9zM12 4l7 4.3v7.4l-7 4.3-7-4.3V8.3L12 4z" />
        </svg>
      ),
      color: '#E44332',
    },
  },
  errorMessages: {
    ...SHARED_ERROR_MESSAGES,
    missing_task_list: 'No task list was selected. Please try again.',
    task_list_not_found: 'The selected task list was not found.',
    no_ms_lists: 'No task lists found in your Microsoft To-Do account.',
  },
  successMessages: {
    microsoft_tasks_connected: 'Microsoft To-Do connected successfully!',
  },
};

export const SHOPPING_CONFIG: IntegrationConfig = {
  section: 'shopping',
  apiBase: '/api/shopping-list-sources',
  finalizeEndpoint: '/api/shopping-list-sources/finalize',
  oauthEntityParam: 'shoppingListId',
  returnSection: 'shopping',
  deleteConfirmSuffix: 'Items already synced will remain in Prism.',
  providers: {
    microsoft_todo: { name: 'Microsoft To-Do', icon: MS_TODO_ICON, color: '#0078D4' },
  },
  errorMessages: {
    ...SHARED_ERROR_MESSAGES,
    missing_shopping_list: 'No shopping list was selected. Please try again.',
    shopping_list_not_found: 'The selected shopping list was not found.',
    no_ms_lists: 'No lists found in your Microsoft To-Do account.',
  },
  successMessages: {
    microsoft_shopping_connected: 'Microsoft To-Do connected successfully for shopping!',
  },
};

export const WISH_CONFIG: IntegrationConfig = {
  section: 'wish',
  apiBase: '/api/wish-item-sources',
  finalizeEndpoint: '/api/wish-item-sources/finalize',
  oauthEntityParam: 'wishMemberId',
  returnSection: 'wish',
  deleteConfirmSuffix: 'Items already synced will remain in Prism.',
  providers: {
    microsoft_todo: { name: 'Microsoft To-Do', icon: MS_TODO_ICON, color: '#0078D4' },
  },
  errorMessages: {
    ...SHARED_ERROR_MESSAGES,
  },
  successMessages: {},
};
