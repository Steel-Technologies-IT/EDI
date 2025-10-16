// Import necessary modules and components
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import OutboundRuleChange from "./components/outbound_rule_change";
import InboundRuleChange from "./components/inbound_rule_change";


const TranslationTableRules = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get mode from URL parameters
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get('mode') || 'I'; // Default to 'I' if not specified
    
    // Initialize column filters based on mode
    const [columnFilters, setColumnFilters] = useState(() => {
        if (mode === 'I') {
            return {
                seq: '',
                table: '',
                field: '',
                sourceComp: '',
                operator: '',
                value: '',
                outputValue: ''
            };
        } else {
            return {
                seq: '',
                table: '',
                field: '',
                customerNo: '', // Use customerNo, not cust_no
                sourceComp: '',
                operator: '',
                value: '',
                outputValue: ''
            };
        }
    });

    // Help document URL and opener
    const HELP_URL = '/help/HelpTranslations.pdf';
    const openHelp = () => {
        window.open(HELP_URL, '_blank', 'noopener,noreferrer');
    };

    // Check if we're in edit mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalSeq, setOriginalSeq] = useState('');
    const [originalEndDate, setOriginalEndDate] = useState('');
    const [originalCustomerNo, setOriginalCustomerNo] = useState('');
    const [originalTable, setOriginalTable] = useState('');
    const [originalField, setOriginalField] = useState('');

    // Initial state for the form fields
    const [form, setForm] = useState(mode === 'I' ?{
        trns_trns_tbl: '',
        trns_trns_fld: '',
        // REMOVE trns_end_dte and trns_strt_dte
        trns_seq: '',
        trns_output_value: '',
        trns_output_type: '',
    }:{
        trns_trns_tbl: '',
        trns_trns_fld: '',
        trns_seq: '',
        trns_cust_no: '', 
        trns_output_value: '',
        trns_output_type: '',
    }
);

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
        const prevTable = params.get('searchTable') || '';
        const prevField = params.get('searchField') || '';
        const prevCustNo = params.get('cust_no') || '';
        const type = params.get('type') || '';
        const currentUser = sessionStorage.getItem('currentUser') || '';

        // Set edit mode
        if (type === 'edit' || type === 'copy') {
            type === 'edit' ? setIsEditMode(true) : null
            setOriginalSeq(seq);
            setOriginalEndDate(endDate);
            type === 'edit' || type === 'copy' ? setOriginalCustomerNo(prevCustNo) : null; 
            type === 'edit' ? setOriginalTable(table) : null;
            type === 'edit' ? setOriginalField(field) : null;

            
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

        setForm(prev => (mode === 'I' ? {
            ...prev,
            trns_trns_tbl: type === 'copy' ? '' : table,
            trns_trns_fld: type === 'copy' ? '' : field,
            trns_seq: type === 'copy' ? '' : seq,
            // REMOVE trns_strt_dte: startDate,
            // REMOVE trns_end_dte: endDate,
            trns_output_type: outputType,
            trns_output_value: outputValue
        } :{
            ...prev,
            trns_trns_tbl: type === 'copy' ? '' : table,
            trns_trns_fld: type === 'copy' ? '' : field,
            trns_seq: type === 'copy' ? '' : seq,
            trns_cust_no: prevCustNo, // <-- Set to previous customer number or blank
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
        fetch( mode === 'I' ? `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Tables` :  `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/InvexTables`)
            .then(res => res.json())
            .then(data => {
                const originalTables = data.tables || [];
                
                // Extract unique first three digits from existing tables
                const uniqueThreeDigits = new Set();
                originalTables.forEach(table => {
                    // Extract first 3 digits from table names like "856_SNF_Header"
                    const match = table.match(/^(\d{3})/);
                    if (match) {
                        uniqueThreeDigits.add(match[1]);
                    }
                });
                
                // Create context tables for each unique 3-digit prefix
                const contextTables = Array.from(uniqueThreeDigits).map(digits => 
                    `${digits}_SNF_Context`
                );
                
                // Combine original tables with context tables
                const allTables = [...originalTables, ...contextTables];
                
                setTableOptions(allTables);
            })
            .catch(() => setTableOptions([]));

            

    }, []);



    // Fetch field names when table changes
    useEffect(() => {
        if (form.trns_trns_tbl) {
            // Check if this is a context table (ends with _SNF_Context)
            if (form.trns_trns_tbl.endsWith('_SNF_Context')) {
                // Extract the 3-digit prefix (e.g., "856" from "856_SNF_Context")
                const match = form.trns_trns_tbl.match(/^(\d{3})_SNF_Context$/);
                if (match) {
                    const prefix = match[1];
                    
                    // Fetch all tables that start with this prefix and get their fields
                    fetch(`https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Tables`)
                        .then(res => res.json())
                        .then(data => {
                            const allTables = data.tables || [];
                            
                            // Filter tables that start with the prefix (e.g., "856_SNF_")
                            const matchingTables = allTables.filter(table => 
                                table.startsWith(`${prefix}_SNF_`) && !table.endsWith('_SNF_Context')
                            );
                            
                            // Fetch fields from all matching tables
                            const fieldPromises = matchingTables.map(table =>
                                fetch(`https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Tables/${encodeURIComponent(table)}/Fields`)
                                    .then(res => res.json())
                                    .then(data => ({
                                        table: table,
                                        fields: data.fields || []
                                    }))
                                    .catch(() => ({ table: table, fields: [] }))
                            );

                            // Wait for all field requests to complete
                            Promise.all(fieldPromises)
                                .then(results => {
                                    // Combine all unique field names with table prefixes
                                    const allFields = new Set();
                                    
                                    results.forEach(result => {
                                        result.fields.forEach(field => {
                                            allFields.add(`${field}`);
                                        });
                                    });
                                    
                                    // Convert Set to array and sort - FIX: Just use strings, not objects
                                    const sortedFields = Array.from(allFields).sort();
                                    
                                    setFieldOptions(sortedFields);
                                })
                                .catch(() => {
                                    setFieldOptions([]);
                                });
                        })
                        .catch(() => {
                            setFieldOptions([]);
                        });
                } else {
                    setFieldOptions([]);
                }
            } else {
                // Regular table - fetch fields normally
                fetch(`https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Tables/${encodeURIComponent(form.trns_trns_tbl)}/Fields`)
                    .then(res => res.json())
                    .then(data => {
                        const fields = data.fields || [];
    

                        setFieldOptions(fields);
                    })
                    .catch(() => {
                        setFieldOptions([]);
                    });
            }
        } else {
            console.log(form.trns_trns_tbl)
            setFieldOptions([]);
        }
    }, [form.trns_trns_tbl]);

    // Fetch existing translation rules when table or field changes (only in insert mode)
    useEffect(() => {
    if (!isEditMode && form.trns_trns_tbl && form.trns_trns_fld) {
        // For outbound mode, we also need customer number to show existing rules
        const shouldFetchOutbound = mode === 'O' && form.trns_cust_no && form.trns_cust_no.trim() !== '';
        const shouldFetchInbound = mode === 'I';
        
        if (shouldFetchInbound || shouldFetchOutbound) {
            let url;
            if (mode === 'I') {
                url = `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Rules?table=${encodeURIComponent(form.trns_trns_tbl)}&field=${encodeURIComponent(form.trns_trns_fld)}`;
            } else {
                // Fixed: Removed extra closing brace and added customer number parameter
                url = `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/RulesOutbound?table=${encodeURIComponent(form.trns_trns_tbl)}&field=${encodeURIComponent(form.trns_trns_fld)}&cust_no=${encodeURIComponent(form.trns_cust_no)}`;
            }
            
            fetch(url)
                .then(res => res.json())
                .then(data => setExistingRules(data.rules || []))
                .catch(err => {
                    console.error('Error fetching existing rules:', err);
                    setExistingRules([]);
                });
        } else {
            setExistingRules([]);
        }
    } else {
        setExistingRules([]);
    }
}, [form.trns_trns_tbl, form.trns_trns_fld, form.trns_cust_no, isEditMode, mode]);


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
    const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all form fields
    const requiredFields = mode === 'I' ? [
        'trns_trns_tbl',
        'trns_trns_fld',
        'trns_seq',
        'trns_output_value',
        'trns_output_type',
    ] : [
        'trns_trns_tbl',
        'trns_trns_fld',
        'trns_seq',
        'trns_cust_no', 
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

    // CHECK FOR EXISTING RECORD BEFORE PROCEEDING
    try {
        const checkParams = new URLSearchParams();
        checkParams.append('table', form.trns_trns_tbl);
        checkParams.append('field', form.trns_trns_fld);
        checkParams.append('seq', form.trns_seq);
        
        if (mode === 'O') {
            checkParams.append('cust_no', form.trns_cust_no);
        }

        const checkEndpoint = mode === 'I' 
            ? `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/CheckRule?${checkParams}`
            : `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/CheckRuleOutbound?${checkParams}`;

        const checkResponse = await fetch(checkEndpoint);
        const checkData = await checkResponse.json();

        if (checkResponse.ok && checkData.exists) {
            // Record exists - determine what to do based on mode
            if (isEditMode) {
                // In edit mode, check if we're trying to change the key fields to an existing record
                const isKeyChange = (
                    form.trns_trns_tbl !== originalTable ||
                    form.trns_trns_fld !== originalField ||
                    form.trns_seq !== originalSeq ||
                    (mode === 'O' && form.trns_cust_no !== originalCustomerNo)
                );

                if (isKeyChange) {
                    alert(`A rule already exists with these key values:\nTable: ${form.trns_trns_tbl}\nField: ${form.trns_trns_fld}\nSequence: ${form.trns_seq}${mode === 'O' ? `\nCustomer: ${form.trns_cust_no}` : ''}\n\nPlease use different values or edit the existing rule.`);
                    return;
                }
                // If no key change, proceed with update
            } else {
                // In insert mode, record already exists
                const confirmOverwrite = window.confirm(
                    `A rule already exists with these values:\nTable: ${form.trns_trns_tbl}\nField: ${form.trns_trns_fld}\nSequence: ${form.trns_seq}${mode === 'O' ? `\nCustomer: ${form.trns_cust_no}` : ''}\n\nDo you want to overwrite the existing rule?`
                );
                
                if (!confirmOverwrite) {
                    return;
                }
                
                // User confirmed overwrite - we'll proceed as an update instead of insert
                // Set the original values for the update
                setOriginalSeq(form.trns_seq);
                setOriginalTable(form.trns_trns_tbl);
                setOriginalField(form.trns_trns_fld);
                if (mode === 'O') {
                    setOriginalCustomerNo(form.trns_cust_no);
                }
                
                // Change to edit mode for this operation
                const wasEditMode = isEditMode;
                setIsEditMode(true);
                
                // Continue with the rest of the function as an update
                await performSubmit(true); // Pass true to indicate this is now an update
                
                // Reset edit mode if it wasn't originally in edit mode
                if (!wasEditMode) {
                    setIsEditMode(false);
                }
                return;
            }
        }
        
        // Record doesn't exist or we're proceeding with the operation
        await performSubmit(false);
        
    } catch (error) {
        console.error('Error checking for existing record:', error);
        alert('Error checking for existing records. Please try again.');
        return;
    }

    // Extract the main submission logic into a separate function
    async function performSubmit(isOverwrite = false) {
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
        const payload = mode === 'I' ? {
            trns_trns_tbl: form.trns_trns_tbl,
            trns_trns_fld: form.trns_trns_fld,
            trns_seq: form.trns_seq,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value: form.trns_output_value,
            trns_output_type: form.trns_output_type,
            trns_crt_dte: ymd,
            trns_crt_tme: hms,
        } : {
            trns_trns_tbl: form.trns_trns_tbl,
            trns_trns_fld: form.trns_trns_fld,
            trns_seq: form.trns_seq,
            trns_cust_no: form.trns_cust_no, 
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value: form.trns_output_value,
            trns_output_type: form.trns_output_type,
            trns_crt_dte: ymd,
            trns_crt_tme: hms
        };

        // Add original sequence for updates or overwrites
        if ((isEditMode || isOverwrite) && mode === 'I') {
            payload.original_seq = originalSeq;
            payload.original_end_dte = originalEndDate;
            payload.original_trns_trns_tbl = originalTable;
            payload.original_trns_trns_fld = originalField;
        }
        else if (isEditMode || isOverwrite) {
            payload.original_seq = originalSeq;
            payload.original_trns_trns_tbl = originalTable;
            payload.original_trns_trns_fld = originalField;
            payload.original_customer_no = originalCustomerNo;
        }

        // Choose endpoint and method based on mode and operation
        const isUpdateOperation = isEditMode || isOverwrite;
        const endpoint = isUpdateOperation 
            ? (mode === 'I' ? `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/UpdateRule` : `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/UpdateRuleOutbound`)
            : (mode === 'I' ? `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/NewRule` : `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/NewRuleOutbound`);
        const method = isUpdateOperation ? 'PUT' : 'POST';

        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let data;
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            const successMessage = isUpdateOperation ? 'Rule Updated' : 'Rule Added';
            const successCheck = isUpdateOperation ? 
                (data.message && data.message.includes('Rule Updated')) :
                (data.message && data.message.includes('Rule Added'));
                
            if (response.ok && successCheck) {
                alert(successMessage);
                // Clear all fields only in insert mode (and not when overwriting)
                if (!isEditMode && !isOverwrite) {
                    setForm(mode === 'I' ? {
                        trns_trns_tbl: '',
                        trns_trns_fld: '',
                        trns_seq: '',
                        trns_output_value: '',
                        trns_output_type: '',
                    } : {
                        trns_trns_tbl: '',
                        trns_trns_fld: '',
                        trns_seq: '',
                        trns_cust_no: '', 
                        trns_output_value: '',
                        trns_output_type: '',
                    });
                    setRules([{ comp: '', operator: '', value: '' }]);
                }
            } else {
                const errorMessage = isUpdateOperation ? 'Failed to update rule' : 'Failed to add rule';
                alert((data && data.error) ? data.error : errorMessage);
            }
        } catch (err) {
            const errorMessage = isUpdateOperation ? 'Failed to update rule' : 'Failed to add rule';
            alert(errorMessage);
            console.error('Error submitting rule:', err);
        }
    }
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
           {mode === 'I' ? 
                <InboundRuleChange
                    existingRules={existingRules}
                    handleRuleChange={handleRuleChange}
                    showExisting={existingRules.length > 0}
                    form={form}
                    handleSubmit={handleSubmit}
                    handleBack={handleBack}
                    isEditMode={isEditMode}
                    openHelp={openHelp}
                    handleSelectChange={handleSelectChange}
                    handleInputChange={handleInputChange}
                    tableOptions={tableOptions}
                    fieldOptions={fieldOptions}
                    outputTypeValues={outputTypeValues}
                    rules={rules}
                    operators={operators}
                    handleRemoveRule={handleRemoveRule}
                    handleAddRule={handleAddRule}
                    mode={mode}
                /> : 
                <OutboundRuleChange
                    existingRules={existingRules}
                    handleRuleChange={handleRuleChange}
                    showExisting={existingRules.length > 0}
                    form={form}
                    handleSubmit={handleSubmit}
                    handleBack={handleBack}
                    isEditMode={isEditMode}
                    openHelp={openHelp}
                    handleSelectChange={handleSelectChange}
                    handleInputChange={handleInputChange}
                    tableOptions={tableOptions}
                    fieldOptions={fieldOptions}
                    outputTypeValues={outputTypeValues}
                    rules={rules}
                    operators={operators}
                    handleRemoveRule={handleRemoveRule}
                    handleAddRule={handleAddRule}
                    mode={mode}
                />
            }
        </div>
    );
};

export default TranslationTableRules;