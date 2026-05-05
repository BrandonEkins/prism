/**
 * Pure functions that turn structured data into natural-language strings
 * for the Voice API's `spoken` field. Kept separate from route handlers so
 * they can be unit-tested without HTTP/DB plumbing.
 */

type SpeakableEvent = {
  title: string;
  startTime: Date;
  allDay: boolean;
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: d.getMinutes() === 0 ? undefined : '2-digit',
  });
}

/** Days of week for labels relative to `now`. */
function relativeDayLabel(target: Date, now: Date): string {
  const oneDay = 86400000;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(target) - startOfDay(now)) / oneDay);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `on ${target.toLocaleDateString('en-US', { weekday: 'long' })}`;
  return `on ${target.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
}

/** Joins a list with Oxford commas: ["a","b","c"] → "a, b, and c". */
function oxfordJoin(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(', ')}, and ${last}`;
}

export function phraseEventList(items: SpeakableEvent[]): string {
  if (items.length === 0) return 'You have no events today.';

  const parts = items.map((e) =>
    e.allDay ? `${e.title}, all day` : `${e.title} at ${formatTime(e.startTime)}`
  );

  return `Today you have ${oxfordJoin(parts)}.`;
}

export function phraseUpcomingEvents(items: SpeakableEvent[], now = new Date()): string {
  if (items.length === 0) return 'You have no upcoming events.';

  const parts = items.map((e) => {
    const day = relativeDayLabel(e.startTime, now);
    if (e.allDay) return `${e.title} ${day}, all day`;
    return `${e.title} ${day} at ${formatTime(e.startTime)}`;
  });

  return `Coming up: ${oxfordJoin(parts)}.`;
}

export function phraseTaskList(titles: string[]): string {
  if (titles.length === 0) return 'You have no tasks due today.';
  if (titles.length === 1) return `You have one task today: ${titles[0]}.`;
  return `You have ${titles.length} tasks today: ${oxfordJoin(titles)}.`;
}

export function phraseFamilyMembers(names: string[]): string {
  if (names.length === 0) return 'No family members are configured.';
  if (names.length === 1) return `Your family has ${names[0]}.`;
  return `Your family has ${oxfordJoin(names)}.`;
}

type SpeakableMeal = {
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
};

export function phraseTodayMeals(items: SpeakableMeal[]): string {
  if (items.length === 0) return 'No meals are planned for today.';

  const parts = items.map((m) => `${m.mealType}: ${m.name}`);
  if (items.length === 1) return `Today's plan is ${parts[0]}.`;
  return `Today's meals: ${oxfordJoin(parts)}.`;
}

export function phraseTodayChores(titles: string[], assigneeName: string | null = null): string {
  const who = assigneeName ?? 'You';
  if (titles.length === 0) {
    return assigneeName
      ? `${assigneeName} has no chores due today.`
      : 'No chores are due today.';
  }
  if (titles.length === 1) {
    return `${who} ${who === 'You' ? 'have' : 'has'} one chore today: ${titles[0]}.`;
  }
  const verb = who === 'You' ? 'have' : 'has';
  return `${who} ${verb} ${titles.length} chores today: ${oxfordJoin(titles)}.`;
}

type SpeakableMessage = {
  message: string;
  authorName: string | null;
  createdAt: Date;
};

/**
 * Past-leaning version of relativeDayLabel: messages are always already
 * sent, so "yesterday" / "on Friday" reads better than "tomorrow."
 */
function pastDayLabel(target: Date, now: Date): string {
  const oneDay = 86400000;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(target)) / oneDay);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `on ${target.toLocaleDateString('en-US', { weekday: 'long' })}`;
  return `on ${target.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
}

export function phraseRecentMessages(items: SpeakableMessage[], now = new Date()): string {
  if (items.length === 0) return 'No recent family messages.';

  const lines = items.map((m) => {
    const day = pastDayLabel(m.createdAt, now);
    const who = m.authorName ? `${m.authorName} ${day}` : day;
    return `${who}: ${m.message}`;
  });

  if (items.length === 1) return `Latest message from ${lines[0]}.`;
  return `Recent messages: ${oxfordJoin(lines)}.`;
}
