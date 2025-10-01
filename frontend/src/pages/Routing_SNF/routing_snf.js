import React, { useEffect, useState } from "react";
import { FiFilter, FiPlus, FiEdit, FiTrash2, FiDownload, FiChevronUp, FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
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
    columns,
    showModal,
    openAddModal,
    openEditModal,
    closeModal,
    handleFormChange,
    formData,
    handleSave,
    editingRecord,
    handleDelete,
    FILTER_ROW_HEIGHT,
    setShowFilters,
    showFilters,
    getColumnDisplayName,
    formatValue,
    fetchCustomerAccounts,
    getCustomerDisplayName,
    getTradingPartnerDisplayName,
    allCustomerAccounts,
    allEdiAccounts,
    transactionOptions
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
 const [showEdiSearchModal, setShowEdiSearchModal] = useState(false);
    const [ediSearchTerm, setEdiSearchTerm] = useState('');
    const [ediAccounts, setEdiAccounts] = useState([]);
    const [ediSearchLoading, setEdiSearchLoading] = useState(false);
    const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerAccounts, setCustomerAccounts] = useState([]);
    const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
    const [customerModalFilters, setCustomerModalFilters] = useState({});
    const [ediModalFilters, setEdiModalFilters] = useState({});
    
    const [transactionLoading, setTransactionLoading] = useState(false);
    // State variables
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    // Pagination
    const rowsPerPage = 15; // Changed from 20 to 10
        const totalPages = Math.ceil(records.length / rowsPerPage);

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


    

    // Enhanced field descriptions
    const enhancedFieldDescriptions = {
        customer_id: 'Select an Invex customer account',
        edi_account_id: 'Select a trading partner account',
        transactions: 'Select transaction types that need routing',
        isa_qualifier: 'Auto-populated from customer account',
        isa_id: 'Auto-populated from customer account'
    };

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
                const ediId = record[columnName];
                // If it's numeric, pad with zeros for proper string sorting
                if (/^\d+$/.test(ediId)) {
                    return ediId.padStart(10, '0'); // Pad to 10 digits for consistent sorting
                }
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
        console.log('allCustomerAccounts loaded:', allCustomerAccounts?.length || 0);
        console.log('allEdiAccounts loaded:', allEdiAccounts?.length || 0);
        
        // Don't filter if reference data isn't loaded yet
        if (!allCustomerAccounts?.length || !allEdiAccounts?.length) {
            console.log('⚠️ Reference data not loaded yet, skipping filtering');
            return records || [];
        }
        
        let data = [...(records || [])];
        
        // Apply column filters with LIKE comparisons
        const filters = columnFilters || {};
        
        if (Object.values(filters).some(value => value && value.trim() !== '')) {
            console.log('Applying filters:', filters);
            
            data = data.filter(record => {
                if (!record) return false;
                
                console.log('Filtering record:', record);
        
                // Customer ID filter (LIKE comparison) - Enhanced to match ID or Name separately
                if (filters.customer_id && filters.customer_id.trim() !== '') {
                    const filterValue = filters.customer_id.toLowerCase();
                    const customerId = String(record.customer_id || '').toLowerCase();
                    
                    // Find the customer account by matching the ID
                    const customerAccount = allCustomerAccounts.find(acc => {
                        return acc.eii_ichg_acct_id === record.customer_id;
                    });
                    
                    const customerName = customerAccount ? String(customerAccount.cus_cus_nm || '').toLowerCase() : '';
                    
                    // Check if filter matches ID OR name OR the combined display string
                    const customerDisplay = getCustomerDisplayName(record.customer_id).toLowerCase();
                    const idMatches = customerId.includes(filterValue);
                    const nameMatches = customerName.includes(filterValue);
                    const displayMatches = customerDisplay.includes(filterValue);
                    const matches = idMatches || nameMatches || displayMatches;
                    
                    if (!matches) {
                        return false;
                    }
                }
                
                // EDI Account ID filter (LIKE comparison) - Enhanced to match ID or Name separately
                if (filters.edi_account_id && filters.edi_account_id.trim() !== '') {
                    const filterValue = filters.edi_account_id.toLowerCase();
                    const ediAccountId = String(record.edi_account_id || '').toLowerCase();
                    
                    // Find the EDI account to get the name
                    const ediAccount = allEdiAccounts.find(acc => {
                        return acc.edia_edi_account_id === record.edi_account_id;
                    });
                    
                    const ediAccountName = ediAccount ? String(ediAccount.edia_cust_name || '').toLowerCase() : '';
                    
                    // Check if filter matches ID OR name OR the combined display string
                    const ediDisplay = getTradingPartnerDisplayName(record.edi_account_id).toLowerCase();
                    const idMatches = ediAccountId.includes(filterValue);
                    const nameMatches = ediAccountName.includes(filterValue);
                    const displayMatches = ediDisplay.includes(filterValue);
                    const matches = idMatches || nameMatches || displayMatches;
                    
                    if (!matches) {
                        return false;
                    }
                }
                
                // Transactions array filter (LIKE comparison)
                if (filters.transactions && filters.transactions.trim() !== '') {
                    const transactionsStr = Array.isArray(record.transactions) 
                        ? record.transactions.join(', ').toLowerCase()
                        : String(record.transactions || '').toLowerCase();
                    
                    const matches = transactionsStr.includes(filters.transactions.toLowerCase());
                    
                    if (!matches) {
                        return false;
                    }
                }
                
                // ISA Qualifier filter (LIKE comparison)
                if (filters.isa_qualifier && filters.isa_qualifier.trim() !== '') {
                    const isaQualifier = String(record.isa_qualifier || '').toLowerCase();
                    if (!isaQualifier.includes(filters.isa_qualifier.toLowerCase())) {
                        return false;
                    }
                }
                
                // ISA ID filter (LIKE comparison)
                if (filters.isa_id && filters.isa_id.trim() !== '') {
                    const isaId = String(record.isa_id || '').toLowerCase();
                    if (!isaId.includes(filters.isa_id.toLowerCase())) {
                        return false;
                    }
                }
                
                return true;
            });
        }
        
        console.log('Final filtered records count:', data.length);
        return data;
    }, [records, columnFilters, allCustomerAccounts, allEdiAccounts, getCustomerDisplayName, getTradingPartnerDisplayName]);

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
    }, [filteredRecords, sortConfig]);

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

    // Clear filter functions
