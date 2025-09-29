import React, { useEffect, useState, useCallback } from "react";
import { FiFilter, FiPlus, FiEdit, FiTrash2, FiDownload, FiSearch } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';
import Select from 'react-select';

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
            column_name: 'edi_account_id',
            data_type: 'varchar',
            is_nullable: false,
            display_name: 'Trading Partner Account ID'
        },
        {
            column_name: 'transactions',
            data_type: 'array',
            is_nullable: true,
            display_name: 'Transaction Types'
        },
        {
            column_name: 'isa_qualifier',
            data_type: 'varchar',
            is_nullable: false,
            display_name: 'ISA Qualifier'
        },
        {
            column_name: 'isa_id',
            data_type: 'varchar', 
            is_nullable: false,
            display_name: 'ISA ID'
        }
    ];

    // Override the columns prop with our specific fields
    const displayColumns = specificFields;

    // Enhanced field descriptions specific to your use case
    const enhancedFieldDescriptions = {
        'customer_id': 'Invex internal customer identifier',
        'isa_id': 'EDI ISA segment identifier', 
        'isa_qualifier': 'EDI ISA qualifier code',
        'edi_account_id': 'Trading Partner account identifier',
        'transactions': 'Select one or more transaction types for this routing configuration'
    };

    // Enhanced column display name function
    const getEnhancedColumnDisplayName = (column) => {
        return column.display_name || column.column_name;
    };

    // State variables
    const [currentPage, setCurrentPage] = useState(1);
    const [showEdiSearchModal, setShowEdiSearchModal] = useState(false);
    const [ediSearchTerm, setEdiSearchTerm] = useState('');
    const [ediAccounts, setEdiAccounts] = useState([]);
    const [allEdiAccounts, setAllEdiAccounts] = useState([]);
    const [ediSearchLoading, setEdiSearchLoading] = useState(false);
    const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerAccounts, setCustomerAccounts] = useState([]);
    const [allCustomerAccounts, setAllCustomerAccounts] = useState([]);
    const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
    const [customerModalFilters, setCustomerModalFilters] = useState({});
    const [ediModalFilters, setEdiModalFilters] = useState({});
    const [transactionOptions, setTransactionOptions] = useState([]);
    const [transactionLoading, setTransactionLoading] = useState(false);

    // Pagination
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

    // Modal functions
    const openEdiSearchModal = () => {
        console.log('Opening EDI search modal...');
        setEdiSearchTerm('');
        setEdiModalFilters({});
        setEdiAccounts(allEdiAccounts);
        setShowEdiSearchModal(true);
        
        if (!allEdiAccounts || allEdiAccounts.length === 0) {
            fetchEdiAccounts();
        }
    };

    const closeEdiSearchModal = () => {
        setShowEdiSearchModal(false);
        setEdiSearchTerm('');
        setEdiModalFilters({});
    };

    const openCustomerSearchModal = () => {
        setShowCustomerSearchModal(true);
        setCustomerSearchTerm('');
        setCustomerModalFilters({});
        setCustomerAccounts(allCustomerAccounts);
        
        if (!allCustomerAccounts || allCustomerAccounts.length === 0) {
            fetchCustomerAccounts();
        }
    };

    const closeCustomerSearchModal = () => {
        setShowCustomerSearchModal(false);
        setCustomerSearchTerm('');
        setCustomerModalFilters({});
    };

    // Fetch functions
    const fetchEdiAccounts = async () => {
        try {
            setEdiSearchLoading(true);
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers`);
            const data = await response.json();
            
            if (response.ok) {
                const accounts = data || [];
                setAllEdiAccounts(accounts);
                setEdiAccounts(accounts);
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

    const fetchCustomerAccounts = async () => {
        try {
            setCustomerSearchLoading(true);
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/InvexCustomers`);
            const data = await response.json();
            
            console.log('Customer data response:', data);
            
            if (response.ok) {
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

    const fetchTransactionOptions = async () => {
        try {
            setTransactionLoading(true);
            
            const transactionResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/transaction-options`);
            if (transactionResponse.ok) {
                const transactionData = await transactionResponse.json();
                console.log('=== RAW TRANSACTION DATA ===');
                console.log('transactionData:', transactionData);
                console.log('transactionData.rows:', transactionData.rows);
                
                const rawTransactionArray = transactionData.rows || transactionData || [];
                console.log('rawTransactionArray:', rawTransactionArray);
                
                if (rawTransactionArray.length > 0) {
                    console.log('First transaction item:', rawTransactionArray[0]);
                    console.log('Transaction fields:', Object.keys(rawTransactionArray[0]));
                }
                
                const formattedTransactionOptions = rawTransactionArray.map(transaction => {
                    const transValue = transaction.edimt_trans_tpe || transaction.trans_type || transaction.transaction_type || transaction.value;
                    const transDesc = transaction.edimt_trans_desc || transaction.description || transaction.trans_desc || transaction.label || '';
                    
                    console.log('Processing transaction:', {
                        original: transaction,
                        transValue,
                        transDesc
                    });
                    
                    return {
                        value: transValue,
                        label: `${transValue}`,
                        edimt_trans_tpe: transValue,
                        edimt_trans_desc: transDesc
                    };
                });
                
                console.log('=== FORMATTED TRANSACTION OPTIONS ===');
                console.log('formattedTransactionOptions:', formattedTransactionOptions);
                setTransactionOptions(formattedTransactionOptions);
            } else {
                console.error('Transaction API call failed:', transactionResponse.status, transactionResponse.statusText);
                setTransactionOptions([]);
            }
        } catch (error) {
            console.error('Error fetching transaction options:', error);
            setTransactionOptions([]);
        } finally {
            setTransactionLoading(false);
        }
    };

    // Search handlers
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
            setEdiAccounts(allEdiAccounts);
        }
    };

    const handleCustomerSearch = (searchTerm) => {
        setCustomerSearchTerm(searchTerm);
        
        if (searchTerm && searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            const filtered = allCustomerAccounts.filter(account => 
                account.eii_ichg_acct_typ?.toLowerCase().includes(searchLower) ||
                account.eii_ichg_acct_id?.toLowerCase().includes(searchLower) ||
                account.eii_edix_iiq?.toLowerCase().includes(searchLower) ||
                account.eii_edix_ichid?.toLowerCase().includes(searchLower) ||
                account.cus_cus_nm?.toLowerCase().includes(searchLower)
            );
            setCustomerAccounts(filtered);
        } else {
            setCustomerAccounts(allCustomerAccounts);
        }
    };

    // Selection handlers
    const handleEdiAccountSelect = (account) => {
        handleFormChange('edi_account_id', account.edia_edi_account_id);
        handleFormChange('trading_partner_name', account.edia_cust_name);
        closeEdiSearchModal();
    };

    const handleCustomerAccountSelect = (account) => {
        handleFormChange('customer_id', account.eii_ichg_acct_id);
        handleFormChange('isa_qualifier', account.eii_edix_iiq);
        handleFormChange('isa_id', account.eii_edix_ichid);
        handleFormChange('customer_name', account.cus_cus_nm);
        closeCustomerSearchModal();
    };

    // Display helper functions
    const getCustomerDisplayName = (customerId) => {
        if (!customerId || !allCustomerAccounts || allCustomerAccounts.length === 0) {
            return customerId || '';
        }
        
        const customerAccount = allCustomerAccounts.find(acc => acc.eii_ichg_acct_id === customerId);
        return customerAccount && customerAccount.cus_cus_nm 
            ? `${customerId} - ${customerAccount.cus_cus_nm}`
            : customerId;
    };

    const getTradingPartnerDisplayName = (ediAccountId) => {
        if (!ediAccountId || !allEdiAccounts || allEdiAccounts.length === 0) {
            return ediAccountId || '';
        }
        
        const ediAccount = allEdiAccounts.find(acc => acc.edia_edi_account_id === ediAccountId);
        return ediAccount && ediAccount.edia_cust_name 
            ? `${ediAccountId} - ${ediAccount.edia_cust_name}`
            : ediAccountId;
    };

    // Transaction handlers
    const handleTransactionChange = (selectedOptions) => {
        const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
        handleFormChange('transactions', selectedValues);
    };

    const getTransactionSelectValue = () => {
        if (!formData.transactions || !Array.isArray(formData.transactions)) {
            return [];
        }
        
        return formData.transactions.map(transValue => {
            const option = transactionOptions.find(opt => opt.value === transValue);
            return option || { value: transValue, label: transValue };
        });
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

    // Effects
    useEffect(() => {
        if (showEdiSearchModal) {
            setEdiAccounts(allEdiAccounts);
        }
    }, [showEdiSearchModal, allEdiAccounts]);

    useEffect(() => {
        fetchEdiAccounts();
        fetchCustomerAccounts();
        fetchTransactionOptions();
    }, []);

    // Add this useEffect to debug when data changes (around line 395, after your existing useEffects):
    useEffect(() => {
        console.log('=== DATA LOADING DEBUG ===');
        console.log('allCustomerAccounts updated:', allCustomerAccounts.length);
        if (allCustomerAccounts.length > 0) {
            console.log('Sample customer:', allCustomerAccounts[0]);
            console.log('Customer fields:', Object.keys(allCustomerAccounts[0]));
        }
        console.log('allEdiAccounts updated:', allEdiAccounts.length);
        if (allEdiAccounts.length > 0) {
            console.log('Sample EDI account:', allEdiAccounts[0]);
            console.log('EDI fields:', Object.keys(allEdiAccounts[0]));
        }
    }, [allCustomerAccounts, allEdiAccounts]);

    // Also add this useEffect to ensure data is loaded on component mount:
    useEffect(() => {
        console.log('=== COMPONENT MOUNTED - FETCHING DATA ===');
        const loadData = async () => {
            await fetchCustomerAccounts();
            await fetchEdiAccounts();
            await fetchTransactionOptions();
        };
        loadData();
    }, []);

    // Replace your filteredRecords useMemo (around line 407) with this version that checks for data:

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

    // Update your pagination to use filteredRecords instead of records:
    const filteredTotalPages = Math.ceil(filteredRecords.length / rowsPerPage);  // Rename this
    const filteredPaginatedRecords = filteredRecords.slice(  // Rename this  
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Update your pagination info display:
    const getCurrentPageInfoUpdated = () => {
        if (filteredRecords.length === 0) return '0 records';
        
        const start = (currentPage - 1) * rowsPerPage + 1;
        const end = Math.min(currentPage * rowsPerPage, filteredRecords.length);
        
        return `${start}-${end} of ${filteredRecords.length} records${filteredRecords.length !== records.length ? ` (filtered from ${records.length})` : ''}`;
    };

    // Reset to page 1 when filters change:
    React.useEffect(() => {
        setCurrentPage(1);
    }, [columnFilters]);

    console.log(allCustomerAccounts);

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
                                                zIndex: 5
                                            }}
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
                                        zIndex: 5,
                                        width: '100px'
                                    }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPaginatedRecords.map((record, index) => (
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
                                {filteredPaginatedRecords.length === 0 && (
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
