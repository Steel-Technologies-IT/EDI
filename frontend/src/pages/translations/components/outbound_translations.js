import React from 'react';
import { FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';
import { FcClearFilters } from "react-icons/fc";

const FILTER_ROW_HEIGHT = 40; // Define this constant

export default function OutboundTranslations({
    setColumnFilters,
    columnFilters,
    displayedRules = [], // Add default empty array
    showFilters,
    clearAllFilters,
    handleInsert,
    handleEdit,
    handleCopy,
    handleDelete
}) {
    
    
    return (
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
                                aria-label="Filter Customer No"
                                value={columnFilters.customerNo}
                                onChange={(e) => setColumnFilters(cf => ({ ...cf, customerNo: e.target.value }))}
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
                    <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Customer No</th>
                    <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Source Comp</th>
                    <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Operator</th>
                    <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Value</th>
                    <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Output Value</th>
                    <th style={{ padding: 8, border: '1px solid #ccc', borderTop: 0, position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, background: '#f0f0f0', zIndex: 5 }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {(!displayedRules || displayedRules.length === 0) ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 16 }}>No rules set, would you like to <span style={{ cursor: 'pointer', color: '#1976d2' }} onClick={handleInsert}>add one</span>?</td></tr>
                ) : displayedRules.map((rule, i) => (
                    <tr key={i}>
                        <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_seq}</td>
                        <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_trns_tbl || ''}</td>
                        <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_trns_fld}</td>
                        <td style={{ padding: 4, border: '1px solid #ccc' }}>{rule.trns_cust_no ?? rule.trns_customer_no ?? ''}</td>
                        <td style={{ padding: 4, border: '1px solid #ccc' }}>
                            {Array.isArray(rule.trns_source_comp)
                                ? rule.trns_source_comp.map((v, idx) => (<div key={idx}>{v}</div>))
                                : rule.trns_source_comp}
                        </td>
                        <td style={{ padding: 4, border: '1px solid #ccc' }}>
                            {Array.isArray(rule.trns_operatione)
                                ? rule.trns_operatione.map((v, idx) => (<div key={idx}>{v}</div>))
                                : rule.trns_operatione}
                        </td>
                       <td style={{
    padding: 4, 
    border: '1px solid #ccc',
    maxWidth: '150px',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    fontFamily: 'monospace',
    fontSize: '13px'
}}>
    {(() => {
        let val = rule.trns_value;
        
        // Convert to string if it's not already
        if (Array.isArray(val)) {
            val = val.join(',');
        }
        
        val = String(val || '');
        
        // Function to format array-like strings with line breaks
        const formatArrayString = (str, itemsPerLine = 4) => {
            let content = str;
            let startChar = '[';
            let endChar = ']';
            
            // Handle both [] and {} formats
            if (str.startsWith('[') && str.endsWith(']')) {
                content = str.slice(1, -1);
            } else if (str.startsWith('{') && str.endsWith('}')) {
                content = str.slice(1, -1);
            } else {
                return <span>{str}</span>; // Return as JSX if not array format
            }
            
            // Split by comma and clean up
            const items = content.split(',').map(item => item.trim()).filter(item => item.length > 0);
            
            if (items.length === 0) return <span>{str}</span>;
            
            // Group items into lines
            const lines = [];
            for (let i = 0; i < items.length; i += itemsPerLine) {
                const lineItems = items.slice(i, i + itemsPerLine);
                lines.push(lineItems.join(','));
            }
            
            // Render as JSX with actual line breaks
            return (
                <div>
                    <span>{startChar}</span>
                    {lines.map((line, index) => (
                        <div key={index} style={{ display: 'inline' }}>
                            {index > 0 && <br />}
                            {line}
                            {index < lines.length - 1 ? ',' : ''}
                        </div>
                    ))}
                    <span>{endChar}</span>
                </div>
            );
        };
        
        return formatArrayString(val, 4); // 4 items per line
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
    );
}

