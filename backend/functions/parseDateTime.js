async function parseDateTime(dateStr, timeStr) {
  const d = String(dateStr || '').trim().replace(/[^0-9]/g, '');
  let t = String(timeStr || '').trim().replace(/[^0-9]/g, '');
  if (d.length !== 8) throw new Error('unexpected date format: ' + dateStr);
  t = t.padStart(6, '0'); // ensure HHMMSS
  const year = Number(d.slice(0,4));
  const month = Number(d.slice(4,6)) - 1;
  const day = Number(d.slice(6,8));
  const hour = Number(t.slice(0,2));
  const minute = Number(t.slice(2,4));
  const second = Number(t.slice(4,6));
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

module.exports = {
    parseDateTime
};