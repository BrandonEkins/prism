export type PinStatus = 'want_to_go' | 'been_there';
export type PinType = 'location' | 'stop' | 'national_park';

export interface TravelPin {
  id: string;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  placeName?: string | null;
  status: PinStatus;
  isBucketList: boolean;
  tripLabel?: string | null;
  color?: string | null;
  visitedDate?: string | null;
  visitedEndDate?: string | null;
  year?: number | null;
  tags: string[];
  stops: string[];
  nationalParks: string[];
  parentId?: string | null;
  pinType: PinType;
  photoRadiusKm: number;
  createdBy?: { id: string; name: string | null; color: string | null } | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeocodeResult {
  placeId: number;
  displayName: string;
  fullName: string;
  latitude: number;
  longitude: number;
}

export const STATUS_CONFIG: Record<PinStatus, { label: string; color: string }> = {
  want_to_go: { label: 'Want to Go', color: '#3B82F6' }, // blue
  been_there:  { label: 'Been There', color: '#10B981' }, // green
};

export const PIN_TYPE_CONFIG: Record<PinType, { label: string; color: string; icon: string }> = {
  location:      { label: 'Location',      color: '#3B82F6', icon: '📍' },
  stop:          { label: 'Stop',          color: '#8B5CF6', icon: '📍' },
  national_park: { label: 'National Park', color: '#2D6A4F', icon: '🌲' },
};

export const BUCKET_LIST_COLOR = '#F59E0B'; // gold — overlaid as star
export const NPS_COLOR = '#2D6A4F'; // NPS green — overlaid as tree
