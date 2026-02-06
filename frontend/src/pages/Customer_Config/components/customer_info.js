import React, { useState, useEffect } from 'react';

const CustomerInfo = ({ customer, handleInputChange, styles, isAddMode }) => {
    const [connectedInvexCustomers, setConnectedInvexCustomers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch connected Invex customers for this trading partner
    useEffect(() => {
        const fetchConnectedInvexCustomers = async () => {
            // Only fetch if we have an EDI account ID (not in add mode with no ID yet)
            if (!customer?.ediCustomerNumber && !customer?.edia_edi_account_id) {
                setConnectedInvexCustomers([]);
                return;
            }

            setLoading(true);
            try {
                // Get the EDI account ID from either field
                const ediAccountId = customer.ediCustomerNumber || customer.edia_edi_account_id;
                
                // Fetch all customers to find the one that matches this EDI account ID
                const response = await fetch(`${process.env.REACT_APP_HOST}/CustomerConfiguration/customers`);
                const allTradingPartners = await response.json();
                
                // Find the current trading partner
                const currentTradingPartner = allTradingPartners.find(tp => 
                    tp.edia_edi_account_id === ediAccountId
                );
                
                if (currentTradingPartner && currentTradingPartner.invex_account_ids) {
                    // Parse the comma-separated Invex account IDs
                    const invexAccountIds = currentTradingPartner.invex_account_ids
                        .split(',')
                        .map(id => id.trim())
                        .filter(id => id); // Remove empty strings
                    
                    // Fetch Invex customer details for these specific IDs
                    const invexResponse = await fetch(`${process.env.REACT_APP_HOST}/RoutingTrans/InvexCustomers`);
                    const invexData = await invexResponse.json();
                    
                    // Filter to only show the connected customers
                    const connectedCustomers = invexData.customers.Data.filter(invexCustomer =>
                        invexAccountIds.includes(invexCustomer.eii_ichg_acct_id)
                    );
                    
                    console.log('Connected Invex customers:', connectedCustomers);
                    setConnectedInvexCustomers(connectedCustomers);
                } else {
                    // No connected customers found
                    setConnectedInvexCustomers([]);
                }
            } catch (error) {
                console.error('Error fetching connected Invex customers:', error);
                setConnectedInvexCustomers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchConnectedInvexCustomers();
    }, [customer?.ediCustomerNumber, customer?.edia_edi_account_id]); // Re-fetch when EDI account ID changes

    return (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* Left side - Connected Invex Customers List */}
            <div style={{
                width: '300px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '300px', // Set minimum height to match form
                maxHeight: '400px'   // Set maximum height
            }}>
                <h3 style={{
                    margin: '0 0 15px 0',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#333',
                    borderBottom: '1px solid #dee2e6',
                    paddingBottom: '10px',
                    flexShrink: 0  // Prevent header from shrinking
                }}>
                    Connected Invex Customers
                    {connectedInvexCustomers.length > 0 && (
                        <span style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            fontWeight: 'normal' 
                        }}>
                            {' '}({connectedInvexCustomers.length})
                        </span>
                    )}
                </h3>
                
                {/* Scrollable content area */}
                <div style={{
                    flex: 1,  // Take up remaining space
                    overflowY: 'auto',  // Make scrollable
                    minHeight: 0  // Allow shrinking below content size
                }}>
                    {loading ? (
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#666'
                        }}>
                            Loading connected customers...
                        </div>
                    ) : isAddMode ? (
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#666',
                            fontStyle: 'italic',
                            textAlign: 'center',
                            padding: '20px'
                        }}>
                            Connected customers will appear after saving the trading partner.
                        </div>
                    ) : connectedInvexCustomers.length === 0 ? (
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#999',
                            fontSize: '14px',
                            fontStyle: 'italic',
                            textAlign: 'center',
                            padding: '20px'
                        }}>
                            No Invex customers connected to this trading partner.
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '4px 0'  // Add some padding for better scrolling
                        }}>
                            {connectedInvexCustomers.map((invexCustomer, index) => (
                                <div
                                    key={invexCustomer.eii_ichg_acct_id || index}
                                    style={{
                                        padding: '10px 12px',
                                        fontSize: '13px',
                                        backgroundColor: '#fff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '4px',
                                        color: '#555',
                                        lineHeight: '1.4',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        flexShrink: 0  // Prevent items from shrinking
                                    }}
                                    title={`${invexCustomer.eii_ichg_acct_id} - ${invexCustomer.cus_cus_nm || 'No Name'}`}
                                >
                                    <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#333',
                                        marginBottom: '4px'
                                    }}>
                                        {invexCustomer.eii_ichg_acct_id}
                                    </div>
                                    {invexCustomer.cus_cus_nm && (
                                        <div style={{ 
                                            color: '#666',
                                            fontSize: '12px',
                                            lineHeight: '1.3',
                                            wordWrap: 'break-word'
                                        }}>
                                            {invexCustomer.cus_cus_nm}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side - Trading Partner Information Form */}
            <div style={{ flex: 1 }}>
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Trading Partner Information</h2>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            
                            <label style={styles.label}>EDI Trading Partner Number *</label>
                            <input
                                type="text"
                                name="ediCustomerNumber"
                                value={customer.ediCustomerNumber}
                                onChange={handleInputChange}
                                style={{
                                    ...styles.input,
                                    backgroundColor: '#f8f9fa',
                                    cursor: 'not-allowed'
                                }}
                                maxLength={8}
                                placeholder={isAddMode ? "Generating..." : "EDI Customer Number"}
                                readOnly={true}
                                disabled={true}
                            />
                            {isAddMode && (
                                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                                    Number is automatically generated and cannot be changed
                                </small>
                            )}
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Trading Partner Name *</label>
                            <input
                                type="text"
                                name="customerName"
                                value={customer.customerName}
                                onChange={handleInputChange}
                                style={styles.input}
                                placeholder="Enter Trading Partner name"
                            />
                        </div>
                    </div>
                    <div style={styles.formRow}>
                        <div style={{
                            ...styles.formGroup,
                            width: '150px' // Shrink the AS400 XREF field width
                        }}>
                            <label style={styles.label}>AS400 XREF</label>
                            <input
                                type="text"
                                name="as400Xref"
                                value={customer.as400Xref}
                                onChange={handleInputChange}
                                style={{
                                    ...styles.input,
                                    width: '100%' // Use full width of the smaller container
                                }}
                                maxLength={5}
                                placeholder="AS400"
                            />
                        </div>
                        <div style={styles.formGroup}>
                            {/* Empty div to maintain layout balance */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerInfo;