// Helper function to get value by path, supporting array lookups with filters
function getValueByPathWithFilter(obj, path) {
    // e.g. SNF_Names[name_qual=OW].name_id
    const filterMatch = path.match(/^(\w+)\[(\w+)=([^\]]+)\]\.?(\w+)?$/);
    if (filterMatch) {
        const arrName = filterMatch[1];
        const filterField = filterMatch[2];
        const filterValue = filterMatch[3];
        const targetField = filterMatch[4];
        const arr = obj[arrName];
        
        if (Array.isArray(arr)) {
            const found = arr.find(item => String(item[filterField]) === filterValue);
            
            if (!targetField) {
                return found; // Returns undefined if not found
            }
            const result = found ? found[targetField] : null;
            return result;
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

// Track ADD_ROW rules that have already been executed to prevent duplicates
const executedAddRowRules = new Set();

async function trfm_Inbound(context, row, rules) {
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
        let fieldMatched = false;
        
        for (const seq of seqs) {
            if (fieldMatched) {
                break; // Skip remaining sequences if field already matched
            }
            
            let sequenceMatched = false; // Track if any rule in this sequence matched
            
            for (const rule of rulesByField[field][seq]) {
                const comps = rule.trns_source_comp || [];
                const ops = rule.trns_operatione || [];
                const vals = rule.trns_value || [];
                
                if (!(comps.length === ops.length && ops.length === vals.length)) {
                    continue;
                }

                // Create a unique identifier for ADD_ROW rules to prevent duplicates
                const ruleId = `${rule.trns_trns_tbl}_${rule.trns_trns_fld}_${rule.trns_seq}_${rule.trns_output_type}_${rule.trns_output_value}`;

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
                        
                        if (!evaluateRule(varValue, ops[i], vals[i])) { 
                            allMatch = false; 
                            break; 
                        }
                    }
                    if (allMatch) { 
                        found = true; 
                        break; 
                    }
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
                    
                    // Handle adding additional rows - but only once per unique rule
                    if (rule.trns_output_type === 'ADD_ROW') {
                        if (!executedAddRowRules.has(ruleId)) {
                            // Get the source row to copy from using trns_output_value as path
                            const sourceRow = getValueByPathWithFilter(context, rule.trns_output_value);

                            if (sourceRow) {
                                const newAdditionalRow = { ...sourceRow };
                                // Change the target field to the new value
                                newAdditionalRow[field] = 'M'; // Change SF to M
                                additionalRows.push(newAdditionalRow);
                                
                                // Mark this rule as executed
                                executedAddRowRules.add(ruleId);
                            }
                        }
                        // For ADD_ROW: DON'T set fieldMatched, DON'T break - continue processing this sequence and other sequences
                        continue;
                    }
                    
                    // Handle standard field transformation
                    if (rule.trns_output_type === 'Expression') {
                        newRow[field] = (function(details) {
                            return eval(rule.trns_output_value);
                        })(row);
                    } else if (!rule.trns_output_type || rule.trns_output_type === 'Value' || rule.trns_output_type === 'char' || rule.trns_output_type === 'Character' || rule.trns_output_type === 'Char' || rule.trns_output_type === 'special') {
                        newRow[field] = rule.trns_output_value;
                    }
                    
                    // For transformation rules: set both flags and break out of this sequence
                    sequenceMatched = true;
                    fieldMatched = true;
                    break;
                }
                // If rule didn't match, continue to next rule in this sequence
            }
            
            // If any rule in this sequence matched, we're done with this field
            if (sequenceMatched) {
                break;
            }
        }
    }
    
    // Return the original row and any additional rows
    if (additionalRows.length > 0) {
        return [newRow, ...additionalRows];
    }
    return newRow;
}

// Helper function to evaluate a single operation
function evaluateRule(fieldValue, operator, value) {
    const result = (() => {
        switch (operator) {
            case '=':
                return fieldValue == value;
            case '<>':
                return fieldValue != value;
            case 'IN':
                if (Array.isArray(value)) {
                    return value.map(String).includes(String(fieldValue));
                } else if (typeof value === 'string') {
                    return value.split(',').map(v => v.trim()).includes(String(fieldValue));
                }
                return false;
            case 'NOT IN':
                if (Array.isArray(value)) {
                    return !value.map(String).includes(String(fieldValue));
                } else if (typeof value === 'string') {
                    return !value.split(',').map(v => v.trim()).includes(String(fieldValue));
                }
                return false;
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

// Function to reset the executed rules tracker (call this between different transformations if needed)
function resetAddRowTracker() {
    executedAddRowRules.clear();
}

module.exports = {
    trfm_Inbound,
    resetAddRowTracker
};