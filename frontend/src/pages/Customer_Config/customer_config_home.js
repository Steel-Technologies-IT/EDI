import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CustomerConfig = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const navigate = useNavigate();

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

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
        }, 3000); // Auto-dismiss after 3 seconds
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleEdit = (customer) => {
        navigate(`/CustomerConfiguration/edit/${customer.edia_edi_account_id}`, {
            state: { customerData: customer }
        });
    };

    const handleAdd = () => {
        navigate('/CustomerConfiguration/add');
    };

    const handleDelete = async (customerId) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers/${customerId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    // Refresh the customer list after successful deletion
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

    // Updated filter to search across the actual database fields
    const filteredCustomers = customers.filter(customer =>
        customer.edia_invex_account_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.edia_edi_account_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.edia_invex_rcv_intch_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.edia_invex_rcv_intch_id_qual?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
        },
        searchContainer: {
            marginBottom: '20px'
        },
        searchInput: {
            width: '400px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px'
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
            fontSize: '14px'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #dee2e6',
            fontSize: '14px'
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
                <h1 style={styles.title}>Customer Configuration</h1>
                <button 
                    style={styles.addButton} 
                    onClick={handleAdd}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                >
                    Add New Customer
                </button>
            </div>

            <div style={styles.searchContainer}>
                <input
                    type="text"
                    placeholder="Search customers by Invex ID, EDI ID, Interchange ID, or Qualifier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Invex Account ID</th>
                        <th style={styles.th}>EDI Account ID</th>
                        <th style={styles.th}>Interchange ID</th>
                        <th style={styles.th}>Interchange ID Qualifier</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                            <tr key={customer.id || customer.edia_invex_account_id}>
                                <td style={styles.td}>{customer.edia_invex_account_id}</td>
                                <td style={styles.td}>{customer.edia_edi_account_id}</td>
                                <td style={styles.td}>{customer.edia_invex_rcv_intch_id}</td>
                                <td style={styles.td}>{customer.edia_invex_rcv_intch_id_qual}</td>
                                <td style={styles.td}>
                                    <button
                                        style={{...styles.actionButton, ...styles.editButton}}
                                        onClick={() => handleEdit(customer)} // Pass entire customer object
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        style={{...styles.actionButton, ...styles.deleteButton}}
                                        onClick={() => handleDelete(customer.edia_invex_account_id)}
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
                            <td colSpan="5" style={styles.noResults}>
                                No customers found matching your search criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default CustomerConfig;