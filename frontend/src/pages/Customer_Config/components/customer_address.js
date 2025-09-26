import React from 'react';
import Select from 'react-select';

const CustomerAddress = ({ 
    addresses, 
    allAddresses, // Add this prop
    handleAddressChange, 
    handleAddAddress,
    handleDeleteAddress,
    transactionOptions,
    branchOptions,
    selectedTransaction, // Add this prop
    selectedBranch, // Add this prop
    styles 
}) => {
    console.log('Addresses in component:', addresses);
    
    // Prepare options for react-select
    const transactionSelectOptions = transactionOptions.map(option => ({
        value: option.value || option.transaction_type,
        label: option.label || option.transaction_description || option.value || option.transaction_type
    }));

    const branchSelectOptions = branchOptions.map(option => ({
        value: option.brh_brh,
        label: `${option.brh_brh} - ${option.brh_brh_nm.trim()}`
    }));

    // Calculate filtered counts for display
    const totalAddresses = allAddresses?.length || 0;
    const filteredCount = addresses.length;
    const isFiltered = (selectedTransaction && selectedTransaction !== 'ALL') || (selectedBranch && selectedBranch !== 'ALL');
    
    return (
        <div style={styles.section}>
            <div style={styles.addAddressSection}>
                <h2 style={styles.sectionTitle}>
                    Trading Partner Addresses
                    {isFiltered && (
                        <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                            {` (${filteredCount} of ${totalAddresses} shown`}
                            {selectedTransaction && selectedTransaction !== 'ALL' && ` - ${selectedTransaction === '' ? 'Default Transaction (null/empty)' : `Transaction: ${selectedTransaction}`}`}
                            {selectedBranch && selectedBranch !== 'ALL' && ` - ${selectedBranch === '' ? 'Default Branch (null/empty)' : `Branch: ${selectedBranch}`}`}
                            {`)` }
                        </span>
                    )}
                </h2>
                <button
                    style={{...styles.button, ...styles.addButton}}
                    onClick={handleAddAddress}
                >
                    Add Address
                </button>
            </div>

            {isFiltered && addresses.length === 0 && totalAddresses > 0 && (
                <div style={{ 
                    textAlign: 'center', 
                    color: '#666', 
                    fontStyle: 'italic', 
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                }}>
                    No addresses match the selected filters:
                    {selectedTransaction && selectedTransaction !== 'ALL' && (
                        <span> {selectedTransaction === '' ? 'Default Transaction (null/empty)' : `Transaction: ${selectedTransaction}`}</span>
                    )}
                    {selectedBranch && selectedBranch !== 'ALL' && selectedTransaction && selectedTransaction !== 'ALL' && <span> and</span>}
                    {selectedBranch && selectedBranch !== 'ALL' && (
                        <span> {selectedBranch === '' ? 'Default Branch (null/empty)' : `Branch: ${selectedBranch}`}</span>
                    )}
                    <br />
                    Total addresses available: {totalAddresses}
                </div>
            )}

            <div style={styles.addressesContainer}>
                {addresses.map((address) => {
                    console.log('Rendering address:', address);
                    
                    // Get selected values for this address
                    const selectedTransaction = transactionSelectOptions.find(opt => opt.value === address.transaction) || null;
                    const selectedBranch = branchSelectOptions.find(opt => opt.value === address.branch) || null;
                    
                    return (
                        <div 
                            key={address.id} 
                            style={styles.addressCard}
                        >
                            

                            <div style={styles.addressField}>
                                <div style={styles.addressLabel}>Transaction Type</div>
                                <Select
                                    placeholder="Select transaction type"
                                    isClearable
                                    onChange={(selectedOption) => handleAddressChange(address.id, 'transaction', selectedOption ? selectedOption.value : '')}
                                    value={selectedTransaction}
                                    options={transactionSelectOptions}
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            border: '1px solid #ccc',
                                            borderRadius: 3,
                                            fontSize: '14px',
                                            minHeight: '32px'
                                        }),
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        menu: (base) => ({ ...base, zIndex: 9999 })
                                    }}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                            </div>

                            <div style={styles.addressField}>
                                <div style={styles.addressLabel}>Branch</div>
                                <Select
                                    placeholder="Select branch"
                                    isClearable
                                    onChange={(selectedOption) => handleAddressChange(address.id, 'branch', selectedOption ? selectedOption.value : '')}
                                    value={selectedBranch}
                                    options={branchSelectOptions}
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            border: '1px solid #ccc',
                                            borderRadius: 3,
                                            fontSize: '14px',
                                            minHeight: '32px'
                                        }),
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        menu: (base) => ({ ...base, zIndex: 9999 })
                                    }}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                            </div>

                            <div style={styles.addressField}>
                                <div style={styles.addressLabel}>Address Type</div>
                                <input
                                    type="text"
                                    value={address.addressType || ''}
                                    onChange={(e) => handleAddressChange(address.id, 'addressType', e.target.value)}
                                    style={styles.addressInput}
                                    maxLength={2}
                                    placeholder="Enter address type"
                                />
                            </div>

                            <div style={styles.addressField}>
                                <div style={styles.addressLabel}>Address Code</div>
                                <input
                                    type="text"
                                    value={address.addressCode || ''}
                                    maxLength={2}
                                    onChange={(e) => handleAddressChange(address.id, 'addressCode', e.target.value)}
                                    style={styles.addressInput}
                                    placeholder="Enter address code"
                                />
                            </div>

                            <div style={styles.addressField}>
                                <div style={styles.addressLabel}>Address Identifier</div>
                                <input
                                    type="text"
                                    value={address.addressIdentifier || ''}
                                    maxLength={10}
                                    onChange={(e) => handleAddressChange(address.id, 'addressIdentifier', e.target.value)}
                                    style={styles.addressInput}
                                    placeholder="Enter address identifier"
                                />
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <button
                                    style={{
                                        ...styles.button,
                                        ...styles.deleteButton,
                                        fontSize: '10px',
                                        padding: '4px 6px'
                                    }}
                                    onClick={() => handleDeleteAddress(address.id)}
                                    title="Remove this address"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        
                    );
                })}
            </div>

            {addresses.length === 0 && !isFiltered && (
                <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '40px' }}>
                    No addresses configured. Click "Add Address" to get started.
                </div>
            )}
        </div>
    );
};

export default CustomerAddress;