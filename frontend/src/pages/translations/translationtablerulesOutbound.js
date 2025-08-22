// Import necessary modules and components
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Select from 'react-select';

const TranslationTableRulesOutbound = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Help document URL and opener
    const HELP_URL = '/help/HelpTranslations.pdf';
    const openHelp = () => {
        window.open(HELP_URL, '_blank', 'noopener,noreferrer');
    };

    // Check if we're in edit mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalSeq, setOriginalSeq] = useState('');
    const [originalCustomerNo, setOriginalCustomerNo] = useState(''); // renamed from originalEndDate
    const [originalTable, setOriginalTable] = useState('');
    const [originalField, setOriginalField] = useState('');
    const [prevField, setPrevField] = useState([]);
    const [prevTable, setPrevTable] = useState([]);

    // Initial state for the form fields
    const [form, setForm] = useState({
        trns_trns_tbl: '',
        trns_trns_fld: '',
        trns_seq: '',
        trns_customer_no: '', // replaced dates with customer no
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
        const customerNo = params.get('customerNo') || ''; // replaced start/end
        const outputType = params.get('outputType') || '';
        const sourceComp = params.get('sourceComp') || '';
        const operator = params.get('operator') || '';
        const value = params.get('value') || '';
        const outputValue = params.get('outputValue') || '';
        const prevTable = params.get('searchTable') || '';
        const prevField = params.get('searchField') || '';


        console.log(prevField, prevTable);
        setPrevTable(prevTable);
        setPrevField(prevField);
        // Set edit mode
        if (mode === 'edit' || mode === 'copy') {
            mode === 'edit' ? setIsEditMode(true) : null
            setOriginalSeq(seq);
            if (mode === 'edit') {
                setOriginalCustomerNo(customerNo);
                setOriginalTable(table);
                setOriginalField(field);
            }

            
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
            trns_trns_tbl: mode === 'copy' ? '' : table,
            trns_trns_fld: mode === 'copy' ? '' : field,
            trns_seq: mode === 'copy' ? '' : seq,
            trns_customer_no: customerNo, // set from query
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
        fetch('https://localhost:5000/TranslationTable/Tables') 
            .then(res => res.json())
            .then(data => setTableOptions(data.tables || []))
            .catch(() => setTableOptions([]));
            
    }, []);



    // Fetch field names when table changes
    useEffect(() => {
        if (form.trns_trns_tbl) {
            fetch(`https://localhost:5000/TranslationTable/Tables/${encodeURIComponent(form.trns_trns_tbl)}/Fields`)
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

    // Fetch existing translation rules when table, field, and customer no change (only in insert mode)
    useEffect(() => {
        const hasAll = !!form.trns_trns_tbl && !!form.trns_trns_fld && !!form.trns_customer_no;      
        if (!isEditMode && hasAll) {
            const url = `https://localhost:5000/TranslationTable/RulesOutbound?table=${encodeURIComponent(form.trns_trns_tbl)}&field=${encodeURIComponent(form.trns_trns_fld)}&customerNo=${encodeURIComponent(form.trns_customer_no)}`;
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    const all = data.rules || [];
                    // Prefer backend filter; also safeguard client-side by matching either property name
                    const customer = (form.trns_customer_no ?? '').toString().trim();
                    const filtered = all.filter(r => {
                        const cust = (r.trns_cust_no ?? r.trns_customer_no ?? '').toString().trim();
                        return cust === customer;
                    });
                    setExistingRules(filtered);
                })
                .catch(() => setExistingRules([]));
        } else {
            setExistingRules([]);
        }
    }, [form.trns_trns_tbl, form.trns_trns_fld, form.trns_customer_no, isEditMode]);


    // Handle input changes for main fields
    const handleSelectChange = (field, option) => {
        setForm(prev => {
            const next = { ...prev, [field]: option ? option.value : '' };
            if (field === 'trns_trns_tbl') {
                // Reset field when table changes
                next.trns_trns_fld = '';
            }
            return next;
        });
    };

    const handleInputChange = (e) => {
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
            'trns_seq',
            'trns_customer_no', // now required instead of dates
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

        // Normalize value: if operator is IN/NOT IN, accept "1, 2" and wrap into "{1,2}"; also convert [a,b] -> {a,b}
        const normalizeValue = (op, val) => {
            const s = (val ?? '').toString().trim();
            const upper = (op ?? '').toString().toUpperCase();
            if (upper === 'IN' || upper === 'NOT IN') {
                if (s.startsWith('{') && s.endsWith('}')) return s; // already brace format
                if (s.startsWith('[') && s.endsWith(']')) return `{${s.slice(1, -1)}}`;
                const items = s.split(',').map(x => x.trim()).filter(Boolean);
                return `{${items.join(',')}}`;
            }
            return s;
        };

        const normalizedRules = rules.map(r => ({
            ...r,
            value: normalizeValue(r.operator, r.value)
        }));

        // Helper: format one element for Postgres array literal
        const formatPgArrayElem = (v) => {
            if (v === null || v === undefined) return 'NULL';
            const s = String(v);
            // Escape backslashes and quotes, then wrap in double quotes
            const esc = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${esc}"`;
        };
        // Helper to format JS array as Postgres array string (with proper quoting)
        const toPgArray = (arr) => '{' + arr.map(formatPgArrayElem).join(',') + '}';

        // Build arrays from rules, format as Postgres arrays
        const trns_source_comp = toPgArray(rules.map(r => r.comp));
        const trns_operatione = toPgArray(rules.map(r => r.operator));
        // Keep each value as a single string element (brace-wrapped for IN/NOT IN)
        const trns_value = toPgArray(normalizedRules.map(r => r.value));

        // Set audit fields automatically
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const ymd = now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate());
        const hms = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

        // Build payload for backend
        const payload = {
            trns_trns_tbl: form.trns_trns_tbl,
            trns_trns_fld: form.trns_trns_fld,
            trns_seq: form.trns_seq,
            trns_customer_no: form.trns_customer_no, // include customer no
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value: form.trns_output_value,
            trns_output_type: form.trns_output_type,
            trns_crt_dte: ymd,
            trns_crt_tme: hms,
        };

        // Add original identifiers for updates
        if (isEditMode) {
            payload.original_seq = originalSeq;
            payload.original_trns_trns_tbl = originalTable;
            payload.original_trns_trns_fld = originalField;
            payload.original_customer_no = originalCustomerNo;
        }

        // Choose endpoint and method based on mode
        const endpoint = isEditMode 
            ? 'https://localhost:5000/TranslationTable/UpdateRuleOutbound' 
            : 'https://localhost:5000/TranslationTable/NewRuleOutbound';
        const method = isEditMode ? 'PUT' : 'POST';

        fetch(endpoint, {
            method,
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
                        trns_seq: '',
                        trns_customer_no: '', // reset
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
    const showExisting = existingRules.length > 0 && !!form.trns_trns_tbl && !!form.trns_trns_fld && !!form.trns_customer_no;
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
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Customer No</th>
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
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_cust_no}</td>
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
                                            const prettyBraceString = (s) => {
                                                if (typeof s === 'string') {
                                                    const t = s.trim();
                                                    if (t.startsWith('{') && t.endsWith('}')) {
                                                        return `[${t.slice(1, -1)}]`;
                                                    }
                                                }
                                                return s;
                                            };

                                            const renderVal = (v, i) => {
                                                if (Array.isArray(v)) {
                                                    return `[${v.join(',')}]`;
                                                }
                                                return <div key={i}>{prettyBraceString(v)}</div>;
                                            };

                                            const val = rule.trns_value;
                                            if (Array.isArray(val)) {
                                                // If it's a single nested array (e.g. [[1,2,3]]), show as [1,2,3]
                                                if (val.length === 1 && Array.isArray(val[0])) {
                                                    return `[${val[0].join(',')}]`;
                                                }
                                                // If it's a flat array (no nested arrays), stack vertically and pretty print brace strings
                                                if (val.length > 1 && !val.some(Array.isArray)) {
                                                    return val.map((v, i) => renderVal(v, i));
                                                }
                                                // If it's a mixed array or nested arrays, pretty print nested arrays
                                                if (val.some(Array.isArray)) {
                                                    return val.map((v, i) => Array.isArray(v) ? `[${v.join(',')}]` : renderVal(v, i));
                                                }
                                                // Single value array
                                                if (val.length === 1) {
                                                    return prettyBraceString(val[0]);
                                                }
                                                // Empty array
                                                return '';
                                            } else {
                                                return prettyBraceString(val);
                                            }
                                        })()}
                                    </td>
                                    <td style={{ padding: 4, border: '1px solid #ccc', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{rule.trns_output_value}</td>
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
                        <button
                            type="button"
                            onClick={openHelp}
                            title="Help"
                            aria-label="Help"
                            style={{
                                background: '#1976d2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                fontSize: 18,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 4px #bbb'
                            }}
                        >
                            ?
                        </button>
                    </div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
                        <Select
                            placeholder={<div>Select a table...</div>}
                            onChange={(opt) => handleSelectChange('trns_trns_tbl', opt)}
                            value={form.trns_trns_tbl ? { value: form.trns_trns_tbl, label: form.trns_trns_tbl } : null}
                            required
                            styles={{
                                container: (base) => ({
                                    ...base,
                                    width: 'calc((100% - 12px) / 2)',
                                    flex: '0 0 calc((100% - 12px) / 2)'
                                }),
                                control: (base) => ({
                                    ...base,
                                    width: '100%'
                                })
                            }}
                            options={tableOptions.map(tbl => ({ value: tbl, label: tbl }))}
                        />
                        <Select
                            placeholder={<div>Select a field...</div>}
                            name="trns_trns_fld"
                            onChange={(opt) => handleSelectChange('trns_trns_fld', opt)}
                            value={form.trns_trns_fld ? { value: form.trns_trns_fld, label: form.trns_trns_fld } : null}
                            required
                            styles={{
                                container: (base) => ({
                                    ...base,
                                    width: 'calc((100% - 12px) / 2)',
                                    flex: '0 0 calc((100% - 12px) / 2)'
                                }),
                                control: (base) => ({
                                    ...base,
                                    width: '100%'
                                })
                            }}
                            options={fieldOptions.map(fld => ({ value: fld, label: fld }))}
                            isDisabled={!form.trns_trns_tbl}
                        />

                        {/* Customer No and Sequence on the same line */}
                        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <label htmlFor="trns_customer_no" style={{ marginBottom: 2, fontWeight: 500 }}>
                                    Customer No<span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="trns_customer_no"
                                    name="trns_customer_no"
                                    type="text"
                                    value={form.trns_customer_no}
                                    onChange={handleInputChange}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <label htmlFor="trns_seq" style={{ marginBottom: 2, fontWeight: 500 }}>
                                    Sequence No<span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="trns_seq"
                                    name="trns_seq"
                                    type="text"
                                    placeholder="Sequence (number)"
                                    value={form.trns_seq}
                                    onChange={handleInputChange}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <label htmlFor="trns_output_type" style={{ marginBottom: 2, fontWeight: 500 }}>
                                    Output Type<span style={{ color: 'red' }}>*</span>
                                </label>
                                <select name="trns_output_type" value={form.trns_output_type} onChange={handleInputChange} style={{flex: '1 1 45%'}} required>
                                    <option value="" disabled>Output Type</option>
                                    {outputTypeValues.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.key}</option>
                                    ))}
                        </select>
                        </div>
                        </div>

                        
                        <div style={{flex: '1 1 45%', display: 'flex', flexDirection: 'column'}}>
                            <label htmlFor="trns_output_value" style={{marginBottom: 2, fontWeight: 500}}>Output Value</label>
                            <textarea
                                id="trns_output_value"
                                name="trns_output_value"
                                placeholder="Output Value"
                                value={form.trns_output_value}
                                onChange={handleInputChange}
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

export default TranslationTableRulesOutbound;