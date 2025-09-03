async function trimTrailingZeros(val) {
  if (val === null || val === undefined || val === '') return null;
  let num = Number(val);
  if (isNaN(num)) return val;
  if (Number.isInteger(num)) {
    return num.toFixed(2);
  } else {
    // Remove trailing zeros after decimal, but keep at least one digit after decimal
    return num.toString().replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
  }
}

module.exports = trimTrailingZeros;