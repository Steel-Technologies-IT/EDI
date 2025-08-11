import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const TranslationHome = () => {
    const [tableOptions, setTableOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [selectedField, setSelectedField] = useState("");
    const [rules, setRules] = useState([]);
    // New: search inputs for table and field
    const [tableSearch, setTableSearch] = useState("");
    const [fieldSearch, setFieldSearch] = useState("");

    // Fetch table names on mount
    useEffect(() => {
        fetch('http://az-cld-ivap-d1:5000/TranslationTable/Tables')
            .then(res => res.json())
            .then(data => setTableOptions(data.tables || []))
            .catch(() => setTableOptions([]));
    }, []);

    // Fetch rules based on selectedTable/selectedField. If no table selected, fetch all rules.
    useEffect(() => {
        const fetchForSingleTable = async (table, field) => {
            let url = `http://az-cld-ivap-d1:5000/TranslationTable/Rules?table=${encodeURIComponent(table)}`;
            if (field && field.trim() !== "") url += `&field=${encodeURIComponent(field)}`;
            const res = await fetch(url);
            const data = await res.json();
            // Attach table name to each rule for downstream actions when viewing all tables
            const withTable = (data.rules || []).map(r => ({ ...r, trns_trns_tbl: table }));
            return withTable;
        };

        const load = async () => {
            try {
                if (selectedTable) {
                    // Single table path
                    const list = await fetchForSingleTable(selectedTable, selectedField);
                    setRules(list);
                    // Fetch field options for this table
                    try {
                        const fRes = await fetch(`http://az-cld-ivap-d1:5000/TranslationTable/Tables/${encodeURIComponent(selectedTable)}/Fields`);
                        const fData = await fRes.json();
                        setFieldOptions(fData.fields || []);
                    } catch {
                        setFieldOptions([]);
                    }
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
                if (selectedTable) setFieldOptions([]);
            }
        };

        load();
    }, [selectedTable, selectedField, tableOptions]);

    // Compute rule counts per field for dropdown
    const fieldRuleCounts = React.useMemo(() => {
        const counts = {};
        for (const rule of rules) {
            const fld = rule.trns_trns_fld;
            if (fld) counts[fld] = (counts[fld] || 0) + 1;
        }
        return counts;
    }, [rules]);

    // When viewing all tables, allow client-side field filtering and apply table/field search as LIKE
    const displayedRules = React.useMemo(() => {
        let data = [...rules];
        const tableQ = (tableSearch || '').trim().toLowerCase();
        const fieldQ = (fieldSearch || '').trim().toLowerCase();

        // Table filter: if no explicit table selected, use contains (LIKE '%q%') on table name
        if (!selectedTable && tableQ) {
            data = data.filter(r => (r.trns_trns_tbl || '').toLowerCase().includes(tableQ));
        }

        // Field filter: if a field is selected, use equality; otherwise use contains (LIKE '%q%')
        if (selectedField && selectedField.trim() !== '') {
            data = data.filter(r => r.trns_trns_fld === selectedField);
        } else if (fieldQ) {
            data = data.filter(r => (r.trns_trns_fld || '').toLowerCase().includes(fieldQ));
        }

        return data;
    }, [rules, selectedTable, selectedField, tableSearch, fieldSearch]);

    // Filtered options based on search boxes (keep selected item present)
    const filteredTableOptions = React.useMemo(() => {
        const q = tableSearch.trim().toLowerCase();
        // Use contains to emulate LIKE '%q%'
        let opts = q ? tableOptions.filter(t => t.toLowerCase().includes(q)) : [...tableOptions];
        if (selectedTable && !opts.includes(selectedTable)) {
            opts = [selectedTable, ...opts];
        }
        return opts;
    }, [tableOptions, tableSearch, selectedTable]);

    const filteredFieldOptions = React.useMemo(() => {
        const q = fieldSearch.trim().toLowerCase();
        let opts = q ? fieldOptions.filter(f => f.toLowerCase().includes(q)) : [...fieldOptions];
        if (selectedField && selectedField.trim() !== '' && !opts.includes(selectedField)) {
            opts = [selectedField, ...opts];
        }
        return opts;
    }, [fieldOptions, fieldSearch, selectedField]);

    const navigate = useNavigate();
    const handleInsert = () => {
        // Build query string with selected table and field
        const params = new URLSearchParams();
        if (selectedTable) params.append('table', selectedTable);
        if (selectedField && selectedField.trim() !== "") params.append('field', selectedField);
        navigate(`/TranslationTableInsert${params.toString() ? '?' + params.toString() : ''}`);
    };

    const handleEdit = (rule) => {
        // Build query string with rule data for editing
        const params = new URLSearchParams();
        params.append('mode', 'edit');
        params.append('table', selectedTable || rule.trns_trns_tbl || "");
        params.append('seq', rule.trns_seq);
        params.append('field', rule.trns_trns_fld);
        // Format dates for HTML date inputs (YYYY-MM-DD)
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
        const formattedStartDate = formatDateForInput(rule.trns_strt_dte);
        const formattedEndDate = formatDateForInput(rule.trns_end_dte);
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
            `Are you sure you want to delete this rule?\n\nTable: ${selectedTable || rule.trns_trns_tbl || ''}\nField: ${rule.trns_trns_fld}\nSequence: ${rule.trns_seq}`
        );
        if (!confirmDelete) return;
        const tbl = selectedTable || rule.trns_trns_tbl || '';
        const deleteUrl = `http://az-cld-ivap-d1:5000/TranslationTable/DeleteRule?table=${encodeURIComponent(tbl)}&field=${encodeURIComponent(rule.trns_trns_fld)}&seq=${encodeURIComponent(rule.trns_seq)}`;
        fetch(deleteUrl, { method: 'DELETE' })
            .then(async res => {
                let data; try { data = await res.json(); } catch { data = {}; }
                if (res.ok && data.message && data.message.includes('Rule Deleted')) {
                    alert('Rule deleted successfully');
                    // Refresh rules after delete
                    if (tbl) {
                        let url = `http://az-cld-ivap-d1:5000/TranslationTable/Rules?table=${encodeURIComponent(tbl)}`;
                        if (selectedField && selectedField.trim() !== "") url += `&field=${encodeURIComponent(selectedField)}`;
                        fetch(url)
                            .then(res => res.json())
                            .then(data => setRules((data.rules || []).map(r => ({ ...r, trns_trns_tbl: tbl }))))
                            .catch(() => setRules([]));
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

    return (
        <div style={{ width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
            <h2>Translation Rules Home</h2>
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                {/* Table search + select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Search tables..."
                        style={{ minWidth: 220, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
                    />
                    <select value={selectedTable} onChange={e => { setSelectedTable(e.target.value); setSelectedField(''); }} style={{ minWidth: 220 }}>
                        <option value="">All Tables</option>
                        {filteredTableOptions.map(tbl => (
                            <option key={tbl} value={tbl}>{tbl}</option>
                        ))}
                    </select>
                </div>

                {/* Field search + select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                        type="text"
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder="Search fields..."
                        style={{ minWidth: 220, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
                    />
                    <select value={selectedField} onChange={e => setSelectedField(e.target.value)} style={{ minWidth: 220 }}>
                        <option value="">All Fields</option>
                        {filteredFieldOptions.map(fld => {
                            const count = fieldRuleCounts[fld] || 0;
                            return (
                                <option key={fld} value={fld}>
                                    {fld}{count > 0 ? `(${count})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>
            <div style={{ width: '90%', maxWidth: '100%', background: '#fafafa', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 16, position: 'relative' }}>
                <button
                    onClick={handleInsert}
                    title="Insert"
                    style={{ position: 'absolute', top: 16, right: 16, zIndex: 2, background: '#1976d2', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px #bbb', textAlign: 'center' }}
                >
                    +
                </button>
                <h3 style={{ textAlign: 'center', margin: 0, marginBottom: 24, fontSize: 22, fontWeight: 600 }}>Translation Rules</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Seq</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Table</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Field</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Source Comp</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Operator</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Value</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Output Value</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedRules.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 16 }}>No rules found.</td></tr>
                        ) : displayedRules.map((rule, i) => (
                            <tr key={i}>
                                <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_seq}</td>
                                <td style={{ padding: 4, border: '1px solid #ccc' }}>{selectedTable || rule.trns_trns_tbl || ''}</td>
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
                                        const val = rule.trns_value;
                                        if (Array.isArray(val)) {
                                            if (val.length === 1 && Array.isArray(val[0])) {
                                                return `[${val[0].join(',')}]`;
                                            }
                                            if (val.length > 1 && !val.some(Array.isArray)) {
                                                return val.map((v, i) => <div key={i}>{v}</div>);
                                            }
                                            if (val.some(Array.isArray)) {
                                                return val.map((v, i) => Array.isArray(v) ? `[${v.join(',')}]` : <div key={i}>{v}</div>);
                                            }
                                            if (val.length === 1) {
                                                return val[0];
                                            }
                                            return '';
                                        } else {
                                            return val;
                                        }
                                    })()}
                                </td>
                                <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_output_value}</td>
                                <td style={{ padding: 4, border: '1px solid #ccc', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => handleEdit(rule)}
                                            title="Edit Rule"
                                            style={{
                                                background: '#ff9800',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 4,
                                                padding: '4px 8px',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule)}
                                            title="Delete Rule"
                                            style={{
                                                background: '#f44336',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 4,
                                                padding: '4px 8px',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TranslationHome;
