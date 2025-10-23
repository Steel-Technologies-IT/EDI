const path = require('path');

function readableErrors(error, recordCode, filePath) {
  let userFriendlyError = '';
  let technicalDetails = '';
  if (error.code) {
    // Database or SQL errors
    switch (error.code) {
      case '42601':
        userFriendlyError = 'Database structure mismatch - the data format does not match what is expected';
        break;
      case '23505':
        userFriendlyError = 'Duplicate record - this data has already been processed';
        break;
      case '23503':
        userFriendlyError = 'Missing reference data - required lookup information is not available';
        break;
      case '22001':
        userFriendlyError = 'Data too long - one of the fields exceeds the maximum allowed length';
        break;
      case '22003':
        userFriendlyError = 'Number out of range - a numeric value is too large or too small';
        break;
      case '23502':
        userFriendlyError = 'Required field missing - a mandatory field was not provided';
        break;
      case '42703':
        userFriendlyError = 'Database column error - trying to access a field that does not exist';
        break;
      case '42P01':
        userFriendlyError = 'Database table error - trying to access a table that does not exist';
        break;
      case '08003':
        userFriendlyError = 'Database connection lost - unable to communicate with the database';
        break;
      case '08006':
        userFriendlyError = 'Database connection failed - unable to establish connection to database';
        break;
      case '53300':
        userFriendlyError = 'Database busy - too many connections, please try again later';
        break;
      case '42P07':
        userFriendlyError = 'Database object already exists - duplicate table or column name';
        break;
      case '25P02':
        userFriendlyError = 'Database transaction error - operation failed and was rolled back';
        break;
      case '22P02':
        userFriendlyError = 'Invalid data type - data cannot be converted to the expected format';
        break;
      case '23514':
        userFriendlyError = 'Data validation failed - data does not meet business rules requirements';
        break;
      default:
        userFriendlyError = 'Database error occurred while processing the file';
    }
    technicalDetails = `Error Code: ${error.code}${error.detail ? ', Details: ' + error.detail : ''}`;
  } else if (error.name === 'TypeError') {
    if (error.message.includes('padStart')) {
      userFriendlyError = 'Data formatting error - unable to process field data properly';
    } else if (error.message.includes('Cannot read properties')) {
      userFriendlyError = 'Missing data error - expected data field is not available';
    } else if (error.message.includes('split')) {
      userFriendlyError = 'Data parsing error - unable to split or process text data';
    } else if (error.message.includes('slice')) {
      userFriendlyError = 'Data extraction error - unable to extract required portion of data';
    } else if (error.message.includes('trim')) {
      userFriendlyError = 'Data cleaning error - unable to clean whitespace from data';
    } else if (error.message.includes('undefined')) {
      userFriendlyError = 'Missing value error - a required value is not defined';
    } else if (error.message.includes('null')) {
      userFriendlyError = 'Null value error - encountered unexpected empty value';
    } else {
      userFriendlyError = 'Data format error - the file contains unexpected data that cannot be processed';
    }
    technicalDetails = error.message;
  } else if (error.name === 'ReferenceError') {
    userFriendlyError = 'System configuration error - missing required system component or variable';
    technicalDetails = error.message;
  } else if (error.name === 'SyntaxError') {
    if (error.message.includes('JSON')) {
      userFriendlyError = 'Invalid data format - the file content is not properly structured as JSON';
    } else if (error.message.includes('Unexpected token')) {
      userFriendlyError = 'Data parsing error - unexpected character or symbol found in data';
    } else {
      userFriendlyError = 'Data syntax error - the file format is not valid';
    }
    technicalDetails = error.message;
  } else if (error.name === 'RangeError') {
    userFriendlyError = 'Data size error - data value is outside acceptable range';
    technicalDetails = error.message;
  } else if (error.name === 'URIError') {
    userFriendlyError = 'File path error - invalid file location or name';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('ENOENT')) {
    userFriendlyError = 'File not found or cannot be accessed';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('EACCES')) {
    userFriendlyError = 'Permission denied - unable to access the file';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('EMFILE')) {
    userFriendlyError = 'Too many files open - system limit reached, please try again later';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('ENOSPC')) {
    userFriendlyError = 'Disk space full - unable to save or process file';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('EISDIR')) {
    userFriendlyError = 'Directory error - expected a file but found a directory';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('ENOTDIR')) {
    userFriendlyError = 'Path error - expected a directory but found a file';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('EEXIST')) {
    userFriendlyError = 'File already exists - cannot create duplicate file';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('timeout')) {
    userFriendlyError = 'Processing timeout - the operation took too long to complete';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('ETIMEDOUT')) {
    userFriendlyError = 'Connection timeout - unable to complete operation within time limit';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('ECONNREFUSED')) {
    userFriendlyError = 'Connection refused - unable to connect to required service';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('ECONNRESET')) {
    userFriendlyError = 'Connection lost - connection was interrupted during processing';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('EHOSTUNREACH')) {
    userFriendlyError = 'Network error - unable to reach required server or service';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('ENETUNREACH')) {
    userFriendlyError = 'Network unavailable - no network connection available';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('out of memory')) {
    userFriendlyError = 'Memory error - insufficient system memory to process the file';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('heap')) {
    userFriendlyError = 'Memory allocation error - system ran out of available memory';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('EPIPE')) {
    userFriendlyError = 'Process communication error - connection to processing service was broken';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('spawn')) {
    userFriendlyError = 'System process error - unable to start required background process';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('eval')) {
    userFriendlyError = 'Rule evaluation error - unable to process transformation rule';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('Assignment to constant')) {
    userFriendlyError = 'System configuration error - attempting to modify read-only system value';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('Maximum call stack')) {
    userFriendlyError = 'Processing complexity error - data structure is too complex to process';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('flatMap')) {
    userFriendlyError = 'Data structure error - unable to flatten or process nested data';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('map')) {
    userFriendlyError = 'Data processing error - unable to transform data as expected';
    technicalDetails = error.message;
  } else if (error.message && error.message.includes('filter')) {
    userFriendlyError = 'Data filtering error - unable to filter data according to rules';
    technicalDetails = error.message;
  } else {
    userFriendlyError = 'An unexpected error occurred while processing the file';
    technicalDetails = error.message || error.toString();
  }

  const fileName = filePath ? path.basename(filePath) : 'Unknown file';
  
  return `
File Processing Failed for Record: ${recordCode || 'Unknown'}
Problem: ${userFriendlyError}
File: ${fileName}
Time: ${new Date().toLocaleString()}
Technical Details: ${technicalDetails}
  `.trim();
}

module.exports = readableErrors;

