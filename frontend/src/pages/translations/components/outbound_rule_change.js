import Select from 'react-select';
const OutboundRuleChange = ({ 
    existingRules, 
    handleRuleChange, 
    showExisting,
    form,
    handleSubmit,
    handleBack,
    isEditMode,
    openHelp,
    handleSelectChange,
    handleInputChange,
    tableOptions,
    fieldOptions,
    outputTypeValues,
    rules,
    operators,
    handleRemoveRule,
    handleAddRule
}) => {

return(
    <>
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
                        <h2 style={{margin: 0}}>{ isEditMode ? 'Edit Outbound Table Rule' : 'Insert Outbound Table Rule'}</h2>
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
                                <label htmlFor="trns_cust_no" style={{ marginBottom: 2, fontWeight: 500 }}>
                                    Customer No<span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="trns_cust_no"
                                    name="trns_cust_no"
                                    type="text"
                                    value={form.trns_cust_no}
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
            </>
        );
    };

    export default OutboundRuleChange;