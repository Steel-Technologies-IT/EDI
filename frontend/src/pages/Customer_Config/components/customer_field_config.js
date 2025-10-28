import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const CustomerFieldConfig = ({ 
    overwritingValues,
    allOverwritingValues,
    handleOverwritingValueChange,
    handleAddOverwritingValue,
    handleDeleteOverwritingValue,
    showPopup,
    handleClosePopup,
    popupLoading,
    snfDecoderData,
    filteredSnfData,
    filters,
    handleFilterChange,
    clearFilters,
    handleSelectSnfItem,
    transactionOptions, // Not used anymore
    branchOptions,
    selectedTransaction,
    selectedBranch,
    styles 
}) => {
    const [decoderTransactions, setDecoderTransactions] = useState([]);

    console.log('CustomerFieldConfig - Props received:', {
        overwritingValues: overwritingValues?.length,
        allOverwritingValues: allOverwritingValues?.length,
        selectedTransaction,
        selectedBranch
    });

    // Extract unique transaction types from decoder data
    useEffect(() => {
        if (snfDecoderData && snfDecoderData.length > 0) {
            const uniqueTransactions = [...new Set(
                snfDecoderData
                    .map(item => item.fieldTransaction)
                    .filter(transaction => transaction && transaction.trim() !== '')
            )].sort();
            
            console.log('Extracted decoder transactions:', uniqueTransactions);
            setDecoderTransactions(uniqueTransactions);
        }
    }, [snfDecoderData]);

    // Keep branch options as before
    const branchSelectOptions = branchOptions.map(option => ({
        value: option.brh_brh,
        label: `${option.brh_brh} - ${option.brh_brh_nm.trim()}`
    }));

    // Add confirmation function for field transaction deletion
    const handleConfirmDeleteOverwritingValue = (overwritingValueId) => {
        const overwritingValue = overwritingValues.find(ov => ov.id === overwritingValueId);
        
        // Create a descriptive message about the field configuration being deleted
        let configDescription = 'this field configuration';
        if (overwritingValue) {
            const parts = [];
            if (overwritingValue.snfCode) {
                parts.push(`SNF Code: ${overwritingValue.snfCode}`);
            }
            if (overwritingValue.snfDescription) {
                parts.push(`Description: ${overwritingValue.snfDescription}`);
            }
            if (overwritingValue.recordCode) {
                parts.push(`Record Code: ${overwritingValue.recordCode}`);
            } else {
                parts.push('Record Code: (none)');
            }
            if (overwritingValue.branch) {
                const branchOption = branchSelectOptions.find(opt => opt.value === overwritingValue.branch);
                parts.push(`Branch: ${branchOption ? branchOption.label : overwritingValue.branch}`);
            } else {
                parts.push('Branch: (none)');
            }
            if (overwritingValue.defaultValue) {
                parts.push(`Default Value: "${overwritingValue.defaultValue}"`);
            }
            if (overwritingValue.overrideValue) {
                parts.push(`Override Value: "${overwritingValue.overrideValue}"`);
            }
            
            if (parts.length > 0) {
                configDescription = parts.join('\n');
            }
        }

        const confirmDelete = window.confirm(
            `Are you sure you want to remove this field configuration?\n\n${configDescription}\n\nThis action cannot be undone.`
        );
        
        if (confirmDelete) {
            handleDeleteOverwritingValue(overwritingValueId);
        }
    };

    // Calculate counts for display
    const totalConfigs = allOverwritingValues?.length || 0;
    const filteredCount = overwritingValues.length;
    const isFiltered = (selectedTransaction && selectedTransaction !== 'ALL') || (selectedBranch && selectedBranch !== 'ALL');

    console.log('CustomerFieldConfig - Display info:', {
        totalConfigs,
        filteredCount,
        isFiltered,
        selectedTransaction,
        selectedBranch,
        decoderTransactions
    });

    // Function to detect potential duplicates
    const getDuplicateWarnings = () => {
        const combinations = new Map();
        const warnings = [];
        
        overwritingValues.forEach((config, index) => {
            const key = `${config.snfCode}-${config.snfDescription}-${config.recordCode || 'empty'}-${config.branch || 'empty'}`;
            
            if (combinations.has(key)) {
                warnings.push({
                    id: config.id,
                    message: `Duplicate: ${config.snfCode} (${config.snfDescription}) with Record Code: ${config.recordCode || '(empty)'}, Branch: ${config.branch || '(empty)'}`
                });
            } else {
                combinations.set(key, index);
            }
        });
        
        return warnings;
    };

    const duplicateWarnings = getDuplicateWarnings();

    return (
        <>
            {/* Overwriting Values Section */}
            <div style={styles.section}>
                <div style={styles.addAddressSection}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '30px',
                        flex: 1
                    }}>
                        <h2 style={styles.sectionTitle}>
                            Field Configuration
                            {isFiltered && (
                                <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                                    {` (${filteredCount} of ${totalConfigs} shown`}
                                    {selectedTransaction && selectedTransaction !== 'ALL' && ` - ${selectedTransaction === '' ? 'Default Transaction (null/empty)' : `Transaction: ${selectedTransaction}`}`}
                                    {selectedBranch && selectedBranch !== 'ALL' && ` - ${selectedBranch === '' ? 'Default Branch (null/empty)' : `Branch: ${selectedBranch}`}`}
                                    {`)`}
                                </span>
                            )}
                        </h2>
                    </div>
                    <button
                        style={{...styles.button, ...styles.addButton}}
                        onClick={handleAddOverwritingValue}
                    >
                        Add Overwriting Value
                    </button>
                </div>

                {/* Show duplicate warnings if any exist */}
                {duplicateWarnings.length > 0 && (
                    <div style={{ 
                        backgroundColor: '#fff3cd', 
                        border: '1px solid #ffeaa7',
                        borderRadius: '4px',
                        padding: '15px',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ Duplicate Configuration Warning</h4>
                        <p style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '14px' }}>
                            The following field configurations have identical Record Code/Branch combinations. 
                            Please ensure each SNF field has unique combinations:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404', fontSize: '13px' }}>
                            {duplicateWarnings.map((warning, index) => (
                                <li key={index}>{warning.message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Existing filtered message */}
                {isFiltered && overwritingValues.length === 0 && totalConfigs > 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        color: '#666', 
                        fontStyle: 'italic', 
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        border: '1px solid #dee2e6',
                        marginTop: '15px'
                    }}>
                        No field configurations match the selected filters:
                        {selectedTransaction && selectedTransaction !== 'ALL' && (
                            <span> {selectedTransaction === '' ? 'Default Transaction (null/empty)' : `Transaction: ${selectedTransaction}`}</span>
                        )}
                        {selectedBranch && selectedBranch !== 'ALL' && selectedTransaction && selectedTransaction !== 'ALL' && <span> and</span>}
                        {selectedBranch && selectedBranch !== 'ALL' && (
                            <span> {selectedBranch === '' ? 'Default Branch (null/empty)' : `Branch: ${selectedBranch}`}</span>
                        )}
                        <br />
                        Total configurations available: {totalConfigs}
                    </div>
                )}

                <div style={styles.overwritingValuesContainer}>
                    {overwritingValues.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Record Code</th>
                                    <th style={styles.th}>SNF Code</th>
                                    <th style={styles.th}>SNF Description</th>
                                    <th style={styles.th}>SNF Position</th>
                                    <th style={styles.th}>SNF Length</th>
                                    <th style={styles.th}>SNF Type</th>
                                    <th style={styles.th}>Branch</th>
                                    <th style={styles.th}>Default Value</th>
                                    <th style={styles.th}>Override Value</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overwritingValues.map((ow) => {
                                    // Get selected branch value
                                    const selectedBranchForOw = branchSelectOptions.find(opt => opt.value === ow.branch) || null;
                                    
                                    // Check if this row is part of a duplicate
                                    const isDuplicate = duplicateWarnings.some(warning => warning.id === ow.id);
                                    const rowStyle = isDuplicate ? 
                                        { backgroundColor: '#fff3cd' } : 
                                        {};
                                    
                                    return (
                                        <tr key={ow.id} style={rowStyle}>
                                            <td style={styles.td}>
                                                <div style={{ 
                                                    padding: '6px 8px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '3px',
                                                    fontSize: '13px',
                                                    fontWeight: 'bold',
                                                    color: '#495057',
                                                    border: '1px solid #dee2e6'
                                                }}>
                                                    {ow.recordCode || '(none)'}
                                                </div>
                                            </td>
                                            <td style={styles.td}>{ow.snfCode}</td>
                                            <td style={styles.td}>
                                                {ow.snfDescription}
                                                {isDuplicate && <span style={{ color: '#856404', fontSize: '12px', marginLeft: '5px' }}>⚠️</span>}
                                            </td>
                                            <td style={styles.td}>{ow.snfPosition}</td>
                                            <td style={styles.td}>{ow.snfLength}</td>
                                            <td style={styles.td}>{ow.snfType}</td>
                                            <td style={styles.td}>
                                                <Select
                                                    placeholder="Select branch"
                                                    isClearable={true}
                                                    onChange={(selectedOption) => handleOverwritingValueChange(ow.id, 'branch', selectedOption ? selectedOption.value : '')}
                                                    value={selectedBranchForOw}
                                                    options={branchSelectOptions}
                                                    styles={{
                                                        control: (base) => ({
                                                            ...base,
                                                            minWidth: 120,
                                                            border: isDuplicate ? '2px solid #ffc107' : '1px solid #ccc',
                                                            borderRadius: 3,
                                                            fontSize: '12px',
                                                            minHeight: '28px'
                                                        }),
                                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                                        menu: (base) => ({ ...base, zIndex: 9999 })
                                                    }}
                                                    menuPortalTarget={document.body}
                                                    menuPosition="fixed"
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="text"
                                                    value={ow.defaultValue}
                                                    onChange={(e) => handleOverwritingValueChange(ow.id, 'defaultValue', e.target.value)}
                                                    style={{
                                                        ...styles.tableInput,
                                                        backgroundColor: ow.overrideValue && ow.overrideValue.trim() !== '' ? '#f8f9fa' : 'white',
                                                        color: ow.overrideValue && ow.overrideValue.trim() !== '' ? '#6c757d' : 'black'
                                                    }}
                                                    placeholder={
                                                        ow.overrideValue && ow.overrideValue.trim() !== '' 
                                                            ? "Override takes precedence" 
                                                            : "Default value"
                                                    }
                                                    disabled={ow.overrideValue && ow.overrideValue.trim() !== ''}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="text"
                                                    value={ow.overrideValue}
                                                    onChange={(e) => handleOverwritingValueChange(ow.id, 'overrideValue', e.target.value)}
                                                    style={styles.tableInput}
                                                    placeholder="Override value"
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <button
                                                    style={{...styles.button, ...styles.deleteButton}}
                                                    onClick={() => handleConfirmDeleteOverwritingValue(ow.id)}
                                                    title="Remove this field configuration"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '40px' }}>
                            {!isFiltered ? (
                                'No field configurations added. Click "Add Overwriting Value" to get started.'
                            ) : (
                                `No field configurations match the current filter settings.`
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Popup for adding new overwriting values - existing code remains the same */}
            {showPopup && (
                <div style={styles.popupOverlay}>
                    <div style={styles.popup}>
                        <div style={styles.popupHeader}>
                            <h2 style={styles.popupTitle}>Select SNF Field to Override</h2>
                            <button style={styles.closeButton} onClick={handleClosePopup}>&times;</button>
                        </div>

                        {/* Filters */}
                        <div style={styles.filtersContainer}>
                            <div style={styles.filtersTitle}>
                                Filter Results
                                <button
                                    style={{...styles.button, ...styles.clearButton}}
                                    onClick={clearFilters}
                                >
                                    Clear All
                                </button>
                            </div>
                            <div style={styles.filtersGrid}>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Field Transaction</label>
                                    <input
                                        type="text"
                                        value={filters.fieldTransaction}
                                        onChange={(e) => handleFilterChange('fieldTransaction', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter by field transaction"
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>SNF Code</label>
                                    <input
                                        type="text"
                                        value={filters.snfCode}
                                        onChange={(e) => handleFilterChange('snfCode', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter by SNF code"
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>SNF Description</label>
                                    <input
                                        type="text"
                                        value={filters.snfDescription}
                                        onChange={(e) => handleFilterChange('snfDescription', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter by description"
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>SNF Position</label>
                                    <input
                                        type="text"
                                        value={filters.snfPosition}
                                        onChange={(e) => handleFilterChange('snfPosition', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter by position"
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>SNF Length</label>
                                    <input
                                        type="text"
                                        value={filters.snfLength}
                                        onChange={(e) => handleFilterChange('snfLength', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter by length"
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>SNF Type</label>
                                    <input
                                        type="text"
                                        value={filters.snfType}
                                        onChange={(e) => handleFilterChange('snfType', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter by type"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {popupLoading ? (
                            <div style={styles.popupLoadingContainer}>
                                <div>Loading SNF decoder data...</div>
                            </div>
                        ) : (
                            <div style={styles.popupTableContainer}>
                                <table style={styles.popupTable}>
                                    <thead>
                                        <tr>
                                            <th style={styles.popupTh}>Field Transaction</th>
                                            <th style={styles.popupTh}>SNF Code</th>
                                            <th style={styles.popupTh}>SNF Description</th>
                                            <th style={styles.popupTh}>Position</th>
                                            <th style={styles.popupTh}>Length</th>
                                            <th style={styles.popupTh}>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSnfData.map((item, index) => (
                                            <tr 
                                                key={index}
                                                style={{
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => handleSelectSnfItem(item)}
                                                onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f8f9fa'}
                                                onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={styles.popupTd}>{item.fieldTransaction}</td>
                                                <td style={styles.popupTd}>{item.snfCode}</td>
                                                <td style={styles.popupTd}>{item.snfDescription}</td>
                                                <td style={styles.popupTd}>{item.snfPosition}</td>
                                                <td style={styles.popupTd}>{item.snfLength}</td>
                                                <td style={styles.popupTd}>{item.snfType}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredSnfData.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        No SNF data matches your current filters.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default CustomerFieldConfig;