// Import necessary modules and components
import React, { useEffect, useState } from "react";


const TranslationTableRules = () => {

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

    // Rule rows: each is {comp, operator, value}
    const [rules, setRules] = useState([
        { comp: '', operator: '', value: '' }
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
                .then(data => setFieldOptions(data.fields || []))
                .catch(() => setFieldOptions([]));
        } else {
            setFieldOptions([]);
        }
    }, [form.trns_trns_tbl]);

    // Fetch existing translation rules when table or field changes
    useEffect(() => {
        if (form.trns_trns_tbl && form.trns_trns_fld) {
            fetch(`http://localhost:5000/TranslationTable/Rules?table=${encodeURIComponent(form.trns_trns_tbl)}&field=${encodeURIComponent(form.trns_trns_fld)}`)
                .then(res => res.json())
                .then(data => setExistingRules(data.rules || []))
                .catch(() => setExistingRules([]));
        } else {
            setExistingRules([]);
        }
    }, [form.trns_trns_tbl, form.trns_trns_fld]);


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


    // Submit handler
    const handleSubmit = (e) => {
        e.preventDefault();
        // Build arrays from rules
        const trns_source_comp = rules.map(r => r.comp);
        const trns_operatione = rules.map(r => r.operator);
        const trns_value = rules.map(r => r.value);
        // Set audit fields automatically
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const ymd = now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate());
        const hms = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
        const payload = {
            ...form,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_crt_dte: ymd,
            trns_crt_tme: hms,
            // You can set user/pgm fields here if needed
        };
        // TODO: Send payload to backend API
        console.log('Submitting:', payload);
    };

    return (
        <div style={{height: '80vh', width: '100%', zIndex: 5, justifyContent: 'center', alignItems: 'center', display:"flex", flexDirection: 'column'}}>
            <form onSubmit={handleSubmit} style={{width: '600px', background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px #ccc'}}>
                <h2>Insert Translation Table Rule</h2>
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
                    <input name="trns_end_dte" type="date" placeholder="End Date" value={form.trns_end_dte} onChange={handleChange} required style={{flex: '1 1 45%'}} />
                    <input name="trns_seq" placeholder="Sequence (number)" value={form.trns_seq} onChange={handleChange} required style={{flex: '1 1 45%'}} />
                    <input name="trns_strt_dte" type="date" placeholder="Start Date" value={form.trns_strt_dte} onChange={handleChange} style={{flex: '1 1 45%'}} />
                    <input name="trns_output_type" placeholder="Output Type" value={form.trns_output_type} onChange={handleChange} style={{flex: '1 1 45%'}} />
                    <input name="trns_output_value" placeholder="Output Value" value={form.trns_output_value} onChange={handleChange} style={{flex: '1 1 45%'}} />
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
                                    <input value={row.comp} onChange={e => handleRuleChange(idx, 'comp', e.target.value)} style={{width: '100%'}} />
                                </td>
                                <td style={{padding: 4, border: '1px solid #ccc'}}>
                                    <input value={row.operator} onChange={e => handleRuleChange(idx, 'operator', e.target.value)} style={{width: '100%'}} />
                                </td>
                                <td style={{padding: 4, border: '1px solid #ccc'}}>
                                    <input value={row.value} onChange={e => handleRuleChange(idx, 'value', e.target.value)} style={{width: '100%'}} />
                                </td>
                                <td style={{padding: 4, border: '1px solid #ccc', textAlign: 'center'}}>
                                    <button type="button" onClick={() => handleRemoveRule(idx)} disabled={rules.length === 1} style={{background: '#e57373', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: rules.length === 1 ? 'not-allowed' : 'pointer'}}>Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button type="button" onClick={handleAddRule} style={{marginBottom: 16, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 14}}>Add Rule</button>
                <button type="submit" style={{marginTop: 8, width: '100%', padding: 12, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16}}>Insert Rule</button>
            </form>

            {/* Existing rules table */}
            {existingRules.length > 0 && (
                <div style={{width: '600px', marginTop: 32}}>
                    <h3>Existing Translation Rules</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{background: '#f0f0f0'}}>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Seq</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Start Date</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>End Date</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Output Value</th>
                                <th style={{padding: 8, border: '1px solid #ccc'}}>Output Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {existingRules.map((rule, i) => (
                                <tr key={i}>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_seq}</td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_strt_dte}</td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_end_dte}</td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_output_value}</td>
                                    <td style={{padding: 4, border: '1px solid #ccc'}}>{rule.trns_output_type}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TranslationTableRules;