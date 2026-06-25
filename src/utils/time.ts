// Lightweight relative-time helpers for the messaging UI.

export const timeAgo = (ts: number): string => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'now';
  }
  if (mins < 60) {
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const clockTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

export const lastSeenLabel = (ts: number): string => `Last seen ${timeAgo(ts)}`;
