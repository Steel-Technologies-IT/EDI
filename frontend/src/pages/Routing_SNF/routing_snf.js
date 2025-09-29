import React, { useEffect, useState } from "react";
import { FiFilter, FiPlus, FiEdit, FiTrash2, FiDownload, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';

const RoutingTransactionTable = ({
    setColumnFilters,
    columnFilters,
    handleExport,
    clearAllFilters,
    records,
    loading,
    error,
    openAddModal,
    openEditModal,
    handleDelete,
    FILTER_ROW_HEIGHT = 40,
    setShowFilters,
    showFilters,
    formatValue,
    getCustomerDisplayName,
    getTradingPartnerDisplayName,
    allCustomerAccounts,
    allEdiAccounts
}) => {
    // Define specific field configuration
    const specificFields = [
        {
            column_name: 'customer_id',
            display_name: 'Invex Customer ID'
        },
        {
            column_name: 'edi_account_id',
            display_name: 'Trading Partner Account ID'
        },
        {
            column_name: 'transactions',
            display_name: 'Transaction Types'
        },
        {
            column_name: 'isa_qualifier',
            display_name: 'ISA Qualifier'
        },
        {
            column_name: 'isa_id',
            display_name: 'ISA ID'
        }
    ];

    const displayColumns = specificFields;

    // State variables
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Pagination
    const rowsPerPage = 20;

    const getEnhancedColumnDisplayName = (column) => {
        return column.display_name || column.column_name;
    };

    // Sorting function
    const handleSort = (columnName) => {
        let direction = 'asc';
        if (sortConfig.key === columnName && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key: columnName, direction });
    };

    // Get display value for sorting
    const getDisplayValueForSorting = (record, columnName) => {
        switch (columnName) {
            case 'customer_id':
                return getCustomerDisplayName(record[columnName]);
            case 'edi_account_id':
                return getTradingPartnerDisplayName(record[columnName]);
            case 'transactions':
                return Array.isArray(record[columnName]) 
                    ? record[columnName].join(', ')
                    : record[columnName] || '';
            default:
                return record[columnName] || '';
        }
    };

    // Filtering logic
    const filteredRecords = React.useMemo(() => {
        console.log('=== FILTERING DEBUG ===');
        console.log('Original records:', records.length);
        console.log('Column filters:', columnFilters);
        console.log('allCustomerAccounts loaded:', allCustomerAccounts.length);
        console.log('allEdiAccounts loaded:', allEdiAccounts.length);
        
        // Don't filter if reference data isn't loaded yet
        if (allCustomerAccounts.length === 0 || allEdiAccounts.length === 0) {
            console.log('⚠️ Reference data not loaded yet, skipping filtering');
            return records;
        }
        
        let data = [...records];
        
        // Apply column filters with LIKE comparisons
        const filters = columnFilters;
        
        if (Object.values(filters).some(value => value && value.trim() !== '')) {
            console.log('Applying filters:', filters);
            
            data = data.filter(record => {
                console.log('Filtering record:', record);
        
                // Customer ID filter (LIKE comparison) - Enhanced to match ID or Name separately
                if (filters.customer_id && filters.customer_id.trim() !== '') {
                    const filterValue = filters.customer_id.toLowerCase();
                    const customerId = String(record.customer_id || '').toLowerCase();
                    
                    console.log('=== CUSTOMER FILTER DEBUG ===');
                    console.log('Filter value:', filterValue);
                    console.log('Record customer_id:', record.customer_id);
                    
                    // Find the customer account by matching the ID
                    const customerAccount = allCustomerAccounts.find(acc => {
                        const match = acc.eii_ichg_acct_id === record.customer_id;
                        if (match) {
                            console.log('✅ Found matching customer:', acc);
                        }
                        return match;
                    });
                    
                    console.log('Customer account lookup result:', customerAccount);
                    
                    const customerName = customerAccount ? String(customerAccount.cus_cus_nm || '').toLowerCase() : '';
                    
                    console.log('Customer name for filtering:', customerName);
                    
                    // Check if filter matches ID OR name OR the combined display string
                    const customerDisplay = getCustomerDisplayName(record.customer_id).toLowerCase();
                    const idMatches = customerId.includes(filterValue);
                    const nameMatches = customerName.includes(filterValue);
                    const displayMatches = customerDisplay.includes(filterValue);
                    const matches = idMatches || nameMatches || displayMatches;
                    
                    console.log('Customer filter comparison:', {
                        filterValue,
                        customerId,
                        customerName,
                        customerDisplay,
                        idMatches,
                        nameMatches,
                        displayMatches,
                        finalMatch: matches
                    });
                    
                    if (!matches) {
                        console.log('❌ Customer filter failed');
                        return false;
                    }
                    console.log('✅ Customer filter passed');
                }
                
                // EDI Account ID filter (LIKE comparison) - Enhanced to match ID or Name separately
                if (filters.edi_account_id && filters.edi_account_id.trim() !== '') {
                    const filterValue = filters.edi_account_id.toLowerCase();
                    const ediAccountId = String(record.edi_account_id || '').toLowerCase();
                    
                    console.log('=== EDI FILTER DEBUG ===');
                    console.log('Filter value:', filterValue);
                    console.log('Record edi_account_id:', record.edi_account_id);
                    
                    // Find the EDI account to get the name
                    const ediAccount = allEdiAccounts.find(acc => {
                        const match = acc.edia_edi_account_id === record.edi_account_id;
                        if (match) {
                            console.log('✅ Found matching EDI account:', acc);
                        }
                        return match;
                    });
                    
                    console.log('EDI account lookup result:', ediAccount);
                    
                    const ediAccountName = ediAccount ? String(ediAccount.edia_cust_name || '').toLowerCase() : '';
                    
                    console.log('EDI account name for filtering:', ediAccountName);
                    
                    // Check if filter matches ID OR name OR the combined display string
                    const ediDisplay = getTradingPartnerDisplayName(record.edi_account_id).toLowerCase();
                    const idMatches = ediAccountId.includes(filterValue);
                    const nameMatches = ediAccountName.includes(filterValue);
                    const displayMatches = ediDisplay.includes(filterValue);
                    const matches = idMatches || nameMatches || displayMatches;
                    
                    console.log('EDI filter comparison:', {
                        filterValue,
                        ediAccountId,
                        ediAccountName,
                        ediDisplay,
                        idMatches,
                        nameMatches,
                        displayMatches,
                        finalMatch: matches
                    });
                    
                    if (!matches) {
                        console.log('❌ EDI filter failed');
                        return false;
                    }
                    console.log('✅ EDI filter passed');
                }
                
                // Transactions array filter (LIKE comparison)
                if (filters.transactions && filters.transactions.trim() !== '') {
                    console.log('Transaction filter input:', filters.transactions);
                    console.log('Record transactions:', record.transactions);
                    
                    const transactionsStr = Array.isArray(record.transactions) 
                        ? record.transactions.join(', ').toLowerCase()
                        : String(record.transactions || '').toLowerCase();
                    
                    console.log('Transactions string for comparison:', transactionsStr);
                    console.log('Filter value:', filters.transactions.toLowerCase());
                    
                    const matches = transactionsStr.includes(filters.transactions.toLowerCase());
                    console.log('Transaction filter result:', matches);
                    
                    if (!matches) {
                        console.log('❌ Transactions filter failed');
                        return false;
                    }
                }
                
                // ISA Qualifier filter (LIKE comparison)
                if (filters.isa_qualifier && filters.isa_qualifier.trim() !== '') {
                    const isaQualifier = String(record.isa_qualifier || '').toLowerCase();
                    if (!isaQualifier.includes(filters.isa_qualifier.toLowerCase())) {
                        console.log('❌ ISA Qualifier filter failed');
                        return false;
                    }
                }
                
                // ISA ID filter (LIKE comparison)
                if (filters.isa_id && filters.isa_id.trim() !== '') {
                    const isaId = String(record.isa_id || '').toLowerCase();
                    if (!isaId.includes(filters.isa_id.toLowerCase())) {
                        console.log('❌ ISA ID filter failed');
                        return false;
                    }
                }
                
                console.log('✅ Record passed all filters');
                return true;
            });
        }
        
        console.log('Final filtered records count:', data.length);
        return data;
    }, [records, columnFilters, allCustomerAccounts, allEdiAccounts]);

    // Apply sorting to filtered records
    const sortedAndFilteredRecords = React.useMemo(() => {
        if (!sortConfig.key) {
            return filteredRecords;
        }

        const sorted = [...filteredRecords].sort((a, b) => {
            const aValue = getDisplayValueForSorting(a, sortConfig.key);
            const bValue = getDisplayValueForSorting(b, sortConfig.key);
            
            // Convert to strings for comparison and handle null/undefined
            const aStr = String(aValue || '').toLowerCase();
            const bStr = String(bValue || '').toLowerCase();

            if (aStr < bStr) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aStr > bStr) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sorted;
    }, [filteredRecords, sortConfig, getCustomerDisplayName, getTradingPartnerDisplayName]);

    // Update pagination to use sorted and filtered records
    const filteredTotalPages = Math.ceil(sortedAndFilteredRecords.length / rowsPerPage);
    const paginatedRecords = sortedAndFilteredRecords.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Pagination component
    const Pagination = () => (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
            <span style={{ margin: '0 12px' }}>Page {currentPage} of {filteredTotalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(filteredTotalPages, p + 1))} disabled={currentPage === filteredTotalPages}>Next</button>
        </div>
    );

    // Update pagination info display
    const getCurrentPageInfoUpdated = () => {
        if (sortedAndFilteredRecords.length === 0) return '0 records';
        
        const start = (currentPage - 1) * rowsPerPage + 1;
        const end = Math.min(currentPage * rowsPerPage, sortedAndFilteredRecords.length);
        
        return `${start}-${end} of ${sortedAndFilteredRecords.length} records${sortedAndFilteredRecords.length !== records.length ? ` (filtered from ${records.length})` : ''}`;
    };

    // Reset to page 1 when filters or sorting changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [columnFilters, sortConfig]);

    // Render sort icon
    const renderSortIcon = (columnName) => {
        if (sortConfig.key !== columnName) {
            return null;
        }
        return sortConfig.direction === 'asc' ? 
            <FiChevronUp size={14} style={{ marginLeft: '4px' }} /> : 
            <FiChevronDown size={14} style={{ marginLeft: '4px' }} />;
    };

    const handleDeleteWithNames = async (record) => {
        const customerDisplay = getCustomerDisplayName(record.customer_id);
        const tradingPartnerDisplay = getTradingPartnerDisplayName(record.edi_account_id);
        
        const recordDesc = `Customer: ${customerDisplay}\nTrading Partner: ${tradingPartnerDisplay}\nISA ID: ${record.isa_id}`;
        
        if (!window.confirm(`Are you sure you want to delete this record?\n\n${recordDesc}`)) {
            return;
        }
        
        await handleDelete(record);
    };

    return (
        <div style={{ width: '100%', minHeight: '80vh', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2>Routing Transaction Configuration</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Configure Trading Partners who need routing transaction records sent. Each record defines a Trading Partner and transaction type combination that requires routing.
                </p>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '12px' }}>
                    <button
                        type="button"
                        onClick={() => setShowFilters(v => !v)}
                        title={showFilters ? 'Hide Filters' : 'Show Filters'}
                        style={{ 
                            border: 'none',
                            padding: '6px 8px', 
                            cursor: 'pointer',
                            display: 'flex',
                            background: 'none',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FiFilter size={18} color="#000" />
                    </button>
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        title="Clear All Filters"
                        style={{ 
                            border: 'none',
                            background: 'none',  
                            borderRadius: 4, 
                            padding: '6px 8px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FcClearFilters size={18} />
                    </button>
                    
                    <button
                        type="button"
                        onClick={openAddModal}
                        title="Add New Route"
                        style={{ 
                            color: 'black',
                            border: 'none',
                            background: 'none', 
                            borderRadius: 4, 
                            padding: '6px 12px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FiPlus size={18} />
                    </button>
                    <button
                        onClick={handleExport}
                        title="Export to Excel (CSV)"
                        aria-label="Export to CSV"
                        style={{ 
                            color: 'black',
                            border: 'none',
                            background: 'none',
                            borderRadius: 4, 
                            padding: '6px 12px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FiDownload size={22} color="#000000ff" />
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div style={{ 
                        background: '#ffebee', 
                        color: '#c62828', 
                        padding: '12px', 
                        borderRadius: '4px', 
                        marginBottom: '20px',
                        border: '1px solid #ffcdd2'
                    }}>
                        Error: {error}
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '20px',
                        color: '#666'
                    }}>
                        Loading...
                    </div>
                )}

                {/* Pagination Info and Controls */}
                {!loading && records.length > 0 && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '20px',
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: '4px'
                    }}>
                        <div>
                            <strong>Records:</strong> {getCurrentPageInfoUpdated()}
                        </div>
                        <div>
                            <Pagination />
                        </div>
                    </div>
                )}
            </div>

            {/* Table Display */}
            {!loading && (
                <div style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                    overflow: 'hidden' 
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            fontSize: '14px'
                        }}>
                            <thead>
                                {showFilters && (
                                    <tr>
                                        {displayColumns.map((column, index) => (
                                            <th
                                                key={`filter-${index}`}
                                                style={{
                                                    padding: 0,
                                                    background: '#fff',
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 6,
                                                    border: '1px solid #dee2e6',
                                                    borderBottom: 0,
                                                    height: FILTER_ROW_HEIGHT
                                                }}
                                            >
                                                <input
                                                    placeholder={`Filter ${getEnhancedColumnDisplayName(column)}`}
                                                    value={columnFilters[column.column_name] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setColumnFilters(prev => ({ ...prev, [column.column_name]: val }));
                                                    }}
                                                    style={{ 
                                                        width: '100%', 
                                                        height: '100%', 
                                                        boxSizing: 'border-box', 
                                                        border: 'none', 
                                                        outline: 'none', 
                                                        padding: 8,
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                        ))}
                                        <th style={{
                                            padding: 0,
                                            background: '#fff',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 6,
                                            border: '1px solid #dee2e6',
                                            borderBottom: 0,
                                            height: FILTER_ROW_HEIGHT,
                                            width: '100px'
                                        }}>
                                        </th>
                                    </tr>
                                )}
                                <tr style={{ background: '#f8f9fa' }}>
                                    {displayColumns.map((column, index) => (
                                        <th 
                                            key={index}
                                            onClick={() => handleSort(column.column_name)}
                                            style={{ 
                                                padding: '12px 8px', 
                                                border: '1px solid #dee2e6',
                                                textAlign: 'left',
                                                fontWeight: 'bold',
                                                position: 'sticky',
                                                top: showFilters ? FILTER_ROW_HEIGHT : 0,
                                                background: '#f8f9fa',
                                                zIndex: 5,
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#e9ecef';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = '#f8f9fa';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {getEnhancedColumnDisplayName(column)}
                                                {renderSortIcon(column.column_name)}
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ 
                                        padding: '12px 8px', 
                                        border: '1px solid #dee2e6',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        position: 'sticky',
                                        top: showFilters ? FILTER_ROW_HEIGHT : 0,
                                        background: '#f8f9fa',
                                        zIndex: 5,
                                        width: '100px'
                                    }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRecords.map((record, index) => (
                                    <tr key={record._row_id || index} style={{ borderBottom: '1px solid #dee2e6' }}>
                                        {displayColumns.map((column, colIndex) => (
                                            <td 
                                                key={colIndex}
                                                style={{ 
                                                    padding: '8px', 
                                                    border: '1px solid #dee2e6',
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {column.column_name === 'customer_id' ? (
                                                    getCustomerDisplayName(record[column.column_name])
                                                ) : column.column_name === 'edi_account_id' ? (
                                                    getTradingPartnerDisplayName(record[column.column_name])
                                                ) : column.column_name === 'transactions' ? (
                                                    Array.isArray(record[column.column_name]) 
                                                        ? record[column.column_name].join(', ')
                                                        : record[column.column_name] || ''
                                                ) : (
                                                    formatValue ? formatValue(record[column.column_name], column) : record[column.column_name]
                                                )}
                                            </td>
                                        ))}
                                        <td style={{ 
                                            padding: '8px', 
                                            border: '1px solid #dee2e6',
                                            textAlign: 'center'
                                        }}>
                                            <button
                                                onClick={() => openEditModal(record)}
                                                title="Edit Record"
                                                style={{
                                                    padding: '6px 8px',
                                                    marginRight: '8px',
                                                    backgroundColor: '#ffc107',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <FiEdit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteWithNames(record)}
                                                title="Delete Record"
                                                style={{
                                                    padding: '6px 8px',
                                                    backgroundColor: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={displayColumns.length + 1} style={{ 
                                            textAlign: 'center', 
                                            padding: '20px',
                                            color: '#666',
                                            fontStyle: 'italic'
                                        }}>
                                            No records found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoutingTransactionTable;
