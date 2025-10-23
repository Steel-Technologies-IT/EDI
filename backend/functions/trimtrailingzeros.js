async function trimTrailingZeros(val) {
  if (val === null || val === undefined || val === '') return null;
  let num = Number(val);
  if (isNaN(num)) return val;

  // Remove trailing zeros after decimal
  let str = num.toString().replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');

  // Remove leading zero before decimal if less than 1 and greater than -1
  if (Math.abs(num) < 1 && str.startsWith('0.')) {
    str = str.replace(/^0\./, '.');
  } else if (Math.abs(num) < 1 && str.startsWith('-0.')) {
    str = str.replace(/^-0\./, '-.');
  }

  return str;
}

module.exports = trimTrailingZeros;