/**
 * Time and formatting utilities
 */

export function formatTimeRemaining(expiresAt: number): {
  text: string;
  isUrgent: boolean; // < 2 hours remaining
  percentage: number; // 0% (just created) to 100% (expired)
  isExpired: boolean;
} {
  const now = Date.now();
  const diff = expiresAt - now;
  const TOTAL_DURATION = 24 * 60 * 60 * 1000;

  if (diff <= 0) {
    return {
      text: 'Expired',
      isUrgent: true,
      percentage: 100,
      isExpired: true,
    };
  }

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  const percentage = Math.max(0, Math.min(100, ((TOTAL_DURATION - diff) / TOTAL_DURATION) * 100));
  const isUrgent = hours < 2;

  let text = '';
  if (hours > 0) {
    text = `${hours}h ${minutes}m left`;
  } else if (minutes > 0) {
    text = `${minutes}m ${seconds}s left`;
  } else {
    text = `${seconds}s left`;
  }

  return {
    text,
    isUrgent,
    percentage,
    isExpired: false,
  };
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
