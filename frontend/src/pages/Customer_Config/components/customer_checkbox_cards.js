import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Select from 'react-select';

const CustomerCheckboxCards = forwardRef(({ 
    customerId, 
    initialData,
    readOnly = false,
    transactionOptions = [],
    branchOptions = [],
    checkboxOptions,
    selectedTransaction = 'ALL', // Add this prop
    selectedBranch = 'ALL' // Add this prop
}, ref) => {

    console.log(initialData)
    
    // Create a new empty card function - MOVE THIS BEFORE useState
    const createNewCard = () => ({
        id: `card-${Date.now()}-${Math.random()}`,
        transaction: null,
        branch: null,
        checkboxes: {
            equipmentDescriptionRequired: false,
            acceptEDICancels: false,
            receiveMultiShops: false,
            tenCharacterPO: false,
            scacRequired: false,
            oneBillShop: false,
            partLevelOverride: false,
            electrolux: false,
            deliveryDateTime: false,
            metricValues: false,
            oneTransEnvelope: false,
            millHeatOnASN: false,
            duplicateForMill: false,
            flag8: false,
            cumulativePartPO: false,
            cumulativeWeight: false,
            cumulativePieces: false,
            dayLightSavings: false
        }
    });

    // NOW initialize state with the function
    const [configCards, setConfigCards] = useState([]);

    // Initialize configuration cards
    useEffect(() => {
        console.log('CustomerCheckboxCards received initialData:', initialData);
        
        if (initialData && Array.isArray(initialData) && initialData.length > 0) {
            console.log('Setting config cards from initialData:', initialData);
            setConfigCards(initialData);
        } else {
            console.log('No valid initialData, using default card');
            setConfigCards([createNewCard()]);
        }
    }, [initialData]);


    // Add this useEffect to log the props:
useEffect(() => {
    console.log('CustomerCheckboxCards props:', {
        transactionOptions: transactionOptions.length,
        branchOptions: branchOptions.length,
        selectedTransaction,
        selectedBranch
    });
    console.log('Branch options received:', branchOptions);
}, [transactionOptions, branchOptions, selectedTransaction, selectedBranch]);
    // Handle transaction/branch change
    const handleDropdownChange = (cardId, field, value) => {
        if (readOnly) return;

        // Check for duplicates before making any changes
        if (field === 'transaction') {
            const currentCard = configCards.find(card => card.id === cardId);
            const duplicateCombo = configCards.find(card => 
                card.id !== cardId && 
                (card.transaction?.value || '') === (value?.value || '') && 
                (card.branch?.value || '') === (currentCard?.branch?.value || '')
            );
            
            if (duplicateCombo) {
                alert(`This Transaction/Branch combination already exists. Please select a different combination.`);
                return;
            }
        }

        if (field === 'branch') {
            const currentCard = configCards.find(card => card.id === cardId);
            const duplicateCombo = configCards.find(card => 
                card.id !== cardId && 
                (card.transaction?.value || '') === (currentCard?.transaction?.value || '') && 
                (card.branch?.value || '') === (value?.value || '')
            );
            
            if (duplicateCombo) {
                alert(`This Transaction/Branch combination already exists. Please select a different combination.`);
                return;
            }
        }

        // Update local state
        const updatedCards = configCards.map(card => 
            card.id === cardId 
                ? { ...card, [field]: value }
                : card
        );

        setConfigCards(updatedCards);
    };

    // Handle checkbox change - modified to send only checked values as array
    const handleCheckboxChange = (cardId, checkboxName, checked) => {
        if (readOnly) return;
        
        // Only update local state - DO NOT call onCheckboxChange
        const updatedCards = configCards.map(card => 
            card.id === cardId 
                ? { 
                    ...card, 
                    checkboxes: {
                        ...card.checkboxes,
                        [checkboxName]: checked
                    }
                }
                : card
        );

        setConfigCards(updatedCards);
        // Removed all onCheckboxChange references
    };

    // Add new card
    const addNewCard = () => {
        const newCard = createNewCard();
        setConfigCards(prev => [...prev, newCard]);
        // No onCheckboxChange references
    };

    // Delete card
    const deleteCard = (cardId) => {
        if (configCards.length <= 1) {
            alert('You must have at least one configuration card.');
            return;
        }
        
        const updatedCards = configCards.filter(card => card.id !== cardId);
        setConfigCards(updatedCards);
        // Removed all onCheckboxChange references
    };

   // Initialize state

    

    // Add useImperativeHandle to expose getCurrentCheckboxData function
    useImperativeHandle(ref, () => ({
        getCurrentCheckboxData: () => {
            console.log('getCurrentCheckboxData called, current configCards:', configCards);
            
            const transformedData = {};
            
            // Use filteredConfigCards or configCards based on your needs
            // If you want to save ALL cards regardless of filter, use configCards
            // If you want to save only filtered cards, use filteredConfigCards
            const cardsToProcess = configCards; // Use all cards for saving
            
            cardsToProcess.forEach(card => {
                // Create group key even with empty/null transaction or branch
                const transactionValue = card.transaction?.value || '';
                const branchValue = card.branch?.value || '';
                const groupKey = `${transactionValue}_${branchValue}`;
                
                
                const checkedOptions = Object.entries(card.checkboxes)
                    .filter(([key, value]) => value === true)
                    .map(([key, value]) => {
                        const option = checkboxOptions.find(opt => opt.key === key);
                        return option ? option.label : key;
                    });
                
                // Include the configuration even if no checkboxes are checked
                if (checkedOptions.length > 0 || transactionValue !== '' || branchValue !== '') {
                    transformedData[groupKey] = checkedOptions;
                }
            });
            

            return transformedData;
        }
    }));

    // Add filtering logic for displayed cards
    const filteredConfigCards = configCards.filter(card => {
        // If 'ALL' is selected, show all cards
        if (selectedTransaction === 'ALL' && selectedBranch === 'ALL') {
            return true;
        }
        
        // Filter by transaction
        if (selectedTransaction !== 'ALL') {
            // Only show cards that match the selected transaction
            // Hide cards with empty/null transaction OR cards with different transaction
            const cardTransactionValue = card.transaction?.value || '';
            if (cardTransactionValue !== selectedTransaction) {
                return false;
            }
        }
        
        // Filter by branch
        if (selectedBranch !== 'ALL') {
            // Only show cards that match the selected branch
            // Hide cards with empty/null branch OR cards with different branch
            const cardBranchValue = card.branch?.value || '';
            if (cardBranchValue !== selectedBranch) {
                return false;
            }
        }
        
        return true;
    });

    // Add a filter indicator to show when filtering is active
    const isFiltered = selectedTransaction !== 'ALL' || selectedBranch !== 'ALL';
    const totalCards = configCards.length;
    const visibleCards = filteredConfigCards.length;


    return (
        <div style={{ padding: '20px' }}>
            {/* Add filter indicator */}
            {isFiltered && (
                <div style={{
                    backgroundColor: '#e3f2fd',
                    border: '1px solid #2196f3',
                    borderRadius: '4px',
                    padding: '10px',
                    marginBottom: '15px',
                    fontSize: '14px',
                    color: '#1976d2'
                }}>
                    <strong>Filter Active:</strong> Showing {visibleCards} of {totalCards} configuration cards
                    {selectedTransaction !== 'ALL' && ` | Transaction: ${selectedTransaction}`}
                    {selectedBranch !== 'ALL' && ` | Branch: ${selectedBranch}`}
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <h3 style={{ margin: 0 }}>Transaction Configuration Options</h3>
                {!readOnly && (
                    <button
                        onClick={addNewCard}
                        style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Add Configuration
                    </button>
                )}
            </div>

            {/* Display message when no cards match filter */}
            {isFiltered && filteredConfigCards.length === 0 && (
                <div style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    padding: '15px',
                    marginBottom: '15px',
                    textAlign: 'center',
                    color: '#856404'
                }}>
                    No checkbox configurations match the current transaction/branch filter.
                    <br />
                    Switch to "ALL" to see all configurations or add a new configuration for this combination.
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                gap: '20px'
            }}>
                {/* Use filteredConfigCards instead of configCards for display */}
                {filteredConfigCards.map((card, index) => (
                    <div key={card.id} style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa'
                    }}>
                        {/* Card header with delete button */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px'
                        }}>
                            <h4 style={{ margin: 0, color: '#495057' }}>
                                Configuration {index + 1}
                            </h4>
                            {!readOnly && configCards.length > 1 && (
                                <button
                                    onClick={() => deleteCard(card.id)}
                                    style={{
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Delete
                                </button>
                            )}
                        </div>

                        {/* Transaction Dropdown */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '5px',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}>
                                Transaction:
                            </label>
                            <Select
                                value={card.transaction}
                                onChange={(value) => handleDropdownChange(card.id, 'transaction', value)}
                                options={transactionOptions}
                                isClearable
                                placeholder="Select Transaction"
                                styles={{
                                    control: (provided) => ({
                                        ...provided,
                                        minHeight: '35px',
                                        fontSize: '14px'
                                    })
                                }}
                            />
                        </div>

                        {/* Branch Dropdown */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '5px',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}>
                                Branch:
                            </label>
                            <Select
                                value={card.branch}
                                onChange={(value) => handleDropdownChange(card.id, 'branch', value)}
                                options={branchOptions}
                                isClearable
                                placeholder="Select Branch"
                                styles={{
                                    control: (provided) => ({
                                        ...provided,
                                        minHeight: '35px',
                                        fontSize: '14px'
                                    })
                                }}
                            />
                        </div>

                        {/* Checkboxes */}
                        <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
                            <h5 style={{ marginBottom: '15px', color: '#495057' }}>
                                Configuration Options:
                            </h5>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: '8px'
                            }}>
                                {checkboxOptions.map(option => (
                                    <label key={option.key} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '14px',
                                        cursor: readOnly ? 'default' : 'pointer'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={card.checkboxes[option.key] || false}
                                            onChange={(e) => handleCheckboxChange(card.id, option.key, e.target.checked)}
                                            disabled={readOnly}
                                            style={{ marginRight: '8px' }}
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

// Make sure to set the display name for debugging
CustomerCheckboxCards.displayName = 'CustomerCheckboxCards';

export default CustomerCheckboxCards;