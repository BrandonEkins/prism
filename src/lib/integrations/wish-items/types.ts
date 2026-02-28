/**
 * Wish Item Integration Types
 *
 * Provider-agnostic interfaces for syncing wish items with external services
 * like Microsoft To-Do.
 */

export interface ExternalWishList {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface ExternalWishItem {
  id: string;
  listId: string;
  name: string;
  notes?: string | null;
  updatedAt: Date;
  createdAt?: Date;
}

export interface CreateWishItemInput {
  listId: string;
  name: string;
  notes?: string | null;
}

export interface UpdateWishItemInput {
  name?: string;
  notes?: string | null;
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface WishItemProviderTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Wish Item Provider Interface
 *
 * All wish item providers (MS To-Do, etc.) must implement this interface.
 */
export interface WishItemProvider {
  /** Provider identifier (e.g., 'microsoft_todo') */
  readonly providerId: string;

  /** Human-readable provider name */
  readonly displayName: string;

  /**
   * Fetch all lists from the provider (for selecting a wish list).
   */
  fetchLists(tokens: WishItemProviderTokens): Promise<ExternalWishList[]>;

  /**
   * Fetch all items from a specific list.
   */
  fetchItems(tokens: WishItemProviderTokens, listId: string): Promise<ExternalWishItem[]>;

  /**
   * Create a new item in the provider.
   */
  createItem(tokens: WishItemProviderTokens, item: CreateWishItemInput): Promise<ExternalWishItem>;

  /**
   * Update an existing item in the provider.
   */
  updateItem(
    tokens: WishItemProviderTokens,
    itemId: string,
    listId: string,
    updates: UpdateWishItemInput
  ): Promise<ExternalWishItem>;

  /**
   * Delete an item from the provider.
   */
  deleteItem(tokens: WishItemProviderTokens, itemId: string, listId: string): Promise<void>;

  /**
   * Refresh OAuth tokens if expired.
   * Returns new tokens or null if refresh failed.
   */
  refreshTokens?(tokens: WishItemProviderTokens): Promise<WishItemProviderTokens | null>;
}
