
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const TranslationHome = () => {
    const [tableOptions, setTableOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [selectedField, setSelectedField] = useState("");
    const [rules, setRules] = useState([]);

    // Fetch table names on mount
    useEffect(() => {
        fetch('http://localhost:5000/TranslationTable/Tables')
            .then(res => res.json())
            .then(data => setTableOptions(data.tables || []))
            .catch(() => setTableOptions([]));
    }, []);

    // Fetch field names when table changes
    useEffect(() => {
        if (selectedTable) {
            fetch(`http://localhost:5000/TranslationTable/Tables/${encodeURIComponent(selectedTable)}/Fields`)
                .then(res => res.json())
                .then(data => setFieldOptions(data.fields || []))
                .catch(() => setFieldOptions([]));
        } else {
            setFieldOptions([]);
        }
        setSelectedField("");
    }, [selectedTable]);

    // Fetch rules when table or field changes
    useEffect(() => {
        if (selectedTable) {
            let url = `http://localhost:5000/TranslationTable/Rules?table=${encodeURIComponent(selectedTable)}`;
            // Only add field param if selectedField is non-empty and not just whitespace
            if (selectedField && selectedField.trim() !== "") {
                url += `&field=${encodeURIComponent(selectedField)}`;
            }
            fetch(url)
                .then(res => res.json())
                .then(data => setRules(data.rules || []))
                .catch(() => setRules([]));
        } else {
            setRules([]);
        }
    }, [selectedTable, selectedField]);


    // Compute rule counts per field for dropdown
    const fieldRuleCounts = React.useMemo(() => {
        const counts = {};
        for (const rule of rules) {
            const fld = rule.trns_trns_fld;
            if (fld) counts[fld] = (counts[fld] || 0) + 1;
        }
        return counts;
    }, [rules]);

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
        params.append('table', selectedTable);
        params.append('seq', rule.trns_seq);
        params.append('field', rule.trns_trns_fld);
        
        // Format dates for HTML date inputs (YYYY-MM-DD)
        const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            
            // Convert to string and trim whitespace, then log details for debugging
            const dateString = dateStr.toString().trim();
            
            
            try {
                // If it's already in YYYY-MM-DD format, return as is
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    
                    return dateString;
                }
                
                // If it's in YYYYMMDD format (8 digits), convert to YYYY-MM-DD
                if (/^\d{8}$/.test(dateString)) {
                    
                    return `${dateString.substr(0,4)}-${dateString.substr(4,2)}-${dateString.substr(6,2)}`;
                }
                
                // If it's 7 digits, could be MMDDYYY format (like 1012025 = 01/01/2025)
                if (/^\d{7}$/.test(dateString)) {
                    
                    const month = dateString.substr(0,2);
                    const day = dateString.substr(2,2);
                    const yearPart = dateString.substr(4,3); // 3-digit year like 025
                    
                    // Handle the 3-digit year: 025 should become 2025, 075 should become 2075
                    let fullYear;
                    if (yearPart.startsWith('0')) {
                        // If it starts with 0, it's likely 20XX (025 -> 2025)
                        fullYear = `20${yearPart.substr(1)}`;  // Remove the leading 0 and add 20
                    } else {
                        // Otherwise treat it as 19XX or 20XX based on value
                        const yearNum = parseInt(yearPart);
                        if (yearNum <= 99) {
                            fullYear = yearNum > 50 ? `19${yearPart.substr(-2)}` : `20${yearPart.substr(-2)}`;
                        } else {
                            fullYear = `20${yearPart}`;
                        }
                    }
                    
                    const result = `${fullYear}-${month}-${day}`;
                    console.log(`Parsed as: ${month}/${day}/${fullYear} -> ${result}`);
                    return result;
                }
                
                // If it's 6 digits, could be MMDDYY format
                if (/^\d{6}$/.test(dateString)) {
                    
                    const month = dateString.substr(0,2);
                    const day = dateString.substr(2,2);
                    const year = dateString.substr(4,2);
                    const fullYear = year > 50 ? `19${year}` : `20${year}`;
                    const result = `${fullYear}-${month}-${day}`;
                    console.log(`Parsed as: ${month}/${day}/${fullYear} -> ${result}`);
                    return result;
                }
                
                // Try parsing as a date object
                
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    const result = date.toISOString().split('T')[0];
                    console.log(`Date object result: ${result}`);
                    return result;
                }
                
                console.log('No parsing method worked');
                return '';
            } catch (e) {
                console.warn('Date formatting error:', e);
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
            `Are you sure you want to delete this rule?\n\nTable: ${selectedTable}\nField: ${rule.trns_trns_fld}\nSequence: ${rule.trns_seq}`
        );
        
        if (!confirmDelete) return;

        // Call delete endpoint
        const deleteUrl = `http://localhost:5000/TranslationTable/DeleteRule?table=${encodeURIComponent(selectedTable)}&field=${encodeURIComponent(rule.trns_trns_fld)}&seq=${encodeURIComponent(rule.trns_seq)}`;
        
        fetch(deleteUrl, {
            method: 'DELETE',
        })
        .then(async res => {
            let data;
            try {
                data = await res.json();
            } catch {
                data = {};
            }
            
            if (res.ok && data.message && data.message.includes('Rule Deleted')) {
                alert('Rule deleted successfully');
                // Refresh the rules list by triggering the useEffect
                if (selectedTable) {
                    let url = `http://localhost:5000/TranslationTable/Rules?table=${encodeURIComponent(selectedTable)}`;
                    if (selectedField && selectedField.trim() !== "") {
                        url += `&field=${encodeURIComponent(selectedField)}`;
                    }
                    fetch(url)
                        .then(res => res.json())
                        .then(data => setRules(data.rules || []))
                        .catch(() => setRules([]));
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
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} style={{ minWidth: 180 }}>
                    <option value="" disabled>Select Table</option>
                    {tableOptions.map(tbl => (
                        <option key={tbl} value={tbl}>{tbl}</option>
                    ))}
                </select>
                <select value={selectedField} onChange={e => setSelectedField(e.target.value)} style={{ minWidth: 180 }} disabled={!selectedTable}>
                    <option value="">All Fields</option>
                    {fieldOptions.map(fld => {
                        const count = fieldRuleCounts[fld] || 0;
                        return (
                            <option key={fld} value={fld}>
                                {fld}{count > 0 ? `(${count})` : ''}
                            </option>
                        );
                    })}
                </select>
            </div>
            <div style={{ width: '90%', maxWidth: 900, background: '#fafafa', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 16, position: 'relative' }}>
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
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Field</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Source Comp</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Operator</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Value</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Output Value</th>
                            <th style={{ padding: 8, border: '1px solid #ccc' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 16 }}>No rules found.</td></tr>
                        ) : rules.map((rule, i) => (
                            <tr key={i}>
                                <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_seq}</td>
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
