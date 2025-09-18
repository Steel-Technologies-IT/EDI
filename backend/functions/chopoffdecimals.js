async function chopOffDecimals(value) {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // If it's not a valid number, return the original value
  if (isNaN(num)) {
    return value;
  }
  
  // Use Math.trunc to remove decimal part (Math.floor would give incorrect results for negative numbers)
  return Math.trunc(num);
}

module.exports = chopOffDecimals;