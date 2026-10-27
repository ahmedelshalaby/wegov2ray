export interface StoredSubscription {
  subUrl: string;
  links: string[];
  expiresAt: number; // Unix timestamp in seconds
  volume: number;
  protocol: string;
  duration: number;
  createdAt: number;
}

const STORAGE_KEY = 'wegov2ray_last_sub';

export function saveLastSubscription(sub: StoredSubscription): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  } catch (err) {
    console.warn('Failed to save subscription to localStorage:', err);
  }
}

export function loadLastSubscription(): StoredSubscription | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sub = JSON.parse(raw) as StoredSubscription;
    const nowSec = Math.floor(Date.now() / 1000);

    // If subscription has expired, clear it
    if (sub.expiresAt && sub.expiresAt < nowSec) {
      clearLastSubscription();
      return null;
    }

    return sub;
  } catch (err) {
    console.warn('Failed to load subscription from localStorage:', err);
    return null;
  }
}

export function clearLastSubscription(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear subscription from localStorage:', err);
  }
}
