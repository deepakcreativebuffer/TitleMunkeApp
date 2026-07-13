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

// WhatsApp-style conversation-list timestamp:
//   today → time (8:09 PM), yesterday → "Yesterday",
//   within a week → weekday name (Monday), older → mm/dd/yy.
export const conversationTimeLabel = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) {
    return clockTime(ts);
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, {weekday: 'long'});
  }
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

// WhatsApp-style day separator label for the chat timeline.
export const dateSeparatorLabel = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(d)) / 86400000,
  );
  if (diffDays <= 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, {weekday: 'long'}); // "Monday"
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(
    undefined,
    sameYear
      ? {weekday: 'short', day: '2-digit', month: 'short'} // "Sun, 14 Jun"
      : {day: '2-digit', month: 'short', year: 'numeric'},
  );
};
