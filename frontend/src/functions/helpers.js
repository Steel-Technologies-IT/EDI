// Helpers to stringify values for LIKE-style filtering
    const stringifyForFilter = (v) => {
        if (v === null || v === undefined) return '';
        if (Array.isArray(v)) return v.map(stringifyForFilter).join(' | ');
        return String(v);
    };
    const stringifyTrnsValue = (val) => {
        if (Array.isArray(val)) {
            if (val.length === 1 && Array.isArray(val[0])) return `[${val[0].join(',')}]`;
            if (val.length > 1 && !val.some(Array.isArray)) return val.join(' | ');
            if (val.some(Array.isArray)) return val.map(v => Array.isArray(v) ? `[${v.join(',')}]` : String(v)).join(' | ');
            if (val.length === 1) return String(val[0]);
            return '';
        }
        return val ?? '';
    };

    const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            const dateString = dateStr.toString().trim();
            try {
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    return dateString;
                }
                if (/^\d{8}$/.test(dateString)) {
                    return `${dateString.substr(0,4)}-${dateString.substr(4,2)}-${dateString.substr(6,2)}`;
                }
                if (/^\d{7}$/.test(dateString)) {
                    const month = dateString.substr(0,2);
                    const day = dateString.substr(2,2);
                    const yearPart = dateString.substr(4,3);
                    let fullYear;
                    if (yearPart.startsWith('0')) {
                        fullYear = `20${yearPart.substr(1)}`;
                    } else {
                        const yearNum = parseInt(yearPart);
                        if (yearNum <= 99) {
                            fullYear = yearNum > 50 ? `19${yearPart.substr(-2)}` : `20${yearPart.substr(-2)}`;
                        } else {
                            fullYear = `20${yearPart}`;
                        }
                    }
                    return `${fullYear}-${month}-${day}`;
                }
                if (/^\d{6}$/.test(dateString)) {
                    const month = dateString.substr(0,2);
                    const day = dateString.substr(2,2);
                    const year = dateString.substr(4,2);
                    const fullYear = year > 50 ? `19${year}` : `20${year}`;
                    return `${fullYear}-${month}-${day}`;
                }
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
                return '';
            } catch (e) {
                return '';
            }
        };
// Export currently displayed rows to CSV (Excel-friendly)
    const csvEscape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        const needsQuotes = /[",\n\r]/.test(s);
        const escaped = s.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
    };

    const normalizeVal = (val) => {
        if (Array.isArray(val)) {
            // Convert nested arrays to bracketed lists, join with |
            if (val.some(Array.isArray)) {
                return val.map(v => Array.isArray(v) ? `[${v.join(',')}]` : v).join(' | ');
            }
            return val.join(' | ');
        }
        return val ?? '';
    };


module.exports = {
    stringifyForFilter,
    stringifyTrnsValue,
    formatDateForInput,
    csvEscape,
    normalizeVal
}
