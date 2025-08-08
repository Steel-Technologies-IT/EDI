// Import necessary modules and components
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";


const TranslationTableRules = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Check if we're in edit mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalSeq, setOriginalSeq] = useState('');

    // Initial state for the form fields
    const [form, setForm] = useState({
        trns_trns_tbl: '',
        trns_trns_fld: '',
        trns_end_dte: '',
        trns_seq: '',
        trns_strt_dte: '',
        trns_output_value: '',
        trns_output_type: '',
    });

    // On mount, parse query params and set defaults
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const mode = params.get('mode');
        const table = params.get('table') || '';
        const field = params.get('field') || '';
        const seq = params.get('seq') || '';
        const startDate = params.get('startDate') || '';
        const endDate = params.get('endDate') || '';
        const outputType = params.get('outputType') || '';
        const sourceComp = params.get('sourceComp') || '';
        const operator = params.get('operator') || '';
        const value = params.get('value') || '';
        const outputValue = params.get('outputValue') || '';

        // Debug logging for dates
        console.log('URL Params Debug:', {
            mode,
            table,
            field,
            seq,
            startDate,
            endDate,
            outputType,
            sourceComp,
            operator,
            value,
            outputValue
        });

        // Set edit mode
        if (mode === 'edit') {
            setIsEditMode(true);
            setOriginalSeq(seq);

            // Parse rule arrays from URL params
            let parsedRules = [{ comp: '', operator: '', value: '' }];
            
            if (sourceComp || operator || value) {
                const sourceCompArray = sourceComp ? sourceComp.split(',') : [''];
                let operatorArray = operator ? operator.split(',') : [''];
                let valueArray;
                
                // Try to parse value as JSON (for complex arrays), otherwise split by comma
                try {
                    const parsedValue = JSON.parse(value);
                    if (Array.isArray(parsedValue)) {
                        valueArray = parsedValue.map(v => Array.isArray(v) ? v.join(',') : v);
                    } else {
                        valueArray = [parsedValue];
                    }
                } catch {
                    valueArray = value ? value.split(',') : [''];
                }

                // Create rules array with matching lengths
                const maxLength = Math.max(sourceCompArray.length, operatorArray.length, valueArray.length);
                parsedRules = [];
                for (let i = 0; i < maxLength; i++) {
                    parsedRules.push({
                        comp: sourceCompArray[i] || '',
                        operator: operatorArray[i] || '',
                        value: valueArray[i] || ''
                    });
                }
            }

            setRules(parsedRules);
        }

        setForm(prev => ({
            ...prev,
            trns_trns_tbl: table,
            trns_trns_fld: field,
            trns_seq: seq,
            trns_strt_dte: startDate,
            trns_end_dte: endDate,
            trns_output_type: outputType,
            trns_output_value: outputValue
        }));


    }, [location.search]);

    // Rule rows: each is {comp, operator, value}
    const [rules, setRules] = useState([
        { comp: '', operator: '', value: '' }
    ]);

    // Output type Values (display key and value for DB)
    const [outputTypeValues, setOutputTypeValues] = useState([
        { key: 'Character', value: 'Character' },
        { key: 'Numeric', value: 'Numeric' },
        { key: 'Add Row', value: 'ADD_ROW' },
        { key: 'Expression', value: 'Expression' },
        { key: 'Exclude', value: 'EXCLUDE' }
    ]);

    const [operators, setOperators] = useState([
        '=', '<>', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'
    ]);

    // Table and field options
    const [tableOptions, setTableOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);

    // Existing translation rules for selected table/field
    const [existingRules, setExistingRules] = useState([]);

    // Fetch table names on mount
    useEffect(() => {
        fetch('http://localhost:5000/TranslationTable/Tables') // <-- Replace with your backend endpoint
            .then(res => res.json())
            .then(data => setTableOptions(data.tables || []))
            .catch(() => setTableOptions([]));
            
    }, []);



    // Fetch field names when table changes
    useEffect(() => {
        if (form.trns_trns_tbl) {
            fetch(`http://localhost:5000/TranslationTable/Tables/${encodeURIComponent(form.trns_trns_tbl)}/Fields`)
                .then(res => res.json())
                .then(data => {
                    const fields = data.fields || [];
                    setFieldOptions(fields);
                
                })
                .catch(() => {
                    setFieldOptions([]);
                });
        } else {
            setFieldOptions([]);
        }
    }, [form.trns_trns_tbl]);

    // Fetch existing translation rules when table or field changes (only in insert mode)
    useEffect(() => {
        if (!isEditMode && form.trns_trns_tbl && form.trns_trns_fld) {
            fetch(`http://localhost:5000/TranslationTable/Rules?table=${encodeURIComponent(form.trns_trns_tbl)}&field=${encodeURIComponent(form.trns_trns_fld)}`)
                .then(res => res.json())
                .then(data => setExistingRules(data.rules || []))
                .catch(() => setExistingRules([]));
        } else {
            setExistingRules([]);
        }
    }, [form.trns_trns_tbl, form.trns_trns_fld, isEditMode]);


    // Handle input changes for main fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // Handle rule row changes
    const handleRuleChange = (idx, field, value) => {
        setRules(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    };

    // Add a new rule row
    const handleAddRule = () => {
        setRules(prev => [...prev, { comp: '', operator: '', value: '' }]);
    };

    // Remove a rule row
    const handleRemoveRule = (idx) => {
        setRules(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
    };

    // Handle back navigation
    const handleBack = () => {
        navigate(-1);
    };


    // Submit handler
    const handleSubmit = (e) => {
        e.preventDefault();
        // Validate all form fields
        const requiredFields = [
            'trns_trns_tbl',
            'trns_trns_fld',
            'trns_end_dte',
            'trns_seq',
            'trns_strt_dte',
            'trns_output_value',
            'trns_output_type',
        ];
        for (let field of requiredFields) {
            if (!form[field] || form[field].toString().trim() === '') {
                alert(`Please fill field ${field}.`);
                return;
            }
        }
        // Validate all rule rows
        for (let i = 0; i < rules.length; i++) {
            const row = rules[i];
            if (!row.comp.toString().trim() || !row.operator.toString().trim() || !row.value.toString().trim()) {
                alert('Please fill out all rule comparison fields.');
                return;
            }
        }

        // Helper to format JS array as Postgres array string
        const toPgArray = arr => '{' + arr.map(v => (typeof v === 'string' ? v.replace(/'/g, "''") : v)).join(',') + '}';

        // Build arrays from rules, format as Postgres arrays
        const trns_source_comp = toPgArray(rules.map(r => r.comp));
        const trns_operatione = toPgArray(rules.map(r => r.operator));
        const trns_value = toPgArray(rules.map(r => r.value));

        // Set audit fields automatically
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const ymd = now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate());
        const hms = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

        // Build payload for backend
        const payload = {
            trns_trns_tbl: form.trns_trns_tbl,
            trns_trns_fld: form.trns_trns_fld,
            trns_end_dte: form.trns_end_dte,
            trns_seq: form.trns_seq,
            trns_strt_dte: form.trns_strt_dte,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value: form.trns_output_value,
            trns_output_type: form.trns_output_type,
            trns_crt_dte: ymd,
            trns_crt_tme: hms,
            // Add other audit/user fields as needed
        };

        // Add original sequence for updates
        if (isEditMode) {
            payload.original_seq = originalSeq;
        }

        // Choose endpoint and method based on mode
        const endpoint = isEditMode 
            ? 'http://localhost:5000/TranslationTable/UpdateRule' 
            : 'http://localhost:5000/TranslationTable/NewRule';
        const method = isEditMode ? 'PUT' : 'POST';

        fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async res => {
            let data;
            try {
                data = await res.json();
            } catch {
                data = {};
            }
            const successMessage = isEditMode ? 'Rule Updated' : 'Rule Added';
            const successCheck = isEditMode ? 
                (data.message && data.message.includes('Rule Updated')) :
                (data.message && data.message.includes('Rule Added'));
                
            if (res.ok && successCheck) {
                alert(successMessage);
                // Clear all fields only in insert mode
                if (!isEditMode) {
                    setForm({
                        trns_trns_tbl: '',
                        trns_trns_fld: '',
                        trns_end_dte: '',
                        trns_seq: '',
                        trns_strt_dte: '',
                        trns_output_value: '',
                        trns_output_type: '',
                    });
                    setRules([{ comp: '', operator: '', value: '' }]);
                }
            } else {
                const errorMessage = isEditMode ? 'Failed to update rule' : 'Failed to add rule';
                alert((data && data.error) ? data.error : errorMessage);
            }
        })
        .catch(err => {
            const errorMessage = isEditMode ? 'Failed to update rule' : 'Failed to add rule';
            alert(errorMessage);
            console.error('Error submitting rule:', err);
        });
    };

    // Layout: flex row if existing rules, else center
    const showExisting = existingRules.length > 0;
    return (
        <div
            style={{
                width: '100%',
                zIndex: 5,
                display: 'flex',
                flexDirection: showExisting ? 'row' : 'column',
                justifyContent: showExisting ? 'center' : 'center',
                alignItems: showExisting ? 'flex-start' : 'center',
                gap: showExisting ? 40 : 0,
                marginTop: 32,
                minHeight: '80vh',
            }}
        >
            {/* Existing rules table centered with form, 10px gap */}
            {showExisting && (
                <div style={{background: '#fafafa', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 16, minWidth: 350, width: 'max-content', flexShrink: 0, margin: 0}}>
                    <h3>Existing Translation Rules</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{background: '#f0f0f0'}}>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Seq</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Source Comp</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Operator</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Value</th>    
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Output Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {existingRules.map((rule, i) => (
                                <tr key={i}>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_seq}</td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>
                                        {Array.isArray(rule.trns_source_comp)
                                            ? rule.trns_source_comp.map((v, idx) => (
                                                <div key={idx}>{v}</div>
                                            ))
                                            : rule.trns_source_comp}
                                    </td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>
                                        {Array.isArray(rule.trns_operatione)
                                            ? rule.trns_operatione.map((v, idx) => (
                                                <div key={idx}>{v}</div>
                                            ))
                                            : rule.trns_operatione}
                                    </td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>
                                        {(() => {
                                            const val = rule.trns_value;
                                            if (Array.isArray(val)) {
                                                // If it's a single nested array (e.g. [[1,2,3]]), show as [1,2,3]
                                                if (val.length === 1 && Array.isArray(val[0])) {
                                                    return `[${val[0].join(',')}]`;
                                                }
                                                // If it's a flat array (no nested arrays), stack vertically
                                                if (val.length > 1 && !val.some(Array.isArray)) {
                                                    return val.map((v, i) => <div key={i}>{v}</div>);
                                                }
                                                // If it's a mixed array (e.g. [{}, a]) or nested arrays, show as JSON
                                                if (val.some(Array.isArray)) {
                                                    return val.map((v, i) => Array.isArray(v) ? `[${v.join(',')}]` : <div key={i}>{v}</div>);
                                                }
                                                // Single value array
                                                if (val.length === 1) {
                                                    return val[0];
                                                }
                                                // Empty array
                                                return '';
                                            } else {
                                                return val;
                                            }
                                        })()}
                                    </td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_output_value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Centered form, with 10px gap if existing rules */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: showExisting ? 'center' : 'center',
                    alignItems: showExisting ? 'flex-start' : 'center',
                    minWidth: 0,
                    margin: 0,
                    width: showExisting ? undefined : '100%',
                }}
            >
                <form onSubmit={handleSubmit} style={{width: '600px', background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #ccc'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                        <button 
                            type="button" 
                            onClick={handleBack}
                            style={{
                                background: '#666',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '8px 16px',
                                fontSize: 14,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            ← Back
                        </button>
                        <h2 style={{margin: 0}}>{isEditMode ? 'Edit Translation Table Rule' : 'Insert Translation Table Rule'}</h2>
                        <div style={{width: 60}}></div> {/* Spacer for centering */}
                    </div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
                        <select name="trns_trns_tbl" value={form.trns_trns_tbl} onChange={handleChange} required style={{flex: '1 1 45%'}}>
                            <option value="" disabled>Table Name</option>
                            {tableOptions.map(tbl => (
                                <option key={tbl} value={tbl}>{tbl}</option>
                            ))}
                        </select>
                        <select name="trns_trns_fld" value={form.trns_trns_fld} onChange={handleChange} required style={{flex: '1 1 45%'}} disabled={!form.trns_trns_tbl}>
                            <option value="" disabled>Field Name</option>
                            {fieldOptions.map(fld => (
                                <option key={fld} value={fld}>{fld}</option>
                            ))}
                        </select>
                        <div style={{flex: '1 1 45%', display: 'flex', flexDirection: 'column'}}>
                            <label htmlFor="trns_strt_dte" style={{marginBottom: 2, fontWeight: 500}}>Start Date</label>
                            <input id="trns_strt_dte" name="trns_strt_dte" type="date" value={form.trns_strt_dte} onChange={handleChange} style={{width: '100%'}} />
                        </div>
                        <div style={{flex: '1 1 45%', display: 'flex', flexDirection: 'column'}}>
                            <label htmlFor="trns_end_dte" style={{marginBottom: 2, fontWeight: 500}}>End Date<span style={{color: 'red'}}>*</span></label>
                            <input id="trns_end_dte" name="trns_end_dte" type="date" value={form.trns_end_dte} onChange={handleChange} required style={{width: '100%'}} />
                        </div>
                        <input name="trns_seq" placeholder="Sequence (number)" value={form.trns_seq} onChange={handleChange} required style={{flex: '1 1 45%'}} />
                        <select name="trns_output_type" value={form.trns_output_type} onChange={handleChange} style={{flex: '1 1 45%'}} required>
                            <option value="" disabled>Output Type</option>
                            {outputTypeValues.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.key}</option>
                            ))}
                        </select>
                        <div style={{flex: '1 1 45%', display: 'flex', flexDirection: 'column'}}>
                            <label htmlFor="trns_output_value" style={{marginBottom: 2, fontWeight: 500}}>Output Value</label>
                            <textarea
                                id="trns_output_value"
                                name="trns_output_value"
                                placeholder="Output Value"
                                value={form.trns_output_value}
                                onChange={handleChange}
                                style={{width: '100%', minHeight: 32, resize: 'vertical', fontFamily: 'inherit', fontSize: 16, padding: 6, borderRadius: 4, border: '1px solid #ccc'}}
                                rows={2}
                            />
                        </div>
                    </div>
                    <h3 style={{marginTop: 24}}>Rule Comparisons</h3>
                    <table style={{width: '100%', marginBottom: 16, borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{background: '#f0f0f0'}}>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Comp</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Operator</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Value</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>
                                        <textarea value={row.comp} onChange={e => handleRuleChange(idx, 'comp', e.target.value)}
                                            style={{width: '100%', minHeight: 32, resize: 'vertical', fontSize: 16, padding: 6, borderRadius: 4, border: '1px solid #ccc', fontFamily: 'inherit'}}
                                            rows={1}
                                        />
                                    </td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>
                                        <select value={row.operator} onChange={e => handleRuleChange(idx, 'operator', e.target.value)} style={{width: '100%', minHeight: 32, overflowY: 'auto', fontSize: 16, padding: 6, borderRadius: 4, border: '1px solid #ccc'}}>
                                            <option value="" disabled>Select Operator</option>
                                            {operators.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>
                                        <textarea value={row.value} onChange={e => handleRuleChange(idx, 'value', e.target.value)}
                                            style={{width: '100%', minHeight: 32, resize: 'vertical', fontSize: 16, padding: 6, borderRadius: 4, border: '1px solid #ccc', fontFamily: 'inherit'}}
                                            rows={1}
                                        />
                                    </td>
                                    <td style={{padding: 4, border: '1px solid #ccc', textAlign: 'center'}}>
                                        <button type="button" onClick={() => handleRemoveRule(idx)} disabled={rules.length === 1} style={{background: '#e57373', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: rules.length === 1 ? 'not-allowed' : 'pointer'}}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={handleAddRule} style={{marginBottom: 16, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 14}}>Add Rule</button>
                    <button type="submit" style={{marginTop: 8, width: '100%', padding: 12, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16}}>{isEditMode ? 'Update Rule' : 'Insert Rule'}</button>
                </form>
            </div>
        </div>
        
    );
};

export default TranslationTableRules;