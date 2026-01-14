import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from 'react-select';
import { FiDownload, FiFilter, FiPlus, FiSave } from 'react-icons/fi';


const RulesSequenceChange = () => {
    const [allRules, setAllRules] = useState([]);
    const [tableOptions, setTableOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [selectedField, setSelectedField] = useState("");
    const [rules, setRules] = useState([]);
    // New: search inputs for table and field
    const [tableSearch, setTableSearch] = useState("");
    const [fieldSearch, setFieldSearch] = useState("");

    // Add state for editing sequence
    const [editedRules, setEditedRules] = useState([]);
    const [originalRules, setOriginalRules] = useState([]);
    const [isDirty, setIsDirty] = useState(false);

    // Fetch all rules on mount
    useEffect(() => {
        fetch(`${process.env.REACT_APP_HOST}/TranslationTable/AllRules`)
            .then(res => res.json())
            .then(data => {
                const rules = data.rules || [];
                setAllRules(rules);
                // Build tableOptions from rules
                const tables = Array.from(new Set(rules.map(r => r.trns_trns_tbl).filter(Boolean)));
                setTableOptions(tables);
            })
            .catch(() => {
                setAllRules([]);
                setTableOptions([]);
            });
    }, []);

    // Update fieldOptions when selectedTable or allRules changes
    useEffect(() => {
        if (selectedTable) {
            const fields = Array.from(new Set(
                allRules.filter(r => r.trns_trns_tbl === selectedTable).map(r => r.trns_trns_fld).filter(Boolean)
            ));
            setFieldOptions(fields);
        } else {
            // All tables: union of all fields
            const fields = Array.from(new Set(allRules.map(r => r.trns_trns_fld).filter(Boolean)));
            setFieldOptions(fields);
        }
    }, [selectedTable, allRules]);

    // Update rules when selectedTable/selectedField changes
    useEffect(() => {
        let filtered = allRules;
        if (selectedTable) {
            filtered = filtered.filter(r => r.trns_trns_tbl === selectedTable);
        }
        if (selectedField) {
            filtered = filtered.filter(r => r.trns_trns_fld === selectedField);
        }
        setRules(filtered);
    }, [selectedTable, selectedField, allRules]);

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
        const deleteUrl = `${process.env.REACT_APP_HOST}/TranslationTable/DeleteRule?table=${encodeURIComponent(tbl)}&field=${encodeURIComponent(rule.trns_trns_fld)}&seq=${encodeURIComponent(rule.trns_seq)}`;
        fetch(deleteUrl, { method: 'DELETE' })
            .then(async res => {
                let data; try { data = await res.json(); } catch { data = {}; }
                if (res.ok && data.message && data.message.includes('Rule Deleted')) {
                    alert('Rule deleted successfully');
                    // Refresh rules after delete
                    if (tbl) {
                        let url = `${process.env.REACT_APP_HOST}/TranslationTable/Rules?table=${encodeURIComponent(tbl)}`;
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


    // Handler for Save button
    const handleSaveSeq = async () => {
        if (!selectedTable || !selectedField) {
            alert('Please select a table and field to update sequence.');
            return;
        }
        try {
            // Find the original sequence number for each rule by matching all fields
            const updates = editedRules.map((r) => {
                // Try to find a rule in originalRules with all fields matching
                const orig = originalRules.find(or =>
                    or.trns_trns_tbl === r.trns_trns_tbl &&
                    or.trns_trns_fld === r.trns_trns_fld &&
                    JSON.stringify(or.trns_source_comp) === JSON.stringify(r.trns_source_comp) &&
                    JSON.stringify(or.trns_operatione) === JSON.stringify(r.trns_operatione) &&
                    JSON.stringify(or.trns_value) === JSON.stringify(r.trns_value) &&
                    or.trns_output_value === r.trns_output_value &&
                    or.trns_output_type === r.trns_output_type
                );
                let oldSeq = r.trns_seq;
                if (orig) {
                    oldSeq = orig.trns_seq;
                }
                return {
                    table: r.trns_trns_tbl,
                    field: r.trns_trns_fld,
                    seq: r.trns_seq,
                    oldSeq
                };
            });
            const res = await fetch(`${process.env.REACT_APP_HOST}/TranslationTable/UpdateSequences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });
            let data;
            let rawText = '';
            try {
                rawText = await res.text();
                try {
                    data = JSON.parse(rawText);
                } catch (jsonErr) {
                    console.error('Failed to parse JSON response:', jsonErr, 'Raw response:', rawText);
                    data = {};
                }
            } catch (err) {
                console.error('Failed to read response text:', err);
                data = {};
            }
            if (res.ok && data.success) {
                alert('Sequences updated successfully!');
                setIsDirty(false);
                // Optionally reload rules
                if (selectedTable && selectedField) {
                    let url = `${process.env.REACT_APP_HOST}/TranslationTable/Rules?table=${encodeURIComponent(selectedTable)}&field=${encodeURIComponent(selectedField)}`;
                    fetch(url)
                        .then(res => res.json())
                        .then(data => setRules((data.rules || []).map(r => ({ ...r, trns_trns_tbl: selectedTable }))))
                        .catch(() => setRules([]));
                }
                setTableOptions(prev => [...prev]);
            } else {
                console.error('Failed to update sequences:', data, updates, 'Raw response:', rawText);
                alert((data && data.error) ? data.error : 'Failed to update sequences.');
            }
        } catch (e) {
            console.error('Exception in handleSaveSeq:', e);
            alert('Failed to update sequences.');
        }
    };

    // Sync editedRules with displayedRules whenever rules change
    useEffect(() => {
        setEditedRules(displayedRules.map(r => ({ ...r })));
        setOriginalRules(displayedRules.map(r => ({ ...r })));
        setIsDirty(false);
    }, [displayedRules]);

    // Drag and drop state
    const [draggedIdx, setDraggedIdx] = useState(null);

    // Drag handlers
    const handleDragStart = (idx) => setDraggedIdx(idx);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (idx) => {
        if (draggedIdx === null || draggedIdx === idx) return;
        setEditedRules(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(draggedIdx, 1);
            updated.splice(idx, 0, moved);
            // Reassign sequence numbers in order (starting from 1)
            return updated.map((r, i) => ({ ...r, trns_seq: i + 1 }));
        });
        setIsDirty(true);
        setDraggedIdx(null);
    };
    const handleDragEnd = () => setDraggedIdx(null);

    return (
        <div style={{ width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
            <h2>Change Sequence Order</h2>
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                {/* Table search + select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    
                    <Select
                        placeholder={<div>Select a translation table...</div>}
                        onChange={option => { setSelectedTable(option.value); setSelectedField(''); }}
                        options={filteredTableOptions.map(tbl => ({ value: tbl, label: tbl }))}
                        styles={{
                            control: (base) => ({
                                ...base,
                                minWidth: 220,
                                border: '1px solid #ccc',
                                borderRadius: 4,
                                padding: '6px 10px',
                            }),
                        }}
                    />

                </div>

                {/* Field search + select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Select
                        key={`fld-${selectedTable}-${rules.length}`}
                        placeholder={selectedTable ? `Select a field in ${selectedTable}...` : 'Select a field...'}
                        options={filteredFieldOptions.map(fld => ({ value: fld }))}
                        getOptionLabel={(opt) => `${opt.value}${fieldRuleCounts[opt.value] ? ` (${fieldRuleCounts[opt.value]})` : ''}`}
                        styles={{ control: (base) => ({ ...base, minWidth: 220, border: '1px solid #ccc', borderRadius: 4, padding: '6px 10px' }) }}
                        onChange={option => setSelectedField(option ? option.value : '')}
                        value={selectedField ? { value: selectedField } : null}
                    />
                    
                </div>
            </div>
            <div style={{ width: '90%', maxWidth: '100%', background: '#fafafa', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 16, position: 'relative' }}>
                {/* Save button for sequence changes */}
                <button
                    onClick={handleSaveSeq}
                    disabled={!isDirty || !selectedTable || !selectedField}
                    style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, color: 'black', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 600, cursor: isDirty && selectedTable && selectedField ? 'pointer' : 'not-allowed', background: 'transparent' }}
                >
                    <FiSave size={22} color="#000000ff"/>
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
                        {(!selectedTable || !selectedField) ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 16 }}>
                                {(!selectedTable && !selectedField) ? 'Please select a table and field.' : (!selectedTable ? 'Please select a table.' : 'Please select a field.')}
                            </td></tr>
                        ) : editedRules.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 16 }}>No rules set, would you like to <p1 style={{ cursor: 'pointer', color: '#1976d2' }} onClick={handleInsert}>add one</p1>?</td></tr>
                        ) : (
                            editedRules.map((rule, i) => (
                                <tr
                                    key={i}
                                    draggable
                                    onDragStart={() => handleDragStart(i)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(i)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        background: draggedIdx === i ? '#e3f2fd' : (i % 2 === 0 ? '#fff' : '#f8f9fa'),
                                        opacity: draggedIdx === i ? 0.6 : 1
                                    }}
                                >
                                    <td style={{ padding: 4, border: '1px solid #ccc', cursor: 'grab', fontWeight: 600 }} title="Drag to reorder">
                                        {(() => {
                                            const orig = originalRules.find(or =>
                                                or.trns_trns_tbl === rule.trns_trns_tbl &&
                                                or.trns_trns_fld === rule.trns_trns_fld &&
                                                JSON.stringify(or.trns_source_comp) === JSON.stringify(rule.trns_source_comp) &&
                                                JSON.stringify(or.trns_operatione) === JSON.stringify(rule.trns_operatione) &&
                                                JSON.stringify(or.trns_value) === JSON.stringify(rule.trns_value) &&
                                                or.trns_output_value === rule.trns_output_value &&
                                                or.trns_output_type === rule.trns_output_type
                                            );
                                            if (orig && Number(orig.trns_seq) !== Number(rule.trns_seq)) {
                                                return <><span>{rule.trns_seq}</span><span style={{ color: '#bdb800', marginLeft: 4 }} title="Original sequence">({orig.trns_seq})</span></>;
                                            } else {
                                                return <span>{rule.trns_seq}</span>;
                                            }
                                        })()}
                                    </td>
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RulesSequenceChange;
