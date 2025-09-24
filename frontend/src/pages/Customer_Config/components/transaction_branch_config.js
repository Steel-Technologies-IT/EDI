import React from 'react';
import Select from 'react-select';

const TransactionBranchConfig = ({
    customer,
    transactionOptions,
    branchOptions,
    setCustomer,
    styles
}) => {
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

    // Prepare transaction options for react-select
    const transactionSelectOptions = transactionOptions.map(option => ({
        value: option.value || option.transaction_type,
        label: option.label || option.transaction_description || option.value || option.transaction_type
    }));

    // Prepare branch options for react-select
    const branchSelectOptions = branchOptions.map(option => ({
        value: option.brh_brh,
        label: `${option.brh_brh} - ${option.brh_brh_nm.trim()}`
    }));

    // Get current selected values
    const selectedTransaction = transactionSelectOptions.find(opt => opt.value === customer.transaction) || null;
    const selectedBranch = branchSelectOptions.find(opt => opt.value === customer.branch) || null;

    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Transaction & Branch Configuration</h2>
            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Transaction Type</label>
                    <Select
                        placeholder={<div>Select transaction type</div>}
                        isClearable
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
                        isClearable
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