export type CardTimeMode = 'am' | 'pm';

/**
 * Returns the current hour (0-23) in South African Standard Time (Africa/Johannesburg, UTC+2).
 */
export function getSastHour(date: Date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      hour: 'numeric',
      hour12: false,
    }).format(date);
    const parsed = Number.parseInt(formatted, 10);
    if (!Number.isNaN(parsed)) {
      return parsed % 24;
    }
  } catch {
    // Fallback to UTC+2 calculation if Intl timeZone is unavailable
  }
  const utcHours = date.getUTCHours();
  return (utcHours + 2) % 24;
}

/**
 * Auto-senses whether AM (daytime) or PM (nighttime) service card images should be displayed
 * based on South African Standard Time (SAST):
 * - 06:00 to 18:59 SAST (6am to 7pm) -> 'am' (daytime images)
 * - 19:00 to 05:59 SAST (after 7pm until 6am) -> 'pm' (nighttime images)
 */
export function getSastTimeOfDay(date: Date = new Date()): CardTimeMode {
  const hour = getSastHour(date);
  return hour >= 6 && hour < 19 ? 'am' : 'pm';
}

export function formatSastTimeLabel(date: Date = new Date()): string {
  try {
    return `${new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)} SAST`;
  } catch {
    const hour = String(getSastHour(date)).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hour}:${min} SAST`;
  }
}
