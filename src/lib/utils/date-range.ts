/** Local calendar date as yyyy-MM-dd, avoiding a UTC shift near midnight. */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DAYS_BACK: Record<string, number> = {
  "3days": 2,
  "7days": 6,
  "15days": 14,
  "30days": 29,
  "60days": 59,
  "90days": 89,
  "180days": 179,
};

/**
 * Inclusive bounds for a named range, or {} for all time. Boundaries carry
 * times so the first and last day are included whole.
 */
export function getDateRange(timeRange: string): {
  startDate?: string;
  endDate?: string;
} {
  if (!timeRange) return {};

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAY_MS = 24 * 60 * 60 * 1000;

  let startDate: Date;
  let endDate: Date;

  if (timeRange === "today") {
    startDate = today;
    endDate = today;
  } else if (timeRange === "yesterday") {
    startDate = new Date(today.getTime() - DAY_MS);
    endDate = startDate;
  } else if (timeRange in DAYS_BACK) {
    startDate = new Date(today.getTime() - DAYS_BACK[timeRange] * DAY_MS);
    endDate = today;
  } else {
    return {};
  }

  return {
    startDate: `${formatLocalDate(startDate)}T00:00:00`,
    endDate: `${formatLocalDate(endDate)}T23:59:59`,
  };
}

/** Saturday or Sunday in UTC, which is how sessions are bucketed. */
export function isWeekendUtc(isoDate: string): boolean {
  const day = new Date(isoDate).getUTCDay();
  return day === 0 || day === 6;
}
