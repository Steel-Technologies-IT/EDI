import React, { useEffect, useState, useCallback } from "react";
import { FiFilter, FiPlus, FiEdit, FiTrash2, FiDownload, FiSearch } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';
const RoutingTransactionTable = ({
    setColumnFilters,
    columnFilters,
    handleExport,
    clearAllFilters,
    records,
    loading,
    error,
    pagination,
    handleNextPage,
    handlePreviousPage,
    getCurrentPageInfo,
    columns,
    fieldDescriptions,
    showModal,
    openAddModal,
    openEditModal,
    closeModal,
    handleFormChange,
    formData,
    handleSave,
    editingRecord,
    handleDelete,
    FILTER_ROW_HEIGHT = 40,
    setShowFilters,
    showFilters,
    getColumnDisplayName,
    formatValue
}) => {
    // Define your specific field configuration
    const specificFields = [
        {
            column_name: 'customer_id',
            data_type: 'varchar',
            is_nullable: false,
            display_name: 'Invex Customer ID'
        },
        {
            column_name: 'isa_id',
            data_type: 'varchar', 
            is_nullable: false,
            display_name: 'ISA ID'
        },
        {
            column_name: 'isa_qualifier',
            data_type: 'varchar',
            is_nullable: false,
            display_name: 'ISA Qualifier'
        },
        {
            column_name: 'edi_account_id',
            data_type: 'varchar',
            is_nullable: false,
            display_name: 'Trading Partner Account ID'
        }
    ];

    // Override the columns prop with our specific fields
    const displayColumns = specificFields;

    // Enhanced field descriptions specific to your use case
    const enhancedFieldDescriptions = {
        'customer_id': 'Invexnternal customer identifier',
        'isa_id': 'EDI ISA segment identifier', 
        'isa_qualifier': 'EDI ISA qualifier code',
        'edi_account_id': 'Trading Partner account identifier'
    };

    // Enhanced column display name function
    const getEnhancedColumnDisplayName = (column) => {
        return column.display_name || column.column_name;
    };

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 20;
    const totalPages = Math.ceil(records.length / rowsPerPage);
    const paginatedRecords = records.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const Pagination = () => (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
            <span style={{ margin: '0 12px' }}>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
    );

    // EDI Account Search state
    const [showEdiSearchModal, setShowEdiSearchModal] = useState(false);
    const [ediSearchTerm, setEdiSearchTerm] = useState('');
    const [ediAccounts, setEdiAccounts] = useState([]);
    const [allEdiAccounts, setAllEdiAccounts] = useState([]); // New state to store all accounts
    const [ediSearchLoading, setEdiSearchLoading] = useState(false);

    const openEdiSearchModal = () => {
        console.log('Opening EDI search modal...');
        
        // Reset search state when opening modal
        setEdiSearchTerm('');
        setEdiAccounts(allEdiAccounts); // Reset to show all accounts instead of clearing
        
        setShowEdiSearchModal(true);
        
        // Fetch fresh data if needed
        if (!allEdiAccounts || allEdiAccounts.length === 0) {
            fetchEdiAccounts();
        }
    };
    const closeEdiSearchModal = () => {
        setShowEdiSearchModal(false);
        setEdiSearchTerm(''); // Clear search term
        // Don't clear the accounts here - they'll be reset when modal reopens
    };

    // Fetch EDI accounts - updated to only fetch once and store all accounts
    const fetchEdiAccounts = async () => {
        try {
            setEdiSearchLoading(true);
            
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers`);
            const data = await response.json();
            
            if (response.ok) {
                const accounts = data || [];
                setAllEdiAccounts(accounts); // Store all accounts
                setEdiAccounts(accounts); // Show all accounts initially
            } else {
                console.error('Failed to fetch EDI accounts:', data.error);
                setEdiAccounts([]);
                setAllEdiAccounts([]);
            }
        } catch (error) {
            console.error('Error fetching EDI accounts:', error);
            setEdiAccounts([]);
            setAllEdiAccounts([]);
        } finally {
            setEdiSearchLoading(false);
        }
    };

    // Handle EDI search - updated to filter locally
    const handleEdiSearch = (searchTerm) => {
        setEdiSearchTerm(searchTerm);
        
        if (searchTerm && searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            const filtered = allEdiAccounts.filter(account => 
                account.edia_edi_account_id?.toLowerCase().includes(searchLower) ||
                account.edia_cust_name?.toLowerCase().includes(searchLower) ||
                account.edia_as400_xref?.toLowerCase().includes(searchLower) ||
                account.invex_account_ids?.toLowerCase().includes(searchLower)
            );
            setEdiAccounts(filtered);
        } else {
            // Show all accounts when search is cleared
            setEdiAccounts(allEdiAccounts);
        }
    };

    // Reset EDI accounts when modal is closed
    useEffect(() => {
        if (showEdiSearchModal) {
            setEdiAccounts(allEdiAccounts); // Reset to show all accounts when modal opens
        }
    }, [showEdiSearchModal, allEdiAccounts]);

    // Initial fetch of EDI accounts
    useEffect(() => {
        fetchEdiAccounts();
        fetchCustomerAccounts();
    }, []);

    // Customer ID search states
    const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerAccounts, setCustomerAccounts] = useState([]);
    const [allCustomerAccounts, setAllCustomerAccounts] = useState([]);
    const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

    const openCustomerSearchModal = () => {
        setShowCustomerSearchModal(true);
        setCustomerSearchTerm('');
        fetchCustomerAccounts();
        
    };
    const closeCustomerSearchModal = () => {
        setShowCustomerSearchModal(false);
        setCustomerSearchTerm('');
        setCustomerAccounts([]);
        setAllCustomerAccounts([]);
    };

    // Fetch customer accounts function
    const fetchCustomerAccounts = async () => {
        try {
            setCustomerSearchLoading(true);
            
            // Replace with your actual API endpoint for customer data
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/InvexCustomers`);
            const data = await response.json();
            
            console.log('Customer data response:', data);
            
            if (response.ok) {
                // Handle different possible response structures
                let accounts = [];
                if (data && data.customers && data.customers.Data) {
                    accounts = data.customers.Data;
                } else if (data && Array.isArray(data)) {
                    accounts = data;
                } else if (data && data.Data && Array.isArray(data.Data)) {
                    accounts = data.Data;
                }
                
                console.log('Processed accounts:', accounts);
                
                setAllCustomerAccounts(accounts);
                setCustomerAccounts(accounts);
            } else {
                console.error('Failed to fetch customer accounts:', data.error || 'Unknown error');
                setCustomerAccounts([]);
                setAllCustomerAccounts([]);
            }
        } catch (error) {
            console.error('Error fetching customer accounts:', error);
            setCustomerAccounts([]);
            setAllCustomerAccounts([]);
        } finally {
            setCustomerSearchLoading(false);
        }
    };

    // Handle customer search function
    const handleCustomerSearch = (searchTerm) => {
        setCustomerSearchTerm(searchTerm);
        
        if (searchTerm && searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            const filtered = allCustomerAccounts.filter(account => 
                account.eii_ichg_acct_typ?.toLowerCase().includes(searchLower) ||
                account.eii_ichg_acct_id?.toLowerCase().includes(searchLower) ||
                account.eii_edix_iiq?.toLowerCase().includes(searchLower) ||
                account.eii_edix_ichid?.toLowerCase().includes(searchLower) ||
                account.cus_cus_nm?.toLowerCase().includes(searchLower) // Add customer name to search
            );
            setCustomerAccounts(filtered);
        } else {
            setCustomerAccounts(allCustomerAccounts);
        }
    };

    // Add this function after the handleCustomerSearch function and before the return statement:
    const handleEdiAccountSelect = (account) => {
        handleFormChange('edi_account_id', account.edia_edi_account_id);
        closeEdiSearchModal();
    };

    // Handle customer account selection (this one you already have)
    const handleCustomerAccountSelect = (account) => {
        handleFormChange('customer_id', account.eii_ichg_acct_id);
        handleFormChange('isa_qualifier', account.eii_edix_iiq);
        handleFormChange('isa_id', account.eii_edix_ichid);
        
        // Store the customer name for display purposes
        handleFormChange('customer_name', account.cus_cus_nm);
        
        closeCustomerSearchModal();
    };

    // Update the useEffect for fetching accounts to include both EDI and Customer accounts
    useEffect(() => {
        fetchEdiAccounts();
        // Remove fetchCustomerAccounts() from here
    }, []);
