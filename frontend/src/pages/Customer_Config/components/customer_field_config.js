import React from 'react';
import Select from 'react-select';

const CustomerFieldConfig = ({ 
    overwritingValues,
    allOverwritingValues, // Add this prop
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
    gsReceiverId,
    handleGsReceiverIdChange,
    transactionOptions = [],
    branchOptions = [],
    selectedTransaction, // Add this prop
    selectedBranch, // Add this prop
    styles 
}) => {
    // Prepare options for react-select with safety checks
    const transactionSelectOptions = (transactionOptions || []).map(option => ({
        value: option.value || option.transaction_type,
        label: option.label || option.transaction_description || option.value || option.transaction_type
    }));

    const branchSelectOptions = (branchOptions || []).map(option => ({
        value: option.brh_brh,
        label: `${option.brh_brh} - ${option.brh_brh_nm ? option.brh_brh_nm.trim() : ''}`
    }));

    // Calculate filtered counts for display
    const totalConfigs = allOverwritingValues?.length || 0;
    const filteredCount = overwritingValues.length;
    const isFiltered = selectedTransaction || selectedBranch;

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
                                    {` (${filteredCount} of ${totalConfigs} shown - filtered by ${selectedTransaction ? 'transaction' : ''}${selectedTransaction && selectedBranch ? ' and ' : ''}${selectedBranch ? 'branch' : ''})`}
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
                
                {/* GS Receiver ID section remains the same */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <label style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333',
                        margin: 0,
                        whiteSpace: 'nowrap'
                    }}>
                        GS Receiver ID:
                    </label>
                    <input
                        type="text"
                        value={gsReceiverId || ''}
                        onChange={(e) => handleGsReceiverIdChange(e.target.value)}
                        style={{
                            ...styles.input,
                            width: '200px',
                            fontSize: '14px',
                            padding: '8px',
                            margin: 0
                        }}
                        placeholder="Enter GS Receiver ID"
                        maxLength={15}
                    />
                </div>

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
                        No field configurations match the selected transaction ({selectedTransaction}) and branch ({selectedBranch}) filters.
                        <br />
                        Total configurations available: {totalConfigs}
                    </div>
                )}

                {overwritingValues.length > 0 ? (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Field Transaction</th>
                                <th style={styles.th}>SNF Code</th>
                                <th style={styles.th}>SNF Description</th>
                                <th style={styles.th}>Position</th>
                                <th style={styles.th}>Length</th>
                                <th style={styles.th}>Type</th>
                                <th style={styles.th}>Default Value</th>
                                <th style={styles.th}>Override Value</th>
                                <th style={styles.th}>Transaction</th>
                                <th style={styles.th}>Branch</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overwritingValues.map((overwriting) => {
                                // Check if override value exists and is not empty
                                const hasOverrideValue = overwriting.overrideValue && overwriting.overrideValue.trim() !== '';
                                
                                // Safely find selected values
                                const selectedTransaction = transactionSelectOptions.find(opt => opt.value === overwriting.transaction) || null;
                                const selectedBranch = branchSelectOptions.find(opt => opt.value === overwriting.branch) || null;
                                
                                return (
                                    <tr key={overwriting.id}>
                                        <td style={styles.td}>{overwriting.recordCode}</td>
                                        <td style={styles.td}>{overwriting.snfCode}</td>
                                        <td style={styles.td}>{overwriting.snfDescription}</td>
                                        <td style={styles.td}>{overwriting.snfPosition}</td>
                                        <td style={styles.td}>{overwriting.snfLength}</td>
                                        <td style={styles.td}>{overwriting.snfType}</td>
                                        <td style={styles.td}>
                                            <input
                                                type="text"
                                                value={overwriting.defaultValue}
                                                onChange={(e) => handleOverwritingValueChange(overwriting.id, 'defaultValue', e.target.value)}
                                                style={{
                                                    ...styles.tableInput,
                                                    backgroundColor: hasOverrideValue ? '#f8f9fa' : 'white',
                                                    color: hasOverrideValue ? '#6c757d' : 'inherit',
                                                    cursor: hasOverrideValue ? 'not-allowed' : 'text'
                                                }}
                                                placeholder={hasOverrideValue ? "Override value takes precedence" : "Default value"}
                                                disabled={hasOverrideValue}
                                            />
                                        </td>
                                        <td style={styles.td}>
                                            <input
                                                type="text"
                                                value={overwriting.overrideValue}
                                                onChange={(e) => handleOverwritingValueChange(overwriting.id, 'overrideValue', e.target.value)}
                                                style={styles.tableInput}
                                                placeholder="Override value"
                                            />
                                        </td>
                                        <td style={styles.td}>
                                            <Select
                                                placeholder="Select transaction"
                                                isClearable
                                                onChange={(selectedOption) => handleOverwritingValueChange(overwriting.id, 'transaction', selectedOption ? selectedOption.value : '')}
                                                value={selectedTransaction}
                                                options={transactionSelectOptions}
                                                styles={{
                                                    control: (base) => ({
                                                        ...base,
                                                        border: '1px solid #ccc',
                                                        borderRadius: 3,
                                                        fontSize: '13px',
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
                                            <Select
                                                placeholder="Select branch"
                                                isClearable
                                                onChange={(selectedOption) => handleOverwritingValueChange(overwriting.id, 'branch', selectedOption ? selectedOption.value : '')}
                                                value={selectedBranch}
                                                options={branchSelectOptions}
                                                styles={{
                                                    control: (base) => ({
                                                        ...base,
                                                        border: '1px solid #ccc',
                                                        borderRadius: 3,
                                                        fontSize: '13px',
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
                                            <button
                                                style={{...styles.button, ...styles.deleteButton}}
                                                onClick={() => handleDeleteOverwritingValue(overwriting.id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : !isFiltered ? (
                    <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '40px' }}>
                        No overwriting values configured. Click "Add Overwriting Value" to get started.
                    </div>
                ) : null}
            </div>

            {/* SNF Decoder Popup with separate filter boxes */}
            {showPopup && (
                <div style={styles.popupOverlay}>
                    <div style={styles.popup}>
                        <div style={styles.popupHeader}>
                            <h3 style={styles.popupTitle}>Select SNF Decoder Entry</h3>
                            <button 
                                style={styles.closeButton} 
                                onClick={handleClosePopup}
                            >
                                ×
                            </button>
                        </div>

                        {/* Separate filter boxes for each field */}
                        <div style={styles.filtersContainer}>
                            <div style={styles.filtersTitle}>
                                <span>Filter Results</span>
                                <button
                                    style={{...styles.button, ...styles.clearButton}}
                                    onClick={clearFilters}
                                >
                                    Clear All Filters
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
                                        placeholder="Filter..."
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>SNF Code</label>
                                    <input
                                        type="text"
                                        value={filters.snfCode}
                                        onChange={(e) => handleFilterChange('snfCode', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter..."
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Description</label>
                                    <input
                                        type="text"
                                        value={filters.snfDescription}
                                        onChange={(e) => handleFilterChange('snfDescription', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter..."
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Position</label>
                                    <input
                                        type="text"
                                        value={filters.snfPosition}
                                        onChange={(e) => handleFilterChange('snfPosition', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter..."
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Length</label>
                                    <input
                                        type="text"
                                        value={filters.snfLength}
                                        onChange={(e) => handleFilterChange('snfLength', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter..."
                                    />
                                </div>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Type</label>
                                    <input
                                        type="text"
                                        value={filters.snfType}
                                        onChange={(e) => handleFilterChange('snfType', e.target.value)}
                                        style={styles.filterInput}
                                        placeholder="Filter..."
                                    />
                                </div>
                            </div>
                        </div>

                        {popupLoading ? (
                            <div style={styles.popupLoadingContainer}>
                                Loading SNF decoder data...
                            </div>
                        ) : (
                            <div style={styles.popupTableContainer}>
                                <table style={styles.popupTable}>
                                    <thead>
                                        <tr>
                                            <th style={styles.popupTh}>Field Transaction</th>
                                            <th style={styles.popupTh}>SNF Code</th>
                                            <th style={styles.popupTh}>Description</th>
                                            <th style={styles.popupTh}>Position</th>
                                            <th style={styles.popupTh}>Length</th>
                                            <th style={styles.popupTh}>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSnfData.map((item, index) => {
                                            // Check if this item is already selected based on all primary key fields
                                            const isAlreadySelected = overwritingValues.some(existing => 
                                                existing.recordCode === item.fieldTransaction && 
                                                existing.snfCode === item.snfCode &&
                                                existing.snfDescription === item.snfDescription &&
                                                existing.snfPosition === item.snfPosition?.toString()
                                            );
                                            
                                            return (
                                                <tr 
                                                    key={index}
                                                    onClick={() => handleSelectSnfItem(item)}
                                                    style={{
                                                        ...styles.popupTd,
                                                        backgroundColor: isAlreadySelected ? '#f8d7da' : 'transparent',
                                                        color: isAlreadySelected ? '#721c24' : 'inherit',
                                                        cursor: isAlreadySelected ? 'not-allowed' : 'pointer',
                                                        opacity: isAlreadySelected ? 0.7 : 1
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isAlreadySelected) {
                                                            e.target.parentElement.style.backgroundColor = '#f8f9fa';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isAlreadySelected) {
                                                            e.target.parentElement.style.backgroundColor = '';
                                                        }
                                                    }}
                                                    title={isAlreadySelected ? 'This entry has already been selected' : 'Click to select this entry'}
                                                >
                                                    <td style={styles.popupTd}>
                                                        {item.fieldTransaction}
                                                        {isAlreadySelected && <span style={{ marginLeft: '8px', fontSize: '12px' }}>✓ Selected</span>}
                                                    </td>
                                                    <td style={styles.popupTd}>{item.snfCode}</td>
                                                    <td style={styles.popupTd}>{item.snfDescription}</td>
                                                    <td style={styles.popupTd}>{item.snfPosition}</td>
                                                    <td style={styles.popupTd}>{item.snfLength}</td>
                                                    <td style={styles.popupTd}>{item.snfType}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredSnfData.length === 0 && !popupLoading && (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        {snfDecoderData.length === 0 ? 
                                            'No SNF decoder data available.' : 
                                            'No SNF decoder entries found matching your filters.'
                                        }
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