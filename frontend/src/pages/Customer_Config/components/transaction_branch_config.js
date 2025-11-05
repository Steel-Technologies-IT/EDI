import React, { useEffect } from 'react';
import Select from 'react-select';

const TransactionBranchConfig = ({
    customer,
    transactionOptions,
    branchOptions,
    setCustomer,
    styles
}) => {
    // Set default values to "ALL" when component mounts - but only if they're not already set
    useEffect(() => {
        // Only set to "ALL" if values are undefined/null, not if they're empty strings
        if (customer.transaction === undefined || customer.transaction === null) {
            setCustomer(prev => ({
                ...prev,
                transaction: 'ALL'
            }));
        }
        if (customer.branch === undefined || customer.branch === null) {
            setCustomer(prev => ({
                ...prev,
                branch: 'ALL'
            }));
        }
    }, []); // Remove the dependencies to prevent re-running when customer values change

    // Handle transaction change for Select component
    const handleTransactionChange = (selectedOption) => {
        setCustomer(prev => ({
            ...prev,
            transaction: selectedOption ? selectedOption.value : ''
        }));
    };

    // Handle branch change for Select component
    const handleBranchChange = (selectedOption) => {
        setCustomer(prev => ({
            ...prev,
            branch: selectedOption ? selectedOption.value : ''
        }));
    };

    // Prepare transaction options for react-select with ALL and default options
    const transactionSelectOptions = [
        { value: 'ALL', label: 'ALL - Show All Transactions' },
        { value: '', label: 'Default (No Transaction)' },
        ...transactionOptions.map(option => ({
            value: option.value || option.transaction_type,
            label: option.label || option.transaction_description || option.value || option.transaction_type
        }))
    ];

    // Prepare branch options for react-select with ALL and default options
    const branchSelectOptions = [
        { value: 'ALL', label: 'ALL - Show All Branches' },
        { value: '', label: 'Default (No Branch)' },
        ...branchOptions.map(option => ({
            value: option.brh_brh,
            label: `${option.brh_brh} - ${option.brh_brh_nm.trim()}`
        }))
    ];

    // Get current selected values
    const selectedTransaction = transactionSelectOptions.find(opt => opt.value === customer.transaction) || transactionSelectOptions[0]; // Default to "ALL"
    const selectedBranch = branchSelectOptions.find(opt => opt.value === customer.branch) || branchSelectOptions[0]; // Default to "ALL"

    console.log('TransactionBranchConfig - Current values:', {
        customerTransaction: customer.transaction,
        customerBranch: customer.branch,
        selectedTransaction: selectedTransaction,
        selectedBranch: selectedBranch
    });

    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Transaction & Branch Filter</h2>
            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Transaction Type</label>
                    <Select
                        placeholder={<div>Select transaction type</div>}
                        isClearable={false} // Disable clearing to prevent empty selection
                        onChange={handleTransactionChange}
                        value={selectedTransaction}
                        options={transactionSelectOptions}
                        getOptionValue={(opt) => opt.value}
                        getOptionLabel={(opt) => opt.label}
                        styles={{
                            control: (base) => ({
                                ...base,
                                minWidth: 220,
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                padding: '2px',
                                fontSize: '16px'
                            }),
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            menu: (base) => ({ ...base, zIndex: 9999 })
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Branch</label>
                    <Select
                        placeholder={<div>Select branch</div>}
                        isClearable={false} // Disable clearing to prevent empty selection
                        onChange={handleBranchChange}
                        value={selectedBranch}
                        options={branchSelectOptions}
                        getOptionValue={(opt) => opt.value}
                        getOptionLabel={(opt) => opt.label}
                        styles={{
                            control: (base) => ({
                                ...base,
                                minWidth: 220,
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                padding: '2px',
                                fontSize: '16px'
                            }),
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            menu: (base) => ({ ...base, zIndex: 9999 })
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                    />
                </div>
            </div>
        </div>
    );
};

export default TransactionBranchConfig;