async function limitDecimals(value, maxDecimals) {
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
  
  // Round to the specified number of decimal places and convert back to number
  return parseFloat(num.toFixed(maxDecimals));
}

module.exports = limitDecimals;