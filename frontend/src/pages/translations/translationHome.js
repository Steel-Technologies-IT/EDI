//Imports
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Select from 'react-select';
import { FiDownload, FiFilter, FiPlus, FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';
import { FcClearFilters } from "react-icons/fc";
import { stringifyForFilter, stringifyTrnsValue, formatDateForInput, csvEscape, normalizeVal } from '../../functions/helpers';
import TranslationDropdowns from './components/translation_dropdowns';


const TranslationHome = () => {
    //Declare Variables
    const navigate = useNavigate();
    const location = useLocation();
    const [tableOptions, setTableOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);
    const [selectedTables, setSelectedTables] = useState([]); 
    const [selectedFields, setSelectedFields] = useState([]);
    const [rules, setRules] = useState([]);
    const [tableSearch, setTableSearch] = useState("");
    const [fieldSearch, setFieldSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState({
        seq: '',
        table: '',
        field: '',
        sourceComp: '',
        operator: '',
        value: '',
        outputValue: ''
    });
    const [showFilters, setShowFilters] = useState(true);
    const FILTER_ROW_HEIGHT = 40; // px

    


    // #region Fetch On Mounts
    // Fetch table names on mount
    useEffect(() => {
        fetch('https://az-cld-ivap-d1:5000/TranslationTable/Tables')
            .then(res => res.json())
            .then(data => setTableOptions(data.tables || []))
            .catch(() => setTableOptions([]));
    }, []);

    // Fetch rules based on selectedTables/selectedFields. If no table selected, fetch all rules.
    useEffect(() => {
        const fetchForSingleTable = async (table, field) => {
            let url = `https://az-cld-ivap-d1:5000/TranslationTable/Rules?table=${encodeURIComponent(table)}`;
            if (field && field.trim() !== "") url += `&field=${encodeURIComponent(field)}`;
            const res = await fetch(url);
            const data = await res.json();
            // Attach table name to each rule for downstream actions when viewing all tables
            const withTable = (data.rules || []).map(r => ({ ...r, trns_trns_tbl: table }));
            return withTable;
        };

        const load = async () => {
            try {
                if (selectedTables && selectedTables.length > 0) {
                    // Multiple (or single) selected tables path: fetch each table (without field filter) and combine
                    const results = await Promise.all(
                        selectedTables.map(tbl => fetchForSingleTable(tbl, ""))
                    );
                    const combined = results.flat();
                    // If specific fields selected, filter client-side
                    const filteredByFields = (selectedFields && selectedFields.length > 0)
                        ? combined.filter(r => selectedFields.includes(r.trns_trns_fld))
                        : combined;
                    setRules(filteredByFields);

                    // Compute union of fields across the selected tables for the field dropdown
                    const uniqueFields = Array.from(new Set(combined.map(r => r.trns_trns_fld).filter(Boolean)));
                    setFieldOptions(uniqueFields);
                } else if (tableOptions.length > 0) {
                    // All tables path: fetch rules for every table in parallel
                    const results = await Promise.all(
                        tableOptions.map(tbl => fetchForSingleTable(tbl, ""))
                    );
                    const combined = results.flat();
                    setRules(combined);
                    // Compute union of fields across all rules for the field filter
                    const uniqueFields = Array.from(new Set(combined.map(r => r.trns_trns_fld).filter(Boolean)));
                    setFieldOptions(uniqueFields);
                } else {
                    // No tables loaded yet
                    setRules([]);
                    setFieldOptions([]);
                }
            } catch (e) {
                setRules([]);
                if (selectedTables && selectedTables.length > 0) setFieldOptions([]);
            }
        };

        load();
    }, [selectedTables, selectedFields, tableOptions]);

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

        // 1) Prefer sessionStorage (we explicitly saved current selections before navigating)
        try {
            const raw = sessionStorage.getItem('TranslationHomeReturn');
            if (raw) {
                const data = JSON.parse(raw);
                console.log(data)
                if (data && typeof data === 'object') {
                    const tables = toArray(data.tables) ?? toArray(data.prevTables) ?? toArray(data.prevTable);
                    const fields = toArray(data.fields) ?? toArray(data.prevFields) ?? toArray(data.prevField);
                    if (tables) setSelectedTables(tables);
                    if (fields) setSelectedFields(fields);
                    console.log(tables, fields)
                }
                sessionStorage.removeItem('TranslationHomeReturn');
                return; // stop here so location.state doesn't override
            }
        } catch {}

        // 2) Fallback to location.state, but only accept explicit prev* keys (avoid Insert page search params like 'table')
        const st = (location && location.state) ? location.state : null;
        if (st && typeof st === 'object') {
            const tables = toArray(st.prevTables) ?? toArray(st.prevTable);
            const fields = toArray(st.prevFields) ?? toArray(st.prevField);
            if ((tables && tables.length) || (fields && fields.length)) {
                if (tables) setSelectedTables(tables);
                if (fields) setSelectedFields(fields);
                try { navigate('.', { replace: true, state: null }); } catch {}
                return;
            }
        }
    }, [location.key]);
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
        const tableQ = (tableSearch || '').trim().toLowerCase();
        const fieldQ = (fieldSearch || '').trim().toLowerCase();

        if (!selectedTables.length && tableQ) {
            data = data.filter(r => (r.trns_trns_tbl || '').toLowerCase().includes(tableQ));
        } else if (selectedTables.length) {
            data = data.filter(r => selectedTables.includes(r.trns_trns_tbl));
        }

        if (selectedFields && selectedFields.length > 0) {
            data = data.filter(r => selectedFields.includes(r.trns_trns_fld));
        } else if (fieldQ) {
            data = data.filter(r => (r.trns_trns_fld || '').toLowerCase().includes(fieldQ));
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

        if (seqNeedle || tableNeedle || fieldNeedle || srcNeedle || opNeedle || valNeedle || outValNeedle) {
            data = data.filter(r => {
                const seqStr = stringifyForFilter(r.trns_seq).toLowerCase();
                const tableStr = stringifyForFilter(r.trns_trns_tbl || '').toLowerCase();
                const fieldStr = stringifyForFilter(r.trns_trns_fld).toLowerCase();
                const srcStr = stringifyForFilter(r.trns_source_comp).toLowerCase();
                const opStr = stringifyForFilter(r.trns_operatione).toLowerCase();
                const valStr = stringifyTrnsValue(r.trns_value).toLowerCase();
                const outValStr = stringifyForFilter(r.trns_output_value).toLowerCase();

                return (
                    (!seqNeedle || like(seqNeedle, seqStr)) && (!tableNeedle || like(tableNeedle, tableStr)) && (!fieldNeedle || like(fieldNeedle, fieldStr)) && (!srcNeedle || like(srcNeedle, srcStr)) && (!opNeedle || like(opNeedle, opStr)) && (!valNeedle || like(valNeedle, valStr)) &&(!outValNeedle || like(outValNeedle, outValStr))
                );
            });
        }

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
        setColumnFilters({ seq: '', table: '', field: '', sourceComp: '', operator: '', value: '', outputValue: '' });
    };

    //MARK: Database Calls
    const handleInsert = () => {
        // Persist current selections so Back restores them
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({ tables: selectedTables, fields: selectedFields }));
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

        navigate(`/TranslationTableInsert${params.toString() ? '?' + params.toString() : ''}`);
    };

    const handleCopy = (rule) => {
        // Persist current selections so Back restores them
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({ tables: selectedTables, fields: selectedFields }));
        } catch {}

        // Build query string with rule data for copying
        const params = new URLSearchParams();
        const formattedStartDate = formatDateForInput(rule.trns_strt_dte);
        const formattedEndDate = formatDateForInput(rule.trns_end_dte);

        params.append('mode', 'copy');
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
        params.append('startDate', formattedStartDate);
        params.append('endDate', formattedEndDate);
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

        navigate(`/TranslationTableInsert?${params.toString()}`);
    };        

    const handleEdit = (rule) => {
        // Persist current selections so Back restores them
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({ tables: selectedTables, fields: selectedFields }));
        } catch {}

        // Build query string with rule data for editing
        const params = new URLSearchParams();
        const formattedStartDate = formatDateForInput(rule.trns_strt_dte);
        const formattedEndDate = formatDateForInput(rule.trns_end_dte);
        params.append('mode', 'edit');
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
        params.append('startDate', formattedStartDate);
        params.append('endDate', formattedEndDate);
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
        params.append('outputValue', rule.trns_output_value || '');
        navigate(`/TranslationTableInsert?${params.toString()}`);
    };

    const handleDelete = (rule) => {
        // Show confirmation dialog
        const confirmDelete = window.confirm(
            `Are you sure you want to delete this rule?\n\nTable: ${(selectedTables.length === 1 ? selectedTables[0] : (rule.trns_trns_tbl || ''))}\nField: ${rule.trns_trns_fld}\nSequence: ${rule.trns_seq}`
        );
        if (!confirmDelete) return;
        const tbl = (selectedTables.length === 1 ? selectedTables[0] : (rule.trns_trns_tbl || ''));
        const deleteUrl = `https://az-cld-ivap-d1:5000/TranslationTable/DeleteRule?table=${encodeURIComponent(tbl)}&field=${encodeURIComponent(rule.trns_trns_fld)}&seq=${encodeURIComponent(rule.trns_seq)}`;
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
            const headers = ['Seq','Table','Field','Source Comp','Operator','Value','Output Value','Output Type','Start Date','End Date'];
            const rows = (displayedRules || []).map(rule => [
                rule.trns_seq || '',
                rule.trns_trns_tbl || '',
                rule.trns_trns_fld || '',
                normalizeVal(rule.trns_source_comp),
                normalizeVal(rule.trns_operatione),
                normalizeVal(rule.trns_value),
                rule.trns_output_value || '',
                rule.trns_output_type || '',
                rule.trns_strt_dte || '',
                rule.trns_end_dte || ''
            ]);

            const csv = '\ufeff' + [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const pad = (n) => String(n).padStart(2, '0');
            const now = new Date();
            const namePart = (selectedTables.length === 1) ? selectedTables[0] : (selectedTables.length > 1 ? 'MultipleTables' : 'AllTables');
            const fileName = `TranslationRules_${namePart}_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
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
                <h2>Translation Rules Home</h2>

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
                    <button
                        onClick={handleInsert}
                        title="Insert Rule"
                        aria-label="Insert Rule"
                        style={{ position: 'absolute', top: 16, right: 16, zIndex: 2, background: 'none', border: 'none', borderRadius: 4, padding: 0,  cursor: 'pointer', boxShadow: 'none', lineHeight: 1 }}
                    >
                        <FiPlus size={22} color="#000000ff" />
                    </button>
                    <h3 style={{ textAlign: 'center', margin: 0, marginBottom: 24, fontSize: 22, fontWeight: 600 }}>Translation Rules</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            {showFilters && (
                            <tr>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                                    <input
                                        aria-label="Filter Seq"
                                        value={columnFilters.seq}
                                        onChange={(e) => setColumnFilters(cf => ({ ...cf, seq: e.target.value }))}
                                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                    />
                                </th>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                                    <input
                                        aria-label="Filter Table"
                                        value={columnFilters.table}
                                        onChange={(e) => setColumnFilters(cf => ({ ...cf, table: e.target.value }))}
                                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                    />
                                </th>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                                    <input
                                        aria-label="Filter Field"
                                        value={columnFilters.field}
                                        onChange={(e) => setColumnFilters(cf => ({ ...cf, field: e.target.value }))}
                                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                    />
                                </th>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                                    <input
                                        aria-label="Filter Source Comp"
                                        value={columnFilters.sourceComp}
                                        onChange={(e) => setColumnFilters(cf => ({ ...cf, sourceComp: e.target.value }))}
                                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                    />
                                </th>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                                    <input
                                        aria-label="Filter Operator"
                                        value={columnFilters.operator}
                                        onChange={(e) => setColumnFilters(cf => ({ ...cf, operator: e.target.value }))}
                                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                    />
                                </th>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                                    <input
                                        aria-label="Filter Value"
                                        value={columnFilters.value}
                                        onChange={(e) => setColumnFilters(cf => ({ ...cf, value: e.target.value }))}
                                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                    />
                                </th>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                                    <input
                                        aria-label="Filter Output Value"
                                        value={columnFilters.outputValue}
                                        onChange={(e) => setColumnFilters(cf => ({ ...cf, outputValue: e.target.value }))}
                                        style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                    />
                                </th>
                                <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => clearAllFilters()}
                                        title={'Clear Filters'}
                                        aria-label={'Clear Filters'}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <FcClearFilters size={22} color="#000000ff" />
                                    </button>
                                </th> 
                            </tr>
                            )}
                            <tr style={{ background: '#f0f0f0' }}>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Seq</th>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Table</th>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Field</th>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Source Comp</th>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Operator</th>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Value</th>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Output Value</th>
                                <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedRules.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 16 }}>No rules set, would you like to <p1 style={{ cursor: 'pointer', color: '#1976d2' }} onClick={handleInsert}>add one</p1>?</td></tr>
                            ) : displayedRules.map((rule, i) => (
                                <tr key={i}>
                                    <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_seq}</td>
                                    <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_trns_tbl || ''}</td>
                                    <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_trns_fld}</td>
                                    <td style={{ padding: 4, border: '1px solid #ccc' }}>
                                        {Array.isArray(rule.trns_source_comp)
                                            ? rule.trns_source_comp.map((v, idx) => (
                                                <div key={idx}>{v}</div>
                                            ))
                                            : rule.trns_source_comp}
                                    </td>
                                    <td style={{ padding: 4, border: '1px solid #ccc' }}>
                                        {Array.isArray(rule.trns_operatione)
                                            ? rule.trns_operatione.map((v, idx) => (
                                                <div key={idx}>{v}</div>
                                            ))
                                            : rule.trns_operatione}
                                    </td>
                                    <td style={{ padding: 4, border: '1px solid #ccc' }}>
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
                                                if (val.length === 1 && Array.isArray(val[0])) {
                                                    return `[${val[0].join(',')}]`;
                                                }
                                                if (val.length > 1 && !val.some(Array.isArray)) {
                                                    return val.map((v, i) => renderVal(v, i));
                                                }
                                                if (val.some(Array.isArray)) {
                                                    return val.map((v, i) => Array.isArray(v) ? `[${v.join(',')}]` : renderVal(v, i));
                                                }
                                                if (val.length === 1) {
                                                    return prettyBraceString(val[0]);
                                                }
                                                return '';
                                            } else {
                                                return prettyBraceString(val);
                                            }
                                        })()}
                                    </td>
                                    <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_output_value}</td>
                                    <td style={{ padding: 4, border: '1px solid #ccc', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => handleEdit(rule)}
                                                title="Edit Rule"
                                                aria-label="Edit Rule"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <FiEdit2 size={18} color="#000000ff" />
                                            </button>
                                            <button
                                                onClick={() => handleCopy(rule)}
                                                title="Copy Rule"
                                                aria-label="Copy Rule"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <FiCopy size={18} color="#000000ff" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule)}
                                                title="Delete Rule"
                                                aria-label="Delete Rule"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <FiTrash2 size={18} color="#000000ff" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TranslationHome;
