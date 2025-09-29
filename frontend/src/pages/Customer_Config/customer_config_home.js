import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcClearFilters } from "react-icons/fc";
import { FiPlus } from "react-icons/fi";

const CustomerConfig = () => {
    const [customers, setCustomers] = useState([]);
    const [allCustomerAccounts, setAllCustomerAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const navigate = useNavigate();
    
    // Add the filter state for customer table fields
    const [columnFilters, setColumnFilters] = useState({
        invex_account_ids: '', // Changed from edia_invex_account_id to invex_account_ids
        edia_edi_account_id: '',
        edia_cust_name: '',
        edia_as400_xref: '',
        transactions: ''  // ADD THIS LINE
    });
    
    const hasAttemptedRestore = useRef(false);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers`);
            const data = await response.json();
            setCustomers(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching customers:', error);
            setLoading(false);
        }
    };

    // Update the fetchCustomerAccounts function to add debugging:
    const fetchCustomerAccounts = async () => {
        try {
            console.log('Fetching customer accounts...');
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/InvexCustomers`);
            const data = await response.json();
            console.log('Customer accounts fetched:', data);
            console.log('Sample customer account:', data[0]);
            setAllCustomerAccounts(data.customers.Data);
        } catch (error) {
            console.error('Error fetching customer accounts:', error);
            setAllCustomerAccounts([]);
        }
    };

    // Add this helper function after the fetchCustomerAccounts function (around line 42):
    const getCustomerDisplayName = (invexAccountIds) => {
        if (!invexAccountIds || !allCustomerAccounts || allCustomerAccounts.length === 0) {
            return invexAccountIds || '';
        }
        
        // Handle comma-separated multiple account IDs
        if (invexAccountIds.includes(',')) {
            const accountIds = invexAccountIds.split(',').map(id => id.trim());
            const displayNames = accountIds.map(accountId => {
                const customerAccount = allCustomerAccounts.find(acc => acc.eii_ichg_acct_id === accountId);
                return customerAccount && customerAccount.cus_cus_nm 
                    ? `${accountId} - ${customerAccount.cus_cus_nm}`
                    : accountId;
            });
            return displayNames.join(', ');
        }
        
        // Handle single account ID
        const customerAccount = allCustomerAccounts.find(acc => acc.eii_ichg_acct_id === invexAccountIds);
        return customerAccount && customerAccount.cus_cus_nm 
            ? `${invexAccountIds} - ${customerAccount.cus_cus_nm}`
            : invexAccountIds;
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
        }, 3000);
    };

    // Restore filters from sessionStorage on component mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem('CustomerConfig');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.columnFilters) {
                    // Handle migration from old field name to new field name
                    const filters = { ...parsed.columnFilters };
                    if (filters.edia_invex_account_id && !filters.invex_account_ids) {
                        filters.invex_account_ids = filters.edia_invex_account_id;
                        delete filters.edia_invex_account_id;
                    }
                    setColumnFilters(filters);
                }
                if (parsed.searchTerm) {
                    setSearchTerm(parsed.searchTerm);
                }
            }
        } catch (err) {
            console.log('Error restoring customer config filters:', err);
        } finally {
            hasAttemptedRestore.current = true;
        }
        
        fetchCustomers();
        fetchCustomerAccounts(); // Add this line
    }, []);

    // Save filters to sessionStorage whenever they change
    useEffect(() => {
        if (!hasAttemptedRestore.current) return;
        try {
            sessionStorage.setItem('CustomerConfig', JSON.stringify({
                columnFilters: columnFilters,
                searchTerm: searchTerm
            }));
        } catch (err) {
            console.log('Error saving customer config filters:', err);
        }
    }, [columnFilters, searchTerm]);

    const handleEdit = (customer) => {
        navigate(`/TPConfiguration/edit/${customer.edia_edi_account_id}`, {
            state: { customerData: customer }
        });
    };

    const handleAdd = () => {
        navigate('/TPConfiguration/add');
    };

    const handleDelete = async (customerId) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers/${customerId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    await fetchCustomers();
                    showNotification('Customer deleted successfully!', 'success');
                } else {
                    const errorData = await response.json();
                    showNotification(`Error deleting customer: ${errorData.error || 'Please try again.'}`, 'error');
                }
            } catch (error) {
                console.error('Error deleting customer:', error);
                showNotification('Error deleting customer. Please try again.', 'error');
            }
        }
    };

    // Clear all filters function
    const clearAllFilters = () => {
        setColumnFilters({
            invex_account_ids: '',
            edia_edi_account_id: '',
            edia_cust_name: '',
            edia_as400_xref: '',
            transactions: ''  // ADD THIS LINE
        });
        setSearchTerm('');
    };

    // Enhanced filter logic that combines both search term and column filters
    const displayedCustomers = React.useMemo(() => {
        let data = [...customers];
        
        // Apply search term filter (existing logic)
        if (searchTerm && searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            data = data.filter(customer => {
                const customerDisplayName = getCustomerDisplayName(customer.invex_account_ids);
                // Handle transactions array search
                const transactionsStr = Array.isArray(customer.transactions) 
                    ? customer.transactions.join(', ').toLowerCase()
                    : String(customer.transactions || '').toLowerCase();
                
                return (
                    customerDisplayName.toLowerCase().includes(searchLower) ||
                    customer.edia_edi_account_id?.toLowerCase().includes(searchLower) ||
                    customer.edia_cust_name?.toLowerCase().includes(searchLower) ||
                    customer.edia_as400_xref?.toLowerCase().includes(searchLower) ||
                    transactionsStr.includes(searchLower)
                );
            });
        }
        
        // Apply column filters with LIKE comparisons
        const cf = columnFilters;
        const invexIdNeedle = (cf.invex_account_ids || '').toLowerCase();
        const ediIdNeedle = (cf.edia_edi_account_id || '').toLowerCase();
        const custNameNeedle = (cf.edia_cust_name || '').toLowerCase();
        const as400XrefNeedle = (cf.edia_as400_xref || '').toLowerCase();
        const transactionsNeedle = (cf.transactions || '').toLowerCase();

        if (invexIdNeedle || ediIdNeedle || custNameNeedle || as400XrefNeedle || transactionsNeedle) {
            data = data.filter(customer => {
                const invexIdStr = getCustomerDisplayName(customer.invex_account_ids).toLowerCase();
                const ediIdStr = String(customer.edia_edi_account_id || '').toLowerCase();
                const custNameStr = String(customer.edia_cust_name || '').toLowerCase();
                const as400XrefStr = String(customer.edia_as400_xref || '').toLowerCase();
                
                // Handle transactions array for filtering
                const transactionsStr = Array.isArray(customer.transactions) 
                    ? customer.transactions.join(', ').toLowerCase()
                    : String(customer.transactions || '').toLowerCase();

                // All filters use LIKE comparison (includes/contains)
                return (
                    (!invexIdNeedle || invexIdStr.includes(invexIdNeedle)) &&
                    (!ediIdNeedle || ediIdStr.includes(ediIdNeedle)) &&
                    (!custNameNeedle || custNameStr.includes(custNameNeedle)) &&
                    (!as400XrefNeedle || as400XrefStr.includes(as400XrefNeedle)) &&
                    (!transactionsNeedle || transactionsStr.includes(transactionsNeedle))
                );
            });
        }
        
        return data;
    }, [customers, searchTerm, columnFilters, allCustomerAccounts]); // Add allCustomerAccounts as dependency

    const styles = {
        container: {
            padding: '20px',
            maxWidth: '1400px',
            margin: '0 auto',
            position: 'relative'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: '15px'
        },
        title: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333',
            margin: 0
        },
        addButton: {
            backgroundColor: 'transparent',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
        },
        searchContainer: {
            marginBottom: '20px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
        },
        searchInput: {
            width: '400px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px'
        },
        clearButton: {
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
        },
        th: {
            backgroundColor: '#f8f9fa',
            color: '#333',
            fontWeight: 'bold',
            padding: '15px',
            textAlign: 'left',
            borderBottom: '2px solid #dee2e6',
            fontSize: '14px',
            position: 'sticky',
            top: 0,
            zIndex: 10
        },
        filterTh: {
            backgroundColor: '#fff',
            padding: 0,
            borderBottom: '1px solid #dee2e6'
        },
        filterInput: {
            width: '100%',
            padding: '8px',
            border: 'none',
            outline: 'none',
            fontSize: '12px',
            boxSizing: 'border-box'
        },
        clearFilterButton: {
            width: '100%',
            padding: '8px',
            border: 'none',
            outline: 'none',
            fontSize: '12px',
            boxSizing: 'border-box',
            backgroundColor: 'white', // Explicit white background
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #dee2e6',
            fontSize: '14px'
        },
        tdcust: {
            padding: '12px',
            borderBottom: '1px solid #dee2e6',
            fontSize: '14px',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            maxWidth: '250px',
            overflowWrap: 'break-word',
        },
        actionButton: {
            margin: '0 3px',
            padding: '5px 8px',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        editButton: {
            backgroundColor: '#007bff',
            color: 'white'
        },
        deleteButton: {
            backgroundColor: '#dc3545',
            color: 'white'
        },
        loading: {
            textAlign: 'center',
            fontSize: '18px',
            color: '#666',
            marginTop: '50px'
        },
        noResults: {
            textAlign: 'center',
            fontSize: '16px',
            color: '#666',
            fontStyle: 'italic',
            padding: '40px'
        },
        notification: {
            position: 'fixed',
            top: '10%',
            left: '50%',
            transform: notification.show 
                ? 'translate(-50%, -50%) scale(1)' 
                : 'translate(-50%, -50%) scale(0)',
            padding: '20px 30px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            zIndex: 1000,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
            transition: 'transform 0.3s ease-in-out',
            minWidth: '300px',
            textAlign: 'center',
            opacity: notification.show ? 1 : 0
        },
        notificationSuccess: {
            backgroundColor: '#28a745'
        },
        notificationError: {
            backgroundColor: '#dc3545'
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading customers...</div>
            </div>
        );
    }
    console.log(displayedCustomers)
    return (
        <div style={styles.container}>
            {/* Notification popup */}
            <div style={{
                ...styles.notification,
                ...(notification.type === 'success' ? styles.notificationSuccess : styles.notificationError)
            }}>
                {notification.message}
            </div>

            <div style={styles.header}>
                <h1 style={styles.title}>Trading Partner Configuration</h1>
                <button 
                    style={styles.addButton} 
                    onClick={handleAdd}
                >
                <FiPlus size={22} color="#000000ff" />
                </button>
            </div>

            <table style={styles.table}>
                <thead>
                    {/* Filter row */}
                    <tr>
                        <th style={styles.filterTh}>
                            <input
                                type="text"
                                placeholder="Filter Invex ID..."
                                value={columnFilters.invex_account_ids}
                                onChange={(e) => setColumnFilters(prev => ({ 
                                    ...prev, 
                                    invex_account_ids: e.target.value 
                                }))}
                                style={styles.filterInput}
                            />
                        </th>
                        <th style={styles.filterTh}>
                            <input
                                type="text"
                                placeholder="Filter Trading Partner ID..."
                                value={columnFilters.edia_edi_account_id}
                                onChange={(e) => setColumnFilters(prev => ({ 
                                    ...prev, 
                                    edia_edi_account_id: e.target.value 
                                }))}
                                style={styles.filterInput}
                            />
                        </th>
                        <th style={styles.filterTh}>
                            <input
                                type="text"
                                placeholder="Filter Trading Partner Name..."
                                value={columnFilters.edia_cust_name}
                                onChange={(e) => setColumnFilters(prev => ({ 
                                    ...prev, 
                                    edia_cust_name: e.target.value 
                                }))}
                                style={styles.filterInput}
                            />
                        </th>
                        <th style={styles.filterTh}>
                            <input
                                type="text"
                                placeholder="Filter AS400 XREF..."
                                value={columnFilters.edia_as400_xref}
                                onChange={(e) => setColumnFilters(prev => ({ 
                                    ...prev, 
                                    edia_as400_xref: e.target.value 
                                }))}
                                style={styles.filterInput}
                            />
                        </th>
                        {/* ADD THIS TRANSACTIONS FILTER */}
                        <th style={styles.filterTh}>
                            <input
                                type="text"
                                placeholder="Filter Transactions..."
                                value={columnFilters.transactions}
                                onChange={(e) => setColumnFilters(prev => ({ 
                                    ...prev, 
                                    transactions: e.target.value 
                                }))}
                                style={styles.filterInput}
                            />
                        </th>
                        <th style={styles.filterTh}>
                          <button
                                onClick={() => clearAllFilters()}
                                title={'Clear Filters'}
                                aria-label={'Clear Filters'}
                                style={styles.clearFilterButton} // Use the new style instead of filterInput
                            >
                                <FcClearFilters size={22}/>
                            </button>  

                        </th>
                    </tr>
                    {/* Header row */}
                    <tr>
                        <th style={styles.th}>Invex Account ID</th>
                        <th style={styles.th}>Trading Partner ID</th>
                        <th style={styles.th}>Trading Partner Name</th>
                        <th style={styles.th}>AS400 XREF</th>
                        <th style={styles.th}>Transactions</th>  {/* ADD THIS HEADER */}
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedCustomers.length > 0 ? (
                        displayedCustomers.map((customer) => (
                            <tr key={customer.id || customer.edia_invex_account_id}>
                                <td 
                                    style={styles.tdcust}
                                    title={getCustomerDisplayName(customer.invex_account_ids)} // Add title for hover
                                >
                                    {getCustomerDisplayName(customer.invex_account_ids)}
                                </td>
                                <td style={styles.td}>{customer.edia_edi_account_id}</td>
                                <td style={styles.td}>{customer.edia_cust_name}</td>
                                <td style={styles.td}>{customer.edia_as400_xref}</td>
                                <td style={styles.td}>
                                    {Array.isArray(customer.transactions) 
                                        ? customer.transactions.join(', ') 
                                        : customer.transactions || ''}
                                </td>
                                <td style={styles.td}>
                                    <button
                                        style={{...styles.actionButton, ...styles.editButton}}
                                        onClick={() => handleEdit(customer)}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        style={{...styles.actionButton, ...styles.deleteButton}}
                                        onClick={() => handleDelete(customer.edia_edi_account_id)}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6" style={styles.noResults}>  {/* UPDATE COLSPAN FROM 5 TO 6 */}
                                No Trading Partner found matching your search criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Show filter status */}
            {(Object.values(columnFilters).some(v => v) || searchTerm) && (
                <div style={{ 
                    marginTop: '15px', 
                    textAlign: 'center', 
                    color: '#666', 
                    fontSize: '14px' 
                }}>
                    Showing {displayedCustomers.length} of {customers.length} Trading Partner
                    {(Object.values(columnFilters).some(v => v) || searchTerm) && ' (filtered)'}
                </div>
            )}
        </div>
    );
};

export default CustomerConfig;