const clearCustomerModalFilters = () => {
    setCustomerModalFilters({});
};

const clearEdiModalFilters = () => {
    setEdiModalFilters({});
};

    // Update the customer search filtering logic
    const filteredCustomerAccounts = React.useMemo(() => {
        let filtered = allCustomerAccounts || [];
        
        // Apply search term filter
        if (customerSearchTerm && customerSearchTerm.trim() !== '') {
            const searchLower = customerSearchTerm.toLowerCase();
            filtered = filtered.filter(account => 
                account.eii_ichg_acct_typ?.toLowerCase().includes(searchLower) ||
                account.eii_ichg_acct_id?.toLowerCase().includes(searchLower) ||
                account.eii_edix_iiq?.toLowerCase().includes(searchLower) ||
                account.eii_edix_ichid?.toLowerCase().includes(searchLower) ||
                account.cus_cus_nm?.toLowerCase().includes(searchLower)
            );
        }
        
        // Apply column filters
        const filters = customerModalFilters || {};
        if (Object.values(filters).some(value => value && value.trim() !== '')) {
            filtered = filtered.filter(account => {
                if (!account) return false;
                
                // Account Type filter
                if (filters.account_type && filters.account_type.trim() !== '') {
                    const accountType = String(account.eii_ichg_acct_typ || '').toLowerCase();
                    if (!accountType.includes(filters.account_type.toLowerCase())) {
                        return false;
                    }
                }
                
                // Customer ID filter
                if (filters.customer_id && filters.customer_id.trim() !== '') {
                    const customerId = String(account.eii_ichg_acct_id || '').toLowerCase();
                    const customerName = String(account.cus_cus_nm || '').toLowerCase();
                    const filterValue = filters.customer_id.toLowerCase();
                    if (!customerId.includes(filterValue) && !customerName.includes(filterValue)) {
                        return false;
                    }
                }
                
                // ISA Qualifier filter
                if (filters.isa_qualifier && filters.isa_qualifier.trim() !== '') {
                    const isaQualifier = String(account.eii_edix_iiq || '').toLowerCase();
                    if (!isaQualifier.includes(filters.isa_qualifier.toLowerCase())) {
                        return false;
                    }
                }
                
                // ISA ID filter
                if (filters.isa_id && filters.isa_id.trim() !== '') {
                    const isaId = String(account.eii_edix_ichid || '').toLowerCase();
                    if (!isaId.includes(filters.isa_id.toLowerCase())) {
                        return false;
                    }
                }
                
                return true;
            });
        }
        
        return filtered;
    }, [allCustomerAccounts, customerSearchTerm, customerModalFilters]);

    // Update the EDI search filtering logic
    const filteredEdiAccounts = React.useMemo(() => {
        let filtered = allEdiAccounts || [];
        
        // Apply search term filter
        if (ediSearchTerm && ediSearchTerm.trim() !== '') {
            const searchLower = ediSearchTerm.toLowerCase();
            filtered = filtered.filter(account => 
                account.edia_edi_account_id?.toLowerCase().includes(searchLower) ||
                account.edia_cust_name?.toLowerCase().includes(searchLower) ||
                account.edia_as400_xref?.toLowerCase().includes(searchLower) ||
                account.invex_account_ids?.toLowerCase().includes(searchLower)
            );
        }
        
        // Apply column filters
        const filters = ediModalFilters || {};
        if (Object.values(filters).some(value => value && value.trim() !== '')) {
            filtered = filtered.filter(account => {
                if (!account) return false;
                
                // Trading Partner Account ID filter
                if (filters.edi_account_id && filters.edi_account_id.trim() !== '') {
                    const ediAccountId = String(account.edia_edi_account_id || '').toLowerCase();
                    if (!ediAccountId.includes(filters.edi_account_id.toLowerCase())) {
                        return false;
                    }
                }
                
                // Trading Partner Name filter
                if (filters.trading_partner_name && filters.trading_partner_name.trim() !== '') {
                    const tradingPartnerName = String(account.edia_cust_name || '').toLowerCase();
                    if (!tradingPartnerName.includes(filters.trading_partner_name.toLowerCase())) {
                        return false;
                    }
                }
                
                // AS400 XREF filter
                if (filters.as400_xref && filters.as400_xref.trim() !== '') {
                    const as400Xref = String(account.edia_as400_xref || '').toLowerCase();
                    if (!as400Xref.includes(filters.as400_xref.toLowerCase())) {
                        return false;
                    }
                }
                
                // Invex Account IDs filter
                if (filters.invex_account_ids && filters.invex_account_ids.trim() !== '') {
                    const invexAccountIds = String(account.invex_account_ids || '').toLowerCase();
                    if (!invexAccountIds.includes(filters.invex_account_ids.toLowerCase())) {
                        return false;
                    }
                }
                
                return true;
            });
        }
        
        return filtered;
    }, [allEdiAccounts, ediSearchTerm, ediModalFilters]);

    return (
        <div style={{ width: '100%', minHeight: '80vh', padding: '20px' }}>
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
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '1px solid #dee2e6',
                            paddingBottom: '10px'
                        }}>
                            <h3 style={{ margin: 0 }}>
                                {editingRecord ? 'Edit Routing Transaction' : 'Add New Routing Transaction'}
                            </h3>
                            <button
                                onClick={closeModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    padding: '5px'
                                }}
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            {/* Customer ID Field */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Invex Customer ID <span style={{ color: 'red' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={formData?.customer_id ? 
                                            `${formData.customer_id}${formData.customer_name ? ` - ${formData.customer_name}` : ''}` : 
                                            ''}
                                        onChange={(e) => {
                                            // Extract just the ID part if user manually edits
                                            const value = e.target.value.split(' - ')[0];
                                            handleFormChange('customer_id', value);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                        placeholder="Enter Customer ID"
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
                                <small style={{ color: '#666' }}>
                                    {enhancedFieldDescriptions.customer_id}
                                </small>
                            </div>

                            {/* EDI Account ID Field */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Trading Partner Account ID <span style={{ color: 'red' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={formData?.edi_account_id || ''}
                                        onChange={(e) => handleFormChange('edi_account_id', e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                        placeholder="Enter Trading Partner Account ID"
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
                                <small style={{ color: '#666' }}>
                                    {enhancedFieldDescriptions.edi_account_id}
                                </small>
                            </div>

                            {/* Transactions Field */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Transaction Types <span style={{ color: 'red' }}>*</span>
                                </label>
                                <Select
                                    isMulti
                                    closeMenuOnSelect={false}
                                    hideSelectedOptions={true}  // Changed from false to true
                                    options={transactionOptions}
                                    isClearable={false}
                                    value={Array.isArray(formData?.transactions) 
                                        ? formData.transactions.map(t => ({ value: t, label: t }))
                                        : []
                                    }
                                    onChange={(selectedOptions) => {
                                        const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
                                        handleFormChange('transactions', selectedValues);
                                    }}
                                    placeholder="Select transaction types..."
                                    styles={{
                                        control: (provided, state) => ({
                                            ...provided,
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            minHeight: '40px',
                                            boxShadow: state.isFocused ? '0 0 0 1px #007bff' : 'none',
                                            '&:hover': {
                                                borderColor: '#007bff'
                                            }
                                        }),
                                        multiValue: (provided) => ({
                                            ...provided,
                                            backgroundColor: '#007bff',
                                            borderRadius: '3px'
                                        }),
                                        multiValueLabel: (provided) => ({
                                            ...provided,
                                            color: 'white',
                                            fontSize: '12px'
                                        }),
                                        multiValueRemove: (provided) => ({
                                            ...provided,
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: '#0056b3',
                                                color: 'white'
                                            }
                                        }),
                                        option: (provided, state) => ({
                                            ...provided,
                                            backgroundColor: state.isSelected 
                                                ? '#007bff' 
                                                : state.isFocused 
                                                    ? '#f8f9fa' 
                                                    : 'white',
                                            color: state.isSelected ? 'white' : '#333',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: state.isSelected ? '#007bff' : '#f8f9fa'
                                            }
                                        }),
                                        menu: (provided) => ({
                                            ...provided,
                                            zIndex: 9999
                                        })
                                    }}
                                />
                                <small style={{ color: '#666' }}>
                                    {enhancedFieldDescriptions.transactions}
                                </small>
                            </div>

                            {/* ISA Qualifier Field */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    ISA Qualifier
                                </label>
                                <input
                                    type="text"
                                    value={formData?.isa_qualifier || ''}
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
                                    placeholder="Auto-populated from Customer ID search"
                                />
                                <small style={{ color: '#666' }}>
                                    {enhancedFieldDescriptions.isa_qualifier}
                                </small>
                            </div>

                            {/* ISA ID Field */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    ISA ID
                                </label>
                                <input
                                    type="text"
                                    value={formData?.isa_id || ''}
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
                                    placeholder="Auto-populated from Customer ID search"
                                />
                                <small style={{ color: '#666' }}>
                                    {enhancedFieldDescriptions.isa_id}
                                </small>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                color: '#dc3545',
                                backgroundColor: '#f8d7da',
                                border: '1px solid #f5c6cb',
                                borderRadius: '4px',
                                padding: '10px',
                                marginBottom: '15px'
                            }}>
                                {error}
                            </div>
                        )}

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
                                {loading ? 'Saving...' : (editingRecord ? 'Update' : 'Save')}
                            </button>
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
                                Search EDIX Interchange Accounts
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
                                <FiX size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                onClick={clearCustomerModalFilters}
                                title="Clear Column Filters"
                                style={{
                                    padding: '8px 12px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <FcClearFilters size={20} />
                            </button>
                        </div>

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
                            ) : (!filteredCustomerAccounts || filteredCustomerAccounts.length === 0) ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#666'
                                }}>
                                    {customerSearchTerm || Object.values(customerModalFilters).some(v => v) ? 'No customer accounts found matching your search/filters.' : 'No customer accounts available.'}
                                </div>
                            ) : (
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse'
                                }}>
                                    <thead>
                                        {/* Filter Row */}
                                        <tr>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter Account Type"
                                                    value={customerModalFilters.account_type || ''}
                                                    onChange={(e) => setCustomerModalFilters(prev => ({ ...prev, account_type: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter Customer ID/Name"
                                                    value={customerModalFilters.customer_id || ''}
                                                    onChange={(e) => setCustomerModalFilters(prev => ({ ...prev, customer_id: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter ISA Qualifier"
                                                    value={customerModalFilters.isa_qualifier || ''}
                                                    onChange={(e) => setCustomerModalFilters(prev => ({ ...prev, isa_qualifier: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter ISA ID"
                                                    value={customerModalFilters.isa_id || ''}
                                                    onChange={(e) => setCustomerModalFilters(prev => ({ ...prev, isa_id: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                        </tr>
                                        {/* Header Row */}
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
                                        {filteredCustomerAccounts.map((account, index) => (
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
                                <FiX size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                onClick={clearEdiModalFilters}
                                title="Clear Column Filters"
                                style={{
                                    padding: '8px 12px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <FcClearFilters size={20} />
                            </button>
                        </div>

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
                            ) : (!filteredEdiAccounts || filteredEdiAccounts.length === 0) ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#666'
                                }}>
                                    {ediSearchTerm || Object.values(ediModalFilters).some(v => v) ? 'No Trading Partner accounts found matching your search/filters.' : 'No EDI accounts available.'}
                                </div>
                            ) : (
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse'
                                }}>
                                    <thead>
                                        {/* Filter Row */}
                                        <tr>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter Account ID"
                                                    value={ediModalFilters.edi_account_id || ''}
                                                    onChange={(e) => setEdiModalFilters(prev => ({ ...prev, edi_account_id: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter Partner Name"
                                                    value={ediModalFilters.trading_partner_name || ''}
                                                    onChange={(e) => setEdiModalFilters(prev => ({ ...prev, trading_partner_name: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter AS400 XREF"
                                                    value={ediModalFilters.as400_xref || ''}
                                                    onChange={(e) => setEdiModalFilters(prev => ({ ...prev, as400_xref: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                            <th style={{ padding: 0, background: '#fff', border: '1px solid #dee2e6', borderBottom: 0 }}>
                                                <input
                                                    placeholder="Filter Invex IDs"
                                                    value={ediModalFilters.invex_account_ids || ''}
                                                    onChange={(e) => setEdiModalFilters(prev => ({ ...prev, invex_account_ids: e.target.value }))}
                                                    style={{
                                                        width: '100%',
                                                        height: '35px',
                                                        boxSizing: 'border-box',
                                                        border: 'none',
                                                        outline: 'none',
                                                        padding: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                        </tr>
                                        {/* Header Row */}
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
                                        {filteredEdiAccounts.map((account, index) => (
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
                {!loading && records && records.length > 0 && (
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
                                                        setColumnFilters(column.column_name, val); // Call the prop function correctly
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
                                {paginatedRecords && paginatedRecords.map((record, index) => (
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
                                {(!paginatedRecords || paginatedRecords.length === 0) && (
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
