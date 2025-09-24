import React from 'react';

const CustomerInfo = ({ customer, handleInputChange, styles }) => {
    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Customer Information</h2>
            
            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Invex Customer Number *</label>
                    <input
                        type="text"
                        name="invexCustomerNumber"
                        value={customer.invexCustomerNumber}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Enter Invex customer number"
                        required
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>EDI Customer Number *</label>
                    <input
                        type="text"
                        name="ediCustomerNumber"
                        value={customer.ediCustomerNumber}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Enter EDI customer number"
                        required
                    />
                </div>
            </div>

            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Customer Name</label>
                    <input
                        type="text"
                        name="customerName"
                        value={customer.customerName || ''}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Enter customer name"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>AS400 XREF (optional)</label>
                    <input
                        type="text"
                        name="as400Xref"
                        value={customer.as400Xref || ''}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Enter AS400 cross-reference"
                    />
                </div>
            </div>
        </div>
    );
};

export default CustomerInfo;