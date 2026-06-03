function getValidDate(dateValue) {
    return (
        dateValue &&
        String(dateValue).trim() !== '' &&
        String(dateValue) !== '0' &&
        String(dateValue) !== '00000000'
    )
        ? dateValue
        : null;
}

module.exports = getValidDate;