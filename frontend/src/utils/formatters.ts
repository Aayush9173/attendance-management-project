export const WEEKDAYS: { [key: number]: string } = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export function formatWeekday(day: number): string {
  return WEEKDAYS[day] || `Day ${day}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  try {
    // If it's a full ISO datetime string
    if (timeStr.includes('T') || timeStr.includes(' ')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      }
    }
    // If it's a HH:MM:SS or HH:MM format
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes.toString().padStart(2, '0');
      return `${formattedHours}:${formattedMinutes} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

export function formatDateTime(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '—';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateTimeStr;
  }
}

export interface HoursWorkedOptions {
  pendingPlaceholder?: string;
}

/**
 * Calculates readable hours worked between check-in and check-out timestamps.
 *
 * - Calculates whole elapsed minutes directly from millisecond difference (Math.floor(diffMs / 60000)).
 * - Accurately computes duration across midnight / calendar days using full Date objects.
 * - Formats as "8h 35m", "45m", or "0m".
 * - Returns pendingPlaceholder ("—") when check-out is missing.
 * - Handles missing timestamps safely.
 * - Returns explicit error indicator for chronologically inverted or unparseable timestamps.
 */
export function calculateHoursWorked(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  options?: HoursWorkedOptions
): string {
  const pending = options?.pendingPlaceholder ?? '—';

  if (!checkIn && !checkOut) return '—';
  if (checkIn && !checkOut) return pending;
  if (!checkIn && checkOut) return '—';

  const inTime = new Date(checkIn!);
  const outTime = new Date(checkOut!);

  if (isNaN(inTime.getTime()) || isNaN(outTime.getTime())) {
    return 'Invalid timestamp';
  }

  const diffMs = outTime.getTime() - inTime.getTime();

  if (diffMs < 0) {
    return 'Invalid (checkout before check-in)';
  }

  // Calculate whole elapsed minutes directly from millisecond difference
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}
