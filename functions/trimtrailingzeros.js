function trimZeros(num) {
  if (num === null || num === undefined) return num;
  let str = String(num).trim();
  // Remove leading zeros before decimal (but keep single zero if integer)
  str = str.replace(/^(-?)0+(\.\d+)/, '$1$2');
  // Remove trailing zeros after decimal
  if (str.includes('.')) {
    str = str.replace(/(\.\d*?[1-9])0+$/, '$1'); // Remove trailing zeros after last non-zero digit
    str = str.replace(/\.0+$/, ''); // Remove .0 or .000
  }
  return str;
}

module.exports = trimZeros;