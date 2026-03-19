// Helper function to get value by path, supporting array lookups with filters
function getValueByPathWithFilter(obj, path) {
    // e.g. SNF_Names[name_qual=OW].name_id
    const filterMatch = path.match(/^(\w+)\[(\w+)=([^\]]+)\]\.(\w+)$/);
    if (filterMatch) {
        const arrName = filterMatch[1];
        const filterField = filterMatch[2];
        const filterValue = filterMatch[3];
        const targetField = filterMatch[4];
        const arr = obj[arrName];
        if (Array.isArray(arr)) {
            const found = arr.find(item => String(item[filterField]) === filterValue);
            return found ? found[targetField] : null;
        }
        return null;
    }
    // fallback to normal dot notation and array-aware logic
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
        if (Array.isArray(current)) {
            current = current.map(item => item[parts[i]]);
        } else {
            current = current?.[parts[i]];
        }
    }
    return current;
}

async function trfm_Outbound(context, row, rules, executedAddRowRules = new Set()) {
    const newRow = { ...row };
    const additionalRows = []; // Array to store additional rows to be added
    // Group rules by field, then by seq
    const rulesByField = {};
    for (const rule of rules) {
        const field = rule.trns_trns_fld;
        if (!rulesByField[field]) rulesByField[field] = {};
        if (!rulesByField[field][rule.trns_seq]) rulesByField[field][rule.trns_seq] = [];
        rulesByField[field][rule.trns_seq].push(rule);
    }

  
    // For each field in the row that has rules
    for (const field in rulesByField) {
        const seqs = Object.keys(rulesByField[field]).sort((a, b) => Number(a) - Number(b));
        let matched = false;
        for (const seq of seqs) {
            for (const rule of rulesByField[field][seq]) {
                const comps = rule.trns_source_comp || [];
                const ops = rule.trns_operatione || [];
                const vals = rule.trns_value || [];
                if (!(comps.length === ops.length && ops.length === vals.length)) continue;

                // Find the max array length among all array-valued comparisons
                let maxArrLen = 1;
                const allValues = comps.map(comp => {
                    let val;
                    // If comp is a simple field (no dot or bracket), use row value
                    if (!comp.includes('.') && !comp.includes('[')) {
                        val = row[comp];
                    } else {
                        val = getValueByPathWithFilter(context, comp);
                    }
                    if (Array.isArray(val)) maxArrLen = Math.max(maxArrLen, val.length);
                    return val;
                });

                let found = false;
                // Try each possible index in the arrays
                for (let idx = 0; idx < maxArrLen; idx++) {
                    let allMatch = true;
                    for (let i = 0; i < comps.length; i++) {
                        let varValue = allValues[i];
                        if (Array.isArray(varValue)) varValue = varValue[idx];
                        if (typeof varValue === 'undefined') { allMatch = false; break; }
                        if (!evaluateRule(varValue, ops[i], vals[i])) { allMatch = false; break; }
                    }
                    if (allMatch) { found = true; break; }
                }

                if (found && rule.trns_output_value != null) {
                    // Handle exclusion
                    if (
                        rule.trns_output_type === 'EXCLUDE' ||
                        rule.trns_output_value === 'EXCLUDE' ||
                        rule.trns_output_value === 'DELETE'
                    ) {
                        return undefined; // Mark this row for exclusion
                    }
                     // Handle COPY_ROW_OVERRIDE
                    if (rule.trns_output_type === 'COPY_ROW_OVERRIDE') {
                        const [sourcePath, fieldToOverride, newValue] = rule.trns_output_value.split('|');
                        
                        if (sourcePath && fieldToOverride && newValue !== undefined) {
                            const sourceRow = getValueByPathWithFilter(context, sourcePath);
                            
                            if (sourceRow) {
                                // Override current row with all fields from source row
                                Object.assign(newRow, sourceRow);
                                // Then override the specific field with the new value
                                newRow[fieldToOverride] = newValue;
                                
                                console.log(`✓ COPY_ROW_OVERRIDE executed: copied source fields and set ${fieldToOverride}=${newValue}`);
                            }
                        }
                        
                        sequenceMatched = true;
                        fieldMatched = true;
                        break;
                    }
                }
                    if (rule.trns_output_type === 'Expression') {
                        newRow[field] = (function(details) {
                            return eval(rule.trns_output_value);
                        })(row);
                    } else {
                        newRow[field] = rule.trns_output_value;
                    }
                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }
    

    // Return the original row and any additional rows
    if (additionalRows.length > 0) {
        return [newRow, ...additionalRows];
    }
    return newRow;
}

// Helper function to evaluate a single operation
function evaluateRule(fieldValue, operator, value) {
    // Normalize rule value to a flat array of strings for IN/NOT IN handling
    const toList = (val) => {
        if (Array.isArray(val)) {
            return val.flat().map(v => String(v).trim()).filter(Boolean);
        }
        if (typeof val === 'string') {
            const t = val.trim();
            // Try JSON array first (e.g., "[\"A\",\"B\"]")
            try {
                const parsed = JSON.parse(t);
                if (Array.isArray(parsed)) return parsed.map(x => String(x).trim()).filter(Boolean);
            } catch {}
            // Support brace/bracket wrapped lists like "{A,B}" or "[A,B]"
            const inner = ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']')))
                ? t.slice(1, -1)
                : t;
            return inner.split(',')
                .map(s => s.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'))
                .filter(Boolean);
        }
        return [String(val)];
    };

    const result = (() => {
        switch (operator) {
            case '=':
                return fieldValue == value;
            case '<>':
                return fieldValue != value;
            case 'IN': {
                const list = toList(value);
                return list.map(String).includes(String(fieldValue));
            }
            case 'NOT IN': {
                const list = toList(value);
                return !list.map(String).includes(String(fieldValue));
            }
            case 'IS NULL':
                return fieldValue === null || fieldValue === undefined || fieldValue === '';
            case 'IS NOT NULL':
                return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
            default:
                return false;
        }
    })();
    
    return result;
}

module.exports = {
    trfm_Outbound
};