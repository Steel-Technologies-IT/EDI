//Imports
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiDownload, FiFilter, FiPlus, FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';
import { FcClearFilters } from "react-icons/fc";
import { stringifyForFilter, stringifyTrnsValue, formatDateForInput, csvEscape, normalizeVal } from '../../functions/helpers';
import TranslationDropdowns from './components/translation_dropdowns';
import InboundRulesTable from "./components/inbound_translations";
import OutboundRulesTable  from "./components/outbound_translations"



const TranslationHome = () => {
    //Declare Variables
    
    
    const currentUser = sessionStorage.getItem('currentUser') || '';
    const userGroups = JSON.parse(sessionStorage.getItem('userGroups') || '[]');
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode') || 'I';
    const navigate = useNavigate();
    const [tableOptions, setTableOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);
    const [selectedTables, setSelectedTables] = useState([]); 
    const [selectedFields, setSelectedFields] = useState([]);
    const [rules, setRules] = useState([]);
    const [tableSearch, setTableSearch] = useState("");
    const [fieldSearch, setFieldSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState(mode === "I" ? {
        seq: '',
        table: '',
        field: '',
        sourceComp: '',
        operator: '',
        value: '',
        outputValue: ''
    } : {
        seq: '',
        table: '',
        field: '',
        customerNo: '', 
        sourceComp: '',
        operator: '',
        value: '',
        outputValue: ''
    });
    const [showFilters, setShowFilters] = useState(true);
    const FILTER_ROW_HEIGHT = 40; // px
    console.log(currentUser)
    // Track when we've attempted to restore from storage to avoid overwriting with empty defaults
    const hasAttemptedRestore = useRef(false);


    
    // #region Fetch On Mounts
    // Fetch table names on mount - use same endpoint for both modes since tables are the same
    useEffect(() => {
        const URL = mode === 'I' ? `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Tables` :  `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/InvexTables`; // Use same endpoint for both
       
        fetch(URL)
            .then(res => res.json())
            .then(async data => {
                const tables = data.tables || [];
                setTableOptions(tables);
                
                // Fetch all unique fields from all tables
                try {
                    const fieldPromises = tables.map(async table => {
                        try {
                            const fieldRes = await fetch(`https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Tables/${encodeURIComponent(table)}/Fields`);
                            const fieldData = await fieldRes.json();
                            return fieldData.fields || [];
                        } catch {
                            return [];
                        }
                    });
                    
                    const allFieldArrays = await Promise.all(fieldPromises);
                    const allFields = allFieldArrays.flat();
                    const uniqueFields = Array.from(new Set(allFields.filter(Boolean)));
                    setFieldOptions(uniqueFields);
                } catch (err) {
                    console.error('Error fetching fields:', err);
                    setFieldOptions([]);
                }
            })
            .catch(() => {
                setTableOptions([]);
                setFieldOptions([]);
            });
    }, [mode]);

    // Fetch rules based on selectedTables/selectedFields. If no table selected, fetch all rules.
    useEffect(() => {
        const fetchForSingleTable = async (table, field) => {
            let url = mode === "I" ? `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Rules?table=${encodeURIComponent(table)}` : `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/RulesOutbound?table=${encodeURIComponent(table)}`;
            if (field && field.trim() !== "") url += `&field=${encodeURIComponent(field)}`;
            
            const res = await fetch(url);
            const data = await res.json();
            // Attach table name to each rule for downstream actions when viewing all tables
            const withTable = (data.rules || []).map(r => ({ ...r, trns_trns_tbl: table }));
            return withTable;
        };

        const fetchFieldsForTable = async (table) => {
            // Use same fields endpoint for both modes since fields are the same
            const res = await fetch(`https://${process.env.REACT_APP_HOST}:5000/TranslationTable/Tables/${encodeURIComponent(table)}/Fields`);
            const data = await res.json();
            return data.fields || [];
        };

        const load = async () => {
            try {
                if (selectedTables && selectedTables.length > 0) {
                    // Fetch rules for selected tables
                    const results = await Promise.all(
                        selectedTables.map(tbl => fetchForSingleTable(tbl, ""))
                    );
                    const combined = results.flat();
                    
                    // If specific fields selected, filter client-side
                    const filteredByFields = (selectedFields && selectedFields.length > 0)
                        ? combined.filter(r => selectedFields.includes(r.trns_trns_fld))
                        : combined;
                    setRules(filteredByFields);

                    // Update field options ONLY when tables change, not when fields change
                    if (selectedTables.length === 1) {
                        try {
                            const allFields = await fetchFieldsForTable(selectedTables[0]);
                            setFieldOptions(allFields);
                        } catch {
                            // Keep existing fieldOptions on error
                        }
                    } else if (selectedTables.length > 1) {
                        // Multiple tables: get union of ALL fields from ALL selected tables
                        try {
                            const fieldPromises = selectedTables.map(tbl => fetchFieldsForTable(tbl));
                            const allFieldArrays = await Promise.all(fieldPromises);
                            const allFields = allFieldArrays.flat();
                            const uniqueFields = Array.from(new Set(allFields.filter(Boolean)));
                            setFieldOptions(uniqueFields);
                        } catch {
                            // Keep existing fieldOptions on error
                        }
                    }
                } else if (tableOptions.length > 0) {
                    // All tables path: use different endpoints for all rules
                    if (mode === 'I') {
                        const res = await fetch(`https://${process.env.REACT_APP_HOST}:5000/TranslationTable/AllRules`);
                        const data = await res.json();
                        setRules(data.rules || []);
                    } else {
                        const res = await fetch(`https://${process.env.REACT_APP_HOST}:5000/TranslationTable/AllRulesOutbound`);
                        const data = await res.json();
                        setRules(data.rules || []);
                    }
                    // Field options were already set in the initial table fetch - don't override them
                } else {
                    // No tables loaded yet
                    setRules([]);
                    // Don't clear fieldOptions here - keep them from initial load
                }
            } catch (e) {
                console.error('Error loading rules:', e);
                setRules([]);
                // Don't clear fieldOptions here - keep them from initial load
            }
        };
        
        load();
    }, [selectedTables, selectedFields, tableOptions, mode]);

    // Apply state returned from Insert/Edit screen (handleBack)
    useEffect(() => {
        // Helper to coerce potential string/array values to array<string>
        const toArray = (v) => {
            if (!v && v !== '') return undefined;
            if (Array.isArray(v)) {
                // If array contains comma-delimited strings, split them
                const flattened = v.flatMap(item => {
                    if (typeof item === 'string') {
                        return item.split(',').map(s => s.trim()).filter(Boolean);
                    }
                    return item;
                }).filter(Boolean);
                return flattened;
            }
            if (typeof v === 'string') {
                const s = v.trim();
                if (!s) return [];
                // Split comma-delimited strings into individual entries
                return s.split(',').map(x => x.trim()).filter(Boolean);
            }
            return undefined;
        };

        // Ensure filters object has stable string values for all keys
        const sanitizeFilters = (obj) => {
            if (!obj || typeof obj !== 'object') return undefined;
            const base = { seq: '', table: '', field: '', sourceComp: '', operator: '', value: '', outputValue: '' };
            const out = { ...base };
            for (const k of Object.keys(base)) {
                const v = obj[k];
                out[k] = (typeof v === 'string') ? v : (v == null ? '' : String(v));
            }
            return out;
        };

        // 1) Prefer sessionStorage (we explicitly saved current selections before navigating)
        try {
            const raw = sessionStorage.getItem('TranslationHomeReturn');
            if (raw) {
                const data = JSON.parse(raw);
                if (data && typeof data === 'object') {
                    const tables = toArray(data.tables) ?? toArray(data.prevTables) ?? toArray(data.prevTable);
                    const fields = toArray(data.fields) ?? toArray(data.prevFields) ?? toArray(data.prevField);
                    // Restore column filters as an object (do not use toArray on objects)
                    const colFiltersObj =
                        (data.columnFilters && typeof data.columnFilters === 'object') ? data.columnFilters :
                        (data.prevColumnFilters && typeof data.prevColumnFilters === 'object') ? data.prevColumnFilters :
                        (data.prevColumnFilter && typeof data.prevColumnFilter === 'object') ? data.prevColumnFilter : null;

                    if (tables) setSelectedTables(tables);
                    if (fields) setSelectedFields(fields);
                    const sanitized = sanitizeFilters(colFiltersObj);
                    if (sanitized) setColumnFilters(sanitized);
                }
                hasAttemptedRestore.current = true;
                return; // stop here so location.state doesn't override
            }
        } catch {}

        // 2) Fallback to location.state, but only accept explicit prev* keys (avoid Insert page search params like 'table')
        const st = (location && location.state) ? location.state : null;
        if (st && typeof st === 'object') {
            const tables = toArray(st.prevTables) ?? toArray(st.prevTable);
            const fields = toArray(st.prevFields) ?? toArray(st.prevField);
            const colFiltersObj = (st.prevColumnFilters && typeof st.prevColumnFilters === 'object') ? st.prevColumnFilters : undefined;
            if ((tables && tables.length) || (fields && fields.length) || colFiltersObj) {
                if (tables) setSelectedTables(tables);
                if (fields) setSelectedFields(fields);
                const sanitized = sanitizeFilters(colFiltersObj);
                if (sanitized) setColumnFilters(sanitized);
                hasAttemptedRestore.current = true;
                try { navigate('.', { replace: true, state: null }); } catch {}
                return;
            }
        }
        // Mark that we've attempted even if nothing to restore
        hasAttemptedRestore.current = true;
    }, [location.key, navigate]);

    // Persist selections and filters whenever they change (after we attempted restore)
    useEffect(() => {
        if (!hasAttemptedRestore.current) return;
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({
                tables: selectedTables,
                fields: selectedFields,
                columnFilters: columnFilters
            }));
        } catch {}
    }, [selectedTables, selectedFields, columnFilters]);
    // #endregion



    // #region Computed Values
    // Compute rule counts per field for dropdown
    const fieldRuleCounts = React.useMemo(() => {
        const counts = {};
        for (const rule of rules) {
            const fld = rule.trns_trns_fld;
            if (fld) counts[fld] = (counts[fld] || 0) + 1;
        }
        return counts;
    }, [rules]);

    // When viewing all tables or multiple, allow client-side field filtering and apply table/field search as LIKE
    const displayedRules = React.useMemo(() => {
        let data = [...rules];
        console.log('Starting with rules:', data.length); // DEBUG
        
        const tableQ = (tableSearch || '').trim().toLowerCase();
        const fieldQ = (fieldSearch || '').trim().toLowerCase();

        if (!selectedTables.length && tableQ) {
            data = data.filter(r => (r.trns_trns_tbl || '').toLowerCase().includes(tableQ));
            console.log('After table search filter:', data.length); // DEBUG
        } else if (selectedTables.length) {
            data = data.filter(r => selectedTables.includes(r.trns_trns_tbl));
            console.log('After selectedTables filter:', data.length, 'selectedTables:', selectedTables); // DEBUG
        }

        if (selectedFields && selectedFields.length > 0) {
            data = data.filter(r => selectedFields.includes(r.trns_trns_fld));
            console.log('After selectedFields filter:', data.length, 'selectedFields:', selectedFields); // DEBUG
        } else if (fieldQ) {
            data = data.filter(r => (r.trns_trns_fld || '').toLowerCase().includes(fieldQ));
            console.log('After field search filter:', data.length); // DEBUG
        }

        // New: per-column LIKE filters
        const like = (needle, hay) => hay.includes(needle);
        const cf = columnFilters;
        const seqNeedle = (cf.seq || '').toLowerCase();
        const tableNeedle = (cf.table || '').toLowerCase();
        const fieldNeedle = (cf.field || '').toLowerCase();
        const srcNeedle = (cf.sourceComp || '').toLowerCase();
        const opNeedle = (cf.operator || '').toLowerCase();
        const valNeedle = (cf.value || '').toLowerCase();
        const outValNeedle = (cf.outputValue || '').toLowerCase();

        
        // Only define custNeedle for outbound mode
        const custNeedle = mode === 'O' ? (cf.customerNo || '').toLowerCase() : '';

        // Apply filters based on mode
        if (mode === 'I') {
            // Inbound filtering (no customer filter)
            if (seqNeedle || tableNeedle || fieldNeedle || srcNeedle || opNeedle || valNeedle || outValNeedle) {
                console.log('Applying column filters for inbound'); // DEBUG
                data = data.filter(r => {
                    const seqStr = stringifyForFilter(r.trns_seq).toLowerCase();
                    const tableStr = stringifyForFilter(r.trns_trns_tbl || '').toLowerCase();
                    const fieldStr = stringifyForFilter(r.trns_trns_fld).toLowerCase();
                    const srcStr = stringifyForFilter(r.trns_source_comp).toLowerCase();
                    const opStr = stringifyForFilter(r.trns_operatione).toLowerCase();
                    const valStr = stringifyTrnsValue(r.trns_value).toLowerCase();
                    const outValStr = stringifyForFilter(r.trns_output_value).toLowerCase();

                    const match = (
                        (!seqNeedle || like(seqNeedle, seqStr)) &&
                        (!tableNeedle || like(tableNeedle, tableStr)) &&
                        (!fieldNeedle || like(fieldNeedle, fieldStr)) &&
                        (!srcNeedle || like(srcNeedle, srcStr)) &&
                        (!opNeedle || like(opNeedle, opStr)) &&
                        (!valNeedle || like(valNeedle, valStr)) &&
                        (!outValNeedle || like(outValNeedle, outValStr))
                    );
                    
                    if (!match) {
                        console.log('Rule filtered out:', r.trns_seq, {
                            seq: seqStr, table: tableStr, field: fieldStr,
                            src: srcStr, op: opStr, val: valStr, outVal: outValStr
                        }); // DEBUG
                    }
                    
                    return match;
                });
                console.log('After column filters:', data.length); // DEBUG
            }
        } else {
            // Outbound filtering (includes customer filter)
            if (seqNeedle || tableNeedle || fieldNeedle || custNeedle || srcNeedle || opNeedle || valNeedle || outValNeedle) {
                data = data.filter(r => {
                    const seqStr = stringifyForFilter(r.trns_seq).toLowerCase();
                    const tableStr = stringifyForFilter(r.trns_trns_tbl || '').toLowerCase();
                    const fieldStr = stringifyForFilter(r.trns_trns_fld).toLowerCase();
                    const custStr = stringifyForFilter(r.trns_cust_no ?? r.trns_customer_no ?? '').toLowerCase();
                    const srcStr = stringifyForFilter(r.trns_source_comp).toLowerCase();
                    const opStr = stringifyForFilter(r.trns_operatione).toLowerCase();
                    const valStr = stringifyTrnsValue(r.trns_value).toLowerCase();
                    const outValStr = stringifyForFilter(r.trns_output_value).toLowerCase();

                    return (
                        (!seqNeedle || like(seqNeedle, seqStr)) &&
                        (!tableNeedle || like(tableNeedle, tableStr)) &&
                        (!fieldNeedle || like(fieldNeedle, fieldStr)) &&
                        (!custNeedle || like(custNeedle, custStr)) &&
                        (!srcNeedle || like(srcNeedle, srcStr)) &&
                        (!opNeedle || like(opNeedle, opStr)) &&
                        (!valNeedle || like(valNeedle, valStr)) &&
                        (!outValNeedle || like(outValNeedle, outValStr))
                    );
                });
            }
        }

        console.log('Final displayedRules:', data.length); // DEBUG
        return data;
    }, [rules, selectedTables, selectedFields, tableSearch, fieldSearch, columnFilters]);

    // #endregion Computed Values

    // Filtered options based on search boxes (keep selected items present)
    const filteredTableOptions = React.useMemo(() => {
        const q = tableSearch.trim().toLowerCase();
        // Use contains to emulate LIKE '%q%'
        let opts = q ? tableOptions.filter(t => t.toLowerCase().includes(q)) : [...tableOptions];
        if (selectedTables && selectedTables.length) {
            // Keep all selected values at the top and unique
            const missing = selectedTables.filter(st => !opts.includes(st));
            opts = [...new Set([...selectedTables, ...missing, ...opts])];
        }
        return opts;
    }, [tableOptions, tableSearch, selectedTables]);

    const filteredFieldOptions = React.useMemo(() => {
        const q = fieldSearch.trim().toLowerCase();
        let opts = q ? fieldOptions.filter(f => f.toLowerCase().includes(q)) : [...fieldOptions];
        if (selectedFields && selectedFields.length) {
            const missing = selectedFields.filter(sf => !opts.includes(sf));
            opts = [...new Set([...selectedFields, ...missing, ...opts])];
        }
        return opts;
    }, [fieldOptions, fieldSearch, selectedFields]);

    const clearAllFilters = () => {
        setSelectedTables([]);
        setSelectedFields([]);
        setTableSearch('');
        setFieldSearch('');
        mode === 'I' ? 
        setColumnFilters({ seq: '', table: '', field: '', sourceComp: '', operator: '', value: '', outputValue: '' }) 
        : 
        setColumnFilters({ seq: '', table: '', field: '', customerNo: '', sourceComp: '', operator: '', value: '', outputValue: '' });

    };

    //MARK: Database Calls
    const handleInsert = () => {
        // Persist current selections so Back restores them
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({
                tables: selectedTables,
                fields: selectedFields,
                columnFilters : columnFilters
            }));
        } catch {}

        // Build query string with selected table and field (only when exactly one is selected)
        const params = new URLSearchParams();
        if (selectedTables.length === 1) params.append('table', selectedTables[0]);
        if (selectedFields.length === 1) params.append('field', selectedFields[0]);
        if (Array.isArray(selectedTables)) {
            params.append('searchTable', selectedTables.join(','));
        } else {
            params.append('searchTable', selectedTables);
        }
        if (Array.isArray(selectedFields)) {
            params.append('searchField', selectedFields.join(','));
        } else {
            params.append('searchField', selectedFields);
        }
        params.append('mode', mode);
        params.append('user', currentUser || '');
        mode === 'I' ? 
        navigate(`/TranslationTableInsert${params.toString() ? '?' + params.toString() : ''}`)
        :
        navigate(`/TranslationTableInsert${params.toString() ? '?' + params.toString() : ''}`);
    };

    const handleCopy = (rule) => {
        // Persist current selections so Back restores them
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({
                tables: selectedTables,
                fields: selectedFields,
                columnFilters: columnFilters
            }));
        } catch {}

        // Build query string with rule data for copying
        const params = new URLSearchParams();
        params.append('type', 'copy');
        params.append('table', (selectedTables.length === 1 ? selectedTables[0] : (rule.trns_trns_tbl || "")));
        params.append('seq', rule.trns_seq);
        params.append('field', (selectedFields.length === 1 ? selectedFields[0] : rule.trns_trns_fld));
        if (Array.isArray(selectedTables)) {
            params.append('searchTable', selectedTables.join(','));
        } else {
            params.append('searchTable', selectedTables);
        }
         if (Array.isArray(selectedFields)) {
            params.append('searchField', selectedFields.join(','));
        } else {
            params.append('searchField', selectedFields);
        }
        if(mode === 'O'){
            params.append('cust_no', (rule.trns_cust_no ?? rule.trns_customer_no ?? '').toString());
        }
        params.append('outputType', rule.trns_output_type || '');
        // Handle source component, operator, value, and output value
        if (Array.isArray(rule.trns_source_comp)) {
            params.append('sourceComp', rule.trns_source_comp.join(','));
        } else {
            params.append('sourceComp', rule.trns_source_comp || '');
        }
        if (Array.isArray(rule.trns_operatione)) {
            params.append('operator', rule.trns_operatione.join(','));
        } else {
            params.append('operator', rule.trns_operatione || '');
        }
        if (Array.isArray(rule.trns_value)) {
            params.append('value', JSON.stringify(rule.trns_value));
        } else {
            params.append('value', rule.trns_value || '');
        }
        params.append('outputValue', rule.trns_output_value || '');
        params.append('mode', mode);
        params.append('user', currentUser || '');
        mode === 'I' ?
        navigate(`/TranslationTableInsert?${params.toString()}`)
        :
        navigate(`/TranslationTableInsert?${params.toString()}`);
    };        

    const handleEdit = (rule) => {
        // Persist current selections so Back restores them
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({
                tables: selectedTables,
                fields: selectedFields,
                columnFilters: columnFilters
            }));
        } catch {}

        // Build query string with rule data for editing
        const params = new URLSearchParams();
        params.append('type', 'edit');
        params.append('table', (selectedTables.length === 1 ? selectedTables[0] : (rule.trns_trns_tbl || "")));
        params.append('seq', rule.trns_seq);
        params.append('field', (selectedFields.length === 1 ? selectedFields[0] : rule.trns_trns_fld));
        if (Array.isArray(selectedTables)) {
            params.append('searchTable', selectedTables.join(','));
        } else {
            params.append('searchTable', selectedTables);
        }
         if (Array.isArray(selectedFields)) {
            params.append('searchField', selectedFields.join(','));
        } else {
            params.append('searchField', selectedFields);
        }
        if(mode === 'O'){
            params.append('cust_no', (rule.trns_cust_no ?? rule.trns_customer_no ?? '').toString());
        }
        params.append('outputType', rule.trns_output_type || '');
        if (Array.isArray(rule.trns_source_comp)) {
            params.append('sourceComp', rule.trns_source_comp.join(','));
        } else {
            params.append('sourceComp', rule.trns_source_comp || '');
        }
        if (Array.isArray(rule.trns_operatione)) {
            params.append('operator', rule.trns_operatione.join(','));
        } else {
            params.append('operator', rule.trns_operatione || '');
        }
        if (Array.isArray(rule.trns_value)) {
            params.append('value', JSON.stringify(rule.trns_value));
        } else {
            params.append('value', rule.trns_value || '');
        }
         params.append('mode', mode);
        params.append('user', currentUser || '');
        // Save columnFilters to sessionStorage so they persist when navigating back (already saved above)
        params.append('outputValue', rule.trns_output_value || '');
        mode === 'I' ? navigate(`/TranslationTableInsert?${params.toString()}`) 
        : 
        navigate(`/TranslationTableInsert?${params.toString()}`);
    };

    const handleDelete = (rule) => {
        // Show confirmation dialog
        const confirmDelete = window.confirm(
            `Are you sure you want to delete this rule?\n\nTable: ${(selectedTables.length === 1 ? selectedTables[0] : (rule.trns_trns_tbl || ''))}\nField: ${rule.trns_trns_fld}\nSequence: ${rule.trns_seq}`
        );
        if (!confirmDelete) return;
        const tbl = (selectedTables.length === 1 ? selectedTables[0] : (rule.trns_trns_tbl || ''));
        const deleteUrl = mode === 'I' ? `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/DeleteRule?table=${encodeURIComponent(tbl)}&field=${encodeURIComponent(rule.trns_trns_fld)}&seq=${encodeURIComponent(rule.trns_seq)}` : `https://${process.env.REACT_APP_HOST}:5000/TranslationTable/DeleteRuleOutbound?table=${encodeURIComponent(tbl)}&field=${encodeURIComponent(rule.trns_trns_fld)}&seq=${encodeURIComponent(rule.trns_seq)}&customerNo=${encodeURIComponent(rule.trns_cust_no ?? rule.trns_customer_no ?? '')}`;
        fetch(deleteUrl, { method: 'DELETE' })
            .then(async res => {
                let data; try { data = await res.json(); } catch { data = {}; }
                if (res.ok && data.message && data.message.includes('Rule Deleted')) {
                    alert('Rule deleted successfully');
                    // Refresh rules after delete
                    if (selectedTables && selectedTables.length > 0) {
                        // retrigger the selected-tables load
                        setSelectedTables(prev => [...prev]);
                    } else {
                        // When viewing all tables, re-trigger the all-tables load by updating tableOptions state (no-op assignment)
                        setTableOptions(prev => [...prev]);
                    }
                } else {
                    alert((data && data.error) ? data.error : 'Failed to delete rule');
                }
            })
            .catch(err => {
                alert('Failed to delete rule');
                console.error('Error deleting rule:', err);
            });
    };

    

    const handleExport = () => {
        try {
            let headers, rows;
            
            if (mode === 'I') {
                // Inbound export
                headers = ['Seq','Table','Field','Source Comp','Operator','Value','Output Value','Output Type'];
                rows = (displayedRules || []).map(rule => [
                    rule.trns_seq || '',
                    rule.trns_trns_tbl || '',
                    rule.trns_trns_fld || '',
                    normalizeVal(rule.trns_source_comp),
                    normalizeVal(rule.trns_operatione),
                    normalizeVal(rule.trns_value),
                    rule.trns_output_value || '',
                    rule.trns_output_type || ''
                ]);
            } else {
                // Outbound export with Customer No
                headers = ['Seq','Table','Field','Customer No','Source Comp','Operator','Value','Output Value','Output Type'];
                rows = (displayedRules || []).map( rule => [
                    rule.trns_seq || '',
                    rule.trns_trns_tbl || '',
                    rule.trns_trns_fld || '',
                    (rule.trns_cust_no ?? rule.trns_customer_no ?? ''),
                    normalizeVal(rule.trns_source_comp),
                    normalizeVal(rule.trns_operatione),
                    normalizeVal(rule.trns_value),
                    rule.trns_output_value || '',
                    rule.trns_output_type || ''
                ]);
            }
            
            const csv = '\ufeff' + [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const pad = (n) => String(n).padStart(2, '0');
            const now = new Date();
            const namePart = (selectedTables.length === 1) ? selectedTables[0] : (selectedTables.length > 1 ? 'MultipleTables' : 'AllTables');
            const modePrefix = mode === 'I' ? 'Inbound' : 'Outbound';
            const fileName = `${modePrefix}TranslationRules_${namePart}_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Failed to export');
            console.error('Export error:', e);
        }
    };

    return (
        <div>
            <div style={{ width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
                {mode === 'I' ? <h2>Inbound Translation Rules Home</h2> : <h2>Outbound Translation Rules Home</h2>}

                <TranslationDropdowns
                    selectedTables={selectedTables}
                    selectedFields={selectedFields}
                    filteredTableOptions={filteredTableOptions}
                    filteredFieldOptions={filteredFieldOptions}
                    fieldRuleCounts={fieldRuleCounts}
                    rulesLength={rules.length}
                    onTablesChange={(vals) => { setSelectedTables(vals); setSelectedFields([]); }}
                    onFieldsChange={(vals) => setSelectedFields(vals)}
                />

                <div style={{ width: '90%', maxWidth: '100%', background: '#fafafa', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 16, position: 'relative' }}>
                    <button
                        onClick={handleExport}
                        title="Export to Excel (CSV)"
                        aria-label="Export to CSV"
                        style={{ position: 'absolute', top: 16, right: 112, zIndex: 2, background: 'none', border: 'none', borderRadius: 4, padding: 0, cursor: 'pointer', boxShadow: 'none', lineHeight: 1 }}
                    >
                        <FiDownload size={22} color="#000000ff" />
                    </button>
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        title={showFilters ? 'Hide Filters' : 'Show Filters'}
                        aria-label={showFilters ? 'Hide Filters' : 'Show Filters'}
                        style={{ position: 'absolute', top: 16, right: 64, zIndex: 2, background: 'none', border: 'none', borderRadius: 4, padding: 0, cursor: 'pointer', boxShadow: 'none', lineHeight: 1 }}
                    >
                        <FiFilter size={22} color="#000000ff" />
                    </button>
                    {userGroups.includes(process.env.REACT_APP_ADMIN_GROUP) && 
                    (<button
                        onClick={handleInsert}
                        title="Insert Rule"
                        aria-label="Insert Rule"
                        style={{ position: 'absolute', top: 16, right: 16, zIndex: 2, background: 'none', border: 'none', borderRadius: 4, padding: 0,  cursor: 'pointer', boxShadow: 'none', lineHeight: 1 }}
                    >
                        <FiPlus size={22} color="#000000ff" />
                    </button>)}
                    <h3 style={{ textAlign: 'center', margin: 0, marginBottom: 24, fontSize: 22, fontWeight: 600 }}>Translation Rules</h3>
                    {mode === 'I' && displayedRules && <InboundRulesTable
                        setColumnFilters={setColumnFilters}
                        columnFilters={columnFilters}
                        displayedRules={displayedRules}
                        showFilters={showFilters}
                        clearAllFilters={clearAllFilters}
                        handleInsert={handleInsert}
                        handleEdit={handleEdit}
                        handleCopy={handleCopy}
                        handleDelete={handleDelete}
                    />}
                    {
                        mode === 'O' && displayedRules && <OutboundRulesTable
                            setColumnFilters={setColumnFilters}
                            columnFilters={columnFilters}
                            displayedRules={displayedRules}
                            showFilters={showFilters}
                            clearAllFilters={clearAllFilters}
                            handleInsert={handleInsert}
                            handleEdit={handleEdit}
                            handleCopy={handleCopy}
                            handleDelete={handleDelete}
                        />
                    }

                </div>
            </div>
        </div>
    );
};

export default TranslationHome;
