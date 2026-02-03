const { queryAS400Java } = require('./as400connection');

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

async function runHealthcheck() {
  const sql = process.env.AS400_HEALTH_SQL || 'SELECT 1';

  if (!process.env.REACT_APP_AS400_SERVER) {
    console.log('AS400 healthcheck: REACT_APP_AS400_SERVER not set — skipping healthcheck');
    return;
  }

  const maxAttempts = parseInt(process.env.AS400_HEALTH_RETRIES || '5', 10);
  const delayMs = parseInt(process.env.AS400_HEALTH_DELAY_MS || '3000', 10);

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`AS400 healthcheck: attempt ${attempt}/${maxAttempts} — running [${sql}]`);
      const res = await queryAS400Java(sql);
      console.log('AS400 healthcheck: success', typeof res === 'object' ? 'ok' : res);
      return { success: true, result: res };
    } catch (err) {
      lastError = err && err.message ? err.message : err;
      console.error(`AS400 healthcheck: attempt ${attempt} failed:`, lastError);
      if (attempt < maxAttempts) await wait(delayMs);
    }
  }

  console.error(`AS400 healthcheck: failed after ${maxAttempts} attempts — continuing startup (non-fatal)`);
  return { success: false, error: lastError };
}

if (require.main === module) {
  runHealthcheck().catch(err => console.error('AS400 healthcheck unexpected error:', err));
}

module.exports = { runHealthcheck };
