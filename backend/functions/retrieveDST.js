// DST Detection Utility
// This function determines if a given date falls within Daylight Saving Time for a specified time zone.
// It compares the current offset to the maximum offset of the year (which represents standard time).
// Note: This method relies on the behavior of the Intl API and may not be 100% accurate for all edge cases.
const getOffsetForZone = (date, timeZone) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const parts = dtf.formatToParts(date);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));

  // Reconstruct as UTC
  const asUTC = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  // Offset in minutes
  return (asUTC - date.getTime()) / 60000;
};

const parseYYYYMMDDHHmmss = (input) => {
  const str = input.toString();

  const year = +str.slice(0, 4);
  const month = +str.slice(4, 6) - 1; // 0-based
  const day = +str.slice(6, 8);
  const hour = +str.slice(8, 10) || 0;
  const minute = +str.slice(10, 12) || 0;
  const second = +str.slice(12, 14) || 0;

  return new Date(Date.UTC(year, month, day, hour, minute, second));
};
// Main function to determine if a date is in DST for a given time zone
const getDSTFlag = (input, timeZone) => {
  let date;

  if (typeof input === "number" || /^\d{8,14}$/.test(input)) {
    date = parseYYYYMMDDHHmmss(input);
  } else {
    date = new Date(input);
  }

  const jan = new Date(Date.UTC(date.getFullYear(), 0, 1));
  const jul = new Date(Date.UTC(date.getFullYear(), 6, 1));

  const currentOffset = getOffsetForZone(date, timeZone);
  const janOffset = getOffsetForZone(jan, timeZone);
  const julOffset = getOffsetForZone(jul, timeZone);
  console.log(`Evaluating DST for ${date.toISOString()} in ${timeZone} - Current Offset: ${currentOffset}, Jan Offset: ${janOffset}, Jul Offset: ${julOffset}`);
  return currentOffset === Math.max(janOffset, julOffset) ? "Y" : "N";
};

// Export the function
module.exports = getDSTFlag;
