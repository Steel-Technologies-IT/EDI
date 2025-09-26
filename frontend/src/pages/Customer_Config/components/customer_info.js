import React from 'react';

const CustomerInfo = ({ customer, handleInputChange, styles, isAddMode }) => {
    return (
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
                            backgroundColor: '#f8f9fa', // Light gray background to indicate read-only
                            cursor: 'not-allowed'
                        }}
                        maxLength={8}
                        placeholder={isAddMode ? "Generating..." : "EDI Customer Number"}
                        readOnly={true} // Make it read-only for both add and edit modes
                        disabled={true} // Also disable it
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
                <div style={styles.formGroup}>
                    <label style={styles.label}>AS400 XREF</label>
                    <input
                        type="text"
                        name="as400Xref"
                        value={customer.as400Xref}
                        onChange={handleInputChange}
                        style={styles.input}
                        maxLength={5}
                        placeholder="Enter AS400 cross reference"
                    />
                </div>
                <div style={styles.formGroup}>
                    {/* Empty div to maintain layout balance */}
                </div>
            </div>
        </div>
    );
};

export default CustomerInfo;