console.log(allCustomerAccounts)
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
                            <strong>Records:</strong> {getCurrentPageInfo()}
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
                                            {/* Actions column header for filter row */}
                                        </th>
                                    </tr>
                                )}
                                <tr style={{ background: '#f8f9fa' }}>
                                    {displayColumns.map((column, index) => (
                                        <th 
                                            key={index}
                                            style={{ 
                                                padding: '12px 8px', 
                                                border: '1px solid #dee2e6',
                                                textAlign: 'left',
                                                fontWeight: 'bold',
                                                position: 'sticky',
                                                top: showFilters ? FILTER_ROW_HEIGHT : 0,
                                                background: '#f8f9fa',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={`${column.column_name}: ${enhancedFieldDescriptions[column.column_name] || `Type: ${column.data_type}, Nullable: ${column.is_nullable}`}`}
                                        >
                                            {getEnhancedColumnDisplayName(column)}
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
                                        width: '100px'
                                    }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRecords.length > 0 ? (
                                    paginatedRecords.map((record, rowIndex) => (
                                        <tr 
                                            key={record._row_id || rowIndex}
                                            style={{ 
                                                background: rowIndex % 2 === 0 ? '#fff' : '#f8f9fa'
                                            }}
                                        >
                                            {displayColumns.map((column, colIndex) => (
                                                <td 
                                                    key={colIndex}
                                                    style={{ 
                                                        padding: '8px', 
                                                        border: '1px solid #dee2e6',
                                                        maxWidth: '200px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    title={
                                                        column.column_name === 'customer_id' 
                                                            ? (() => {
                                                                const customerAccount = allCustomerAccounts.find(acc => acc.eii_ichg_acct_id === record[column.column_name]);
                                                                return customerAccount && customerAccount.cus_cus_nm 
                                                                    ? `${record[column.column_name]} - ${customerAccount.cus_cus_nm}`
                                                                    : String(record[column.column_name] || '');
                                                            })()
                                                            : String(record[column.column_name] || '')
                                                    }
                                                >
                                                    {/* Custom formatting for customer_id column */}
                                                    {column.column_name === 'customer_id' ? (() => {
                                                        const customerAccount = allCustomerAccounts.find(acc => acc.eii_ichg_acct_id === record[column.column_name]);
                                                        return customerAccount && customerAccount.cus_cus_nm 
                                                            ? `${record[column.column_name]} - ${customerAccount.cus_cus_nm}`
                                                            : formatValue(record[column.column_name]);
                                                    })() : formatValue(record[column.column_name])}
                                                </td>
                                            ))}
                                            <td style={{ 
                                                padding: '8px', 
                                                border: '1px solid #dee2e6',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    alignItems: 'center'
                                                }}>
                                                    <button
                                                        onClick={() => openEditModal(record)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            padding: 4,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center'
                                                        }}
                                                        title="Edit Configuration"
                                                    >
                                                        <FiEdit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(record)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            padding: 4,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            color: '#dc3545'
                                                        }}
                                                        title="Delete Configuration"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={displayColumns.length + 1} style={{ 
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#666',
                                            border: '1px solid #dee2e6'
                                        }}>
                                            No matching records found. Try adjusting your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for Add/Edit */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '20px',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }}>
                        <h3>{editingRecord ? 'Edit Configuration' : 'Add New Configuration'}</h3>
                        
                        <div style={{ marginBottom: '20px' }}>
                            {displayColumns.map((column) => (
                                <div key={column.column_name} style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        {getEnhancedColumnDisplayName(column)}
                                        {column.column_name !== 'isa_id' && column.column_name !== 'isa_qualifier' && (
                                            <span style={{ color: 'red' }}>*</span>
                                        )}
                                    </label>
                                    {column.column_name === 'customer_id' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value={formData[column.column_name] ? 
                                                    `${formData[column.column_name]}${formData.customer_name ? ` - ${formData.customer_name}` : ''}` : 
                                                    ''}
                                                onChange={(e) => {
                                                    // Extract just the ID part if user manually edits
                                                    const value = e.target.value.split(' - ')[0];
                                                    handleFormChange(column.column_name, value);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontSize: '14px'
                                                }}
                                                placeholder={`Enter ${getEnhancedColumnDisplayName(column)}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={openCustomerSearchModal}
                                                style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: '#28a745',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    fontSize: '14px'
                                                }}
                                                title="Search Invex Customer Accounts"
                                            >
                                                <FiSearch size={16} />
                                            </button>
                                        </div>
                                    ) : column.column_name === 'edi_account_id' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value={formData[column.column_name] || ''}
                                                onChange={(e) => handleFormChange(column.column_name, e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontSize: '14px'
                                                }}
                                                placeholder={fieldDescriptions[column.column_name] || `Enter ${getEnhancedColumnDisplayName(column)}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={openEdiSearchModal}
                                                style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: '#007bff',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    fontSize: '14px'
                                                }}
                                                title="Search Trading Partner Accounts"
                                            >
                                                <FiSearch size={16} />
                                            </button>
                                        </div>
                                    ) : column.column_name === 'isa_id' || column.column_name === 'isa_qualifier' ? (
                                        // Make ISA ID and ISA Qualifier read-only
                                        <input
                                            type="text"
                                            value={formData[column.column_name] || ''}
                                            readOnly
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                boxSizing: 'border-box',
                                                backgroundColor: '#f5f5f5',
                                                color: '#666',
                                                cursor: 'not-allowed'
                                            }}
                                            placeholder={`Auto-populated from Customer ID search`}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={formData[column.column_name] || ''}
                                            onChange={(e) => handleFormChange(column.column_name, e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px',
                                                boxSizing: 'border-box'
                                            }}
                                            placeholder={`Enter ${getEnhancedColumnDisplayName(column)}`}
                                        />
                                    )}
                                    <small style={{ color: '#666' }}>
                                        {column.column_name === 'isa_id' || column.column_name === 'isa_qualifier' 
                                            ? 'Auto-populated when selecting a customer account'
                                            : enhancedFieldDescriptions[column.column_name] || `Type: ${column.data_type}`
                                        }
                                    </small>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeModal}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    background: '#f8f9fa',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: '#28a745',
                                    color: 'white',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDI Account Search Modal */}
            {showEdiSearchModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '20px',
                        width: '90%',
                        maxWidth: '800px',
                        maxHeight: '80vh',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '1px solid #dee2e6',
                            paddingBottom: '10px'
                        }}>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#333',
                                margin: 0
                            }}>
                                Search Trading Partner Accounts
                            </h2>
                            <button
                                onClick={closeEdiSearchModal}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    padding: '5px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Search Input */}
                        <div style={{ marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="Search by Trading Partner Account ID, Trading Partner Name, or AS400 XREF..."
                                value={ediSearchTerm}
                                onChange={(e) => handleEdiSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                                autoFocus
                            />
                        </div>

                        {/* Results */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px'
                        }}>
                            {ediSearchLoading ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#666'
                                }}>
                                    Loading EDI accounts...
                                </div>
                            ) : ediAccounts.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#666'
                                }}>
                                    {ediSearchTerm ? 'No Trading Partner accounts found matching your search.' : 'No EDI accounts available.'}
                                </div>
                            ) : (
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse'
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                Trading Partner Account ID
                                            </th>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                Trading Partner Name
                                            </th>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                AS400 XREF
                                            </th>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                Invex Account IDs
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ediAccounts.map((account, index) => (
                                            <tr
                                                key={account.edia_edi_account_id || index}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #dee2e6'
                                                }}
                                                onClick={() => handleEdiAccountSelect(account)}
                                                onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f8f9fa'}
                                                onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{ padding: '10px 8px' }}>
                                                    {account.edia_edi_account_id}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {account.edia_cust_name}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {account.edia_as400_xref || '-'}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {account.invex_account_ids || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Account Search Modal */}
            {showCustomerSearchModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '20px',
                        width: '90%',
                        maxWidth: '900px',
                        maxHeight: '80vh',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '1px solid #dee2e6',
                            paddingBottom: '10px'
                        }}>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#333',
                                margin: 0
                            }}>
                                Search Invex Customer Accounts
                            </h2>
                            <button
                                onClick={closeCustomerSearchModal}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    padding: '5px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Search Input */}
                        <div style={{ marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="Search by Account Type, Account ID, ISA Qualifier, or ISA ID..."
                                value={customerSearchTerm}
                                onChange={(e) => handleCustomerSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                                autoFocus
                            />
                        </div>

                        {/* Results */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px'
                        }}>
                            {customerSearchLoading ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#666'
                                }}>
                                    Loading customer accounts...
                                </div>
                            ) : customerAccounts.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#666'
                                }}>
                                    {customerSearchTerm ? 'No customer accounts found matching your search.' : 'No customer accounts available.'}
                                </div>
                            ) : (
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse'
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                Account Type
                                            </th>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                Customer ID
                                            </th>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                ISA Qualifier
                                            </th>
                                            <th style={{
                                                padding: '12px 8px',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #dee2e6',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                ISA ID
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerAccounts.map((account, index) => (
                                            <tr
                                                key={account.eii_ichg_acct_id || index}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #dee2e6'
                                                }}
                                                onClick={() => handleCustomerAccountSelect(account)}
                                                onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f8f9fa'}
                                                onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{ padding: '10px 8px' }}>
                                                    {account.eii_ichg_acct_typ || '-'}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {/* Updated to show ID - Name format */}
                                                    {account.eii_ichg_acct_id ? 
                                                        `${account.eii_ichg_acct_id}${account.cus_cus_nm ? ` - ${account.cus_cus_nm}` : ''}` 
                                                        : '-'}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {account.eii_edix_iiq || '-'}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {account.eii_edix_ichid || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoutingTransactionTable;
