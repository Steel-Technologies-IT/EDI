const queryInvexDatabase = require("../Invex/InvexConnection");

async function getPoLineItem(dtl_cpo, dtl_gaugin, dtl_widin) {
  //console.log('getPoLineItem called with:', { dtl_cpo, dtl_gaugin, dtl_widin });
  const sql = `
    SELECT DISTINCT t.ipd_ref_itm
    FROM tctipd_rec t
    LEFT JOIN pnttol_rec p
      ON p.tol_ref_pfx = t.ipd_ref_pfx
     AND p.tol_ref_no  = t.ipd_ref_no
     AND p.tol_ref_itm = t.ipd_ref_itm
    WHERE t.ipd_ref_pfx = 'PO'
      AND t.ipd_ref_no  = '${dtl_cpo}'
      AND ${dtl_gaugin} BETWEEN
            (t.ipd_ga_size - COALESCE(p.tol_ga_tol_neg, 0))
        AND (t.ipd_ga_size + COALESCE(p.tol_ga_tol_posv, 0.003))
        AND ${dtl_widin} BETWEEN
            (t.ipd_wdth - COALESCE(p.tol_wdth_tol_neg, 0))
        AND (t.ipd_wdth + COALESCE(p.tol_wdth_tol_posv, 0.25))
  `;

  try {
    const data = await queryInvexDatabase(sql);
    //console.log('PO Line Item Query Result:', data);

   return data.Data.length === 1 ? String(parseInt(data.Data[0].ipd_ref_itm, 10)).padStart(3, '0') : '000';
  
   } catch (err) {
    console.error('getPoLineItem failed:', err);
    return '000';
  }
}

async function ReturnPO(details) {
  if (!details?.dtl_cpo) return '00000000-000';
  //console.log('ReturnPO/L called with details:', details.dtl_cpo, details.dtl_pol);
  const cpo = details.dtl_cpo.replace(/\s+/g, '');
  const pol = details.dtl_pol ?? '';

  // Reject ST########/ patterns
  if (/^ST\d{8}\//i.test(cpo)) {
    return '00000000-000';
  }

  const parts = cpo.split('-');
  let poNumber = parts[1] || cpo;

  // Always trim leading zeros
  poNumber = poNumber.replace(/^0+/, '');

  // Validate PO (1–8 digits only)
  if (!/^\d{1,8}$/.test(poNumber)) {
    return '00000000-000';
  }

  const isInvalidPOL =
    pol.replace(/^0+/, '') === '' || !/^\d{1,3}$/.test(pol);

  let polSuffix = '000';

  if (isInvalidPOL) {
    if (details.dtl_gaugin == null || details.dtl_gaugin === 0) {details.dtl_gaugin = details.dtl_gaugmm ? details.dtl_gaugmm / 25.4 : 0;}
    if (details.dtl_widin == null || details.dtl_widin === 0) {details.dtl_widin = details.dtl_widmm ? details.dtl_widmm / 25.4 : 0;}
    try {
      const result = await getPoLineItem(
        poNumber,
        details.dtl_gaugin,
        details.dtl_widin
      );
      polSuffix = result != null ? String(result).padStart(3, '0')  : '000';

    } catch {
      polSuffix = '000';
    }
  } else {
    polSuffix = pol.slice(-3).padStart(3, '0');
  }
  //console.log(`ReturnPO: PO Number: ${poNumber}, POL Suffix: ${polSuffix}`);
  return poNumber.padStart(8, '0') + '-' + polSuffix;
}

async function validatePartNumber(dtl_cpart, hdr_isa_qual, hdr_isnd_id ) {
    // Check if partNumber is a string and not empty
    const sql = `
SELECT COALESCE(
    (
        SELECT DISTINCT clg_part
        FROM cprclg_rec
        INNER JOIN edreii_rec 
            ON clg_cus_ven_id = eii_ichg_acct_id 
            AND clg_cus_ven_typ = 'C' 
        WHERE
            eii_edix_iiq = '${hdr_isa_qual}'
            AND eii_edix_ichid = '${hdr_isnd_id}'
            AND clg_part = '${dtl_cpart}'
    ),
    'COC'
);`
const data = await queryInvexDatabase(sql);
console.log('Part Number Validation Result:', data.Data[0].coalesce);
   return data.Data[0].coalesce;
}



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

async function trfm_Inbound(context, row, rules, executedAddRowRules = new Set()) {
    
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

                // Create a unique identifier for this specific rule execution
                // Use only rule properties, NOT row data, to allow same rule to execute for different rows
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
                    
                    // Handle adding additional rows
                    if (rule.trns_output_type === 'ADD_ROW') {
                        // For ADD_ROW, check if we've already added this row type in this transformation
                        // Use field value to determine uniqueness (e.g., one 'M' row per transformation)
                        const addRowKey = `${ruleId}_${field}_M`;
                        
                        if (!executedAddRowRules.has(addRowKey)) {
                            // Get the source row to copy from using trns_output_value as path
                            const sourceRow = getValueByPathWithFilter(context, rule.trns_output_value);

                            if (sourceRow) {
                                const newAdditionalRow = { ...sourceRow };
                                // Change the target field to the new value
                                newAdditionalRow[field] = 'M'; // Change SF to M
                                additionalRows.push(newAdditionalRow);
                                
                                // Mark this specific add row as executed
                                executedAddRowRules.add(addRowKey);
                                console.log(`✓ ADD_ROW executed for field ${field}, added row with ${field}=M`);
                            } else {
                                console.warn(`✗ ADD_ROW: Source row not found at path "${rule.trns_output_value}"`);
                            }
                        } else {
                            console.log(`ADD_ROW already executed for this rule in current transformation`);
                        }
                        // For ADD_ROW: DON'T set fieldMatched, DON'T break - continue processing
                        continue;
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

                    // Handle standard field transformation
                    if (rule.trns_output_type === 'Expression') {
                        // Evaluate expressions with access to row (details), full context, and whitelisted helpers.
                        // Supports async expressions and async helpers (e.g., validatePartNumber).
                        try {
                            const helpers = { validatePartNumber, getValueByPathWithFilter };
                            newRow[field] = await (async function(details, context, helpers) {
                                // Expose common context objects and helpers directly in scope for convenience
                                const { SNF_Header, SNF_Details, SNF_Measurements, SNF_Names } = context || {};
                                const { validatePartNumber, getValueByPathWithFilter } = helpers || {};
                                // Evaluate rule; allow bare access to row fields via `with(details){...}`
                                // If it returns a Promise, await resolves it; if not, returns the value
                                return await (async () => { with (details) { return eval(rule.trns_output_value); } })();
                            })(row, context, helpers);
                        } catch (exprErr) {
                            console.error('Expression evaluation error for field', field, 'seq', rule.trns_seq, exprErr);
                            newRow[field] = null;
                        }
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
        console.log(`Returning ${additionalRows.length + 1} rows (1 original + ${additionalRows.length} additional)`);
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
                return fieldValue === value;
            case '<>':
                return fieldValue !== value;
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
    trfm_Inbound
};
