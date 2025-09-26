import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import CustomerInfo from './components/customer_info';
import CustomerAddress from './components/customer_address';
import CustomerFieldConfig from './components/customer_field_config';
import Select from 'react-select';
import TransactionBranchConfig from './components/transaction_branch_config';
import CustomerCheckboxCards from './components/customer_checkbox_cards';

const CustomerModification = () => {
    const { mode, customerId } = useParams(); // Now you can get both mode and customerId
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check if we have customer data passed from navigation
    const customerData = location.state?.customerData;
    
    const [customer, setCustomer] = useState({
        ediCustomerNumber: '',
        customerName: '',
        transaction: 'ALL', // Default to ALL
        branch: 'ALL', // Default to ALL
        as400Xref: ''
    });
    const [addresses, setAddresses] = useState([]);
    const [overwritingValues, setOverwritingValues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [snfDecoderData, setSnfDecoderData] = useState([]);
    const [filteredSnfData, setFilteredSnfData] = useState([]);
    const [popupLoading, setPopupLoading] = useState(false);
    const [showCheckboxCards, setShowCheckboxCards] = useState(true); // Changed from false to true
    const [checkboxConfigurations, setCheckboxConfigurations] = useState([]);

    // Add these state variables for the dropdown options (add after your other useState declarations)
    const [transactionOptions, setTransactionOptions] = useState([]);
    const [branchOptions, setBranchOptions] = useState([]);

    // Separate filter states for each field
    const [filters, setFilters] = useState({
        fieldTransaction: '',
        snfCode: '',
        snfDescription: '',
        snfPosition: '',
        snfLength: '',
        snfType: ''
    });

    const isAddMode = mode === 'add'; // Check mode instead of customerId

    // Add ref for checkbox cards component:
    const checkboxCardsRef = useRef(null);

    // Update the useEffect that handles mode changes:
    useEffect(() => {
        // Always fetch dropdown options regardless of mode
        fetchDropdownOptions();
        
        if (isAddMode) {
            setLoading(false);
        } else if (mode === 'edit' && customerId) {
            fetchAllCustomerData();
        }
    }, [mode, customerId, isAddMode]);


    const generateUniqueEdiNumber = async () => {
    try {
        console.log('=== STARTING EDI NUMBER GENERATION ===');
        console.log('Current customer state:', customer);
        
        // Show loading state
        setCustomer(prev => ({
            ...prev,
            ediCustomerNumber: 'Generating...'
        }));
        
        const url = `https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/generate-edi-number`;
        console.log('Making request to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success && data.ediNumber) {
            // Update the customer state with the generated number
            setCustomer(prev => ({
                ...prev,
                ediCustomerNumber: data.ediNumber
            }));
            
            console.log('Successfully generated unique EDI number:', data.ediNumber);
        } else {
            throw new Error(data.error || 'No EDI number returned from server');
        }
        
    } catch (error) {
        console.error('=== ERROR GENERATING EDI NUMBER ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Clear the "Generating..." text and show error
        setCustomer(prev => ({
            ...prev,
            ediCustomerNumber: ''
        }));
        
    }
};
// Add this useEffect after your existing useEffect hooks (around line 100):
useEffect(() => {
    console.log('=== AUTO-GENERATION USE EFFECT TRIGGERED ===');
    console.log('isAddMode:', isAddMode);
    console.log('customer.ediCustomerNumber:', customer.ediCustomerNumber);
    
    // Auto-generate EDI number when in add mode and no number is set
    if (isAddMode && !customer.ediCustomerNumber) {
        console.log('Triggering EDI number generation...');
        generateUniqueEdiNumber();
    }
}, [isAddMode]);
    // Update the fetchAllCustomerData function around line 166:
    const fetchAllCustomerData = async () => {
        
        setLoading(true);
        try {
            console.log('Fetching customer data for ID:', customerId);
            
            // Fetch customer basic info
            const customerResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers/${customerId}`);
            
            if (!customerResponse.ok) {
                throw new Error(`Failed to fetch customer: ${customerResponse.status}`);
            }
            
            const customerInfo = await customerResponse.json();
            console.log('Customer info fetched:', customerInfo);
            
            // Set customer basic information
            setCustomer({
                ediCustomerNumber: customerInfo.edia_edi_account_id || '',
                customerName: customerInfo.edia_cust_name || '',
                as400Xref: customerInfo.edia_as400_xref || '',
                transaction: 'ALL',
                branch: 'ALL'
            });

            // Fetch addresses for this customer
            const addressResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/addresses/${customerId}`);
            
            if (addressResponse.ok) {
                const addressData = await addressResponse.json();
                console.log('Address data fetched:', addressData);
                console.log('Raw address rows:', addressData.rows);
                
                // Transform address data to match your component format
                const formattedAddresses = addressData.rows?.map((addr, index) => {
                    console.log(`Processing address ${index}:`, addr);
                    return {
                        id: `address-${Date.now()}-${index}`,
                        transaction: addr.ediaat_edi_trans_tpe || '',
                        branch: addr.ediaat_branch || '',
                        addressType: addr.ediaat_addr_typ_cde || '',
                        addressCode: addr.ediaat_addr_cde || '',
                        addressIdentifier: addr.ediaat_addr_id || ''
                    };
                }) || [];
                
                console.log('Formatted addresses:', formattedAddresses);
                setAddresses(formattedAddresses);
            } else {
                console.log('No addresses found or error fetching addresses');
                setAddresses([]);
            }

            // Fetch dropdown options
            await fetchDropdownOptions();

            // Fetch field configuration for this customer
            const configResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/field-config/${customerId}`);
            
            if (configResponse.ok) {
                const configData = await configResponse.json();
                console.log('Field config data fetched:', configData);
                
                if (configData.rows?.length > 0) {
                    // First, fetch SNF decoder data to get position, length, and type
                    const snfResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/snf-decoder`);
                    let fetchedSnfDecoderData = [];
                    
                    
                    if (snfResponse.ok) {
                        const snfData = await snfResponse.json();
                        fetchedSnfDecoderData = snfData.rows || [];
                        console.log('SNF Decoder data for matching:', fetchedSnfDecoderData);
                    }

                    // Process both regular field configs and checkbox configs with snfDecoderData
                    const { fieldConfigs, checkboxConfigs } = processFieldConfigurationDataWithDecoder(configData.rows, fetchedSnfDecoderData);
                    
                    console.log('Processed field configs:', fieldConfigs);
                    console.log('Processed checkbox configs:', checkboxConfigs);
                    
                    setOverwritingValues(fieldConfigs);
                    
                    // Convert checkboxConfigs to the correct format
                    console.log('Setting checkbox configurations:', checkboxConfigs);
                    setCheckboxConfigurations(checkboxConfigs);
                }
            } else {
                console.log('No field configuration found or error fetching config');
                setOverwritingValues([]);
                setCheckboxConfigurations([]);
            }
            
        } catch (error) {
            console.error('Error fetching customer data:', error);
            alert('Error loading customer data. Redirecting to customer list.');
            navigate('/CustomerConfiguration');
        } finally {
            setLoading(false);
        }
    };

    const fetchSnfDecoderData = async () => {
        setPopupLoading(true);
        try {
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/snf-decoder`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('SNF Decoder Response:', data);
            
            // Extract rows from the response object
            const snfData = data.rows || [];
            console.log('SNF Decoder Data:', snfData);
            
            setSnfDecoderData(snfData);
            setFilteredSnfData(snfData);
            setPopupLoading(false);
        } catch (error) {
            console.error('Error fetching SNF decoder data:', error);
            setPopupLoading(false);
        }
    };

    // Fetch transaction and branch options
    const fetchDropdownOptions = async () => {
        try {
            console.log('Fetching dropdown options...');
            
            // Fetch transaction options
            const transactionResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/transaction-options`);
            if (transactionResponse.ok) {
                const transactionData = await transactionResponse.json();
                console.log('=== RAW TRANSACTION DATA ===');
                console.log('transactionData:', transactionData);
                console.log('transactionData.rows:', transactionData.rows);
                
                // Format transaction options - check what fields your transaction data actually has
                const rawTransactionArray = transactionData.rows || transactionData || [];
                console.log('rawTransactionArray:', rawTransactionArray);
                
                if (rawTransactionArray.length > 0) {
                    console.log('First transaction item:', rawTransactionArray[0]);
                    console.log('Transaction fields:', Object.keys(rawTransactionArray[0]));
                }
                
                const formattedTransactionOptions = rawTransactionArray.map(transaction => {
                    // Check multiple possible field names for transaction data
                    const transValue = transaction.edimt_trans_tpe || transaction.trans_type || transaction.transaction_type || transaction.value;
                    const transDesc = transaction.edimt_trans_desc || transaction.description || transaction.trans_desc || transaction.label || '';
                    
                    console.log('Processing transaction:', {
                        original: transaction,
                        transValue,
                        transDesc
                    });
                    
                    return {
                        value: transValue,
                        label: `${transValue}`,
                        edimt_trans_tpe: transValue,
                        edimt_trans_desc: transDesc
                    };
                });
                
                console.log('=== FORMATTED TRANSACTION OPTIONS ===');
                console.log('formattedTransactionOptions:', formattedTransactionOptions);
                setTransactionOptions(formattedTransactionOptions);
            } else {
                console.error('Transaction API call failed:', transactionResponse.status, transactionResponse.statusText);
            }

            // Fetch branch options (this part was working correctly)
            const branchResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/branch-options`);
            if (branchResponse.ok) {
                const branchData = await branchResponse.json();
                console.log('=== RAW BRANCH DATA ===');
                console.log('branchData:', branchData);
                
                // Format branch options with the correct field names
                const rawBranchArray = branchData.rows || branchData || [];
                const formattedBranchOptions = rawBranchArray.map(branch => ({
                    value: branch.brh_brh,
                    label: `${branch.brh_brh} - ${(branch.brh_brh_nm || '').trim()}`,
                    brh_brh: branch.brh_brh,
                    brh_brh_nm: branch.brh_brh_nm
                }));
                
                console.log('=== FORMATTED BRANCH OPTIONS ===');
                console.log('formattedBranchOptions:', formattedBranchOptions);
                setBranchOptions(formattedBranchOptions);
            } else {
                console.error('Branch API call failed:', branchResponse.status, branchResponse.statusText);
            }
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
            
            // Set some default options if the API fails
            const defaultTransactionOptions = [
                { value: '810', label: '810 - Invoice' },
                { value: '850', label: '850 - Purchase Order' },
                { value: '856', label: '856 - Ship Notice' }
            ];
            
            const defaultBranchOptions = [
                { value: '100', label: '100 - STTX USA CORP' },
                { value: '101', label: '101 - EMINENCE' },
                { value: '104', label: '104 - PORTAGE' },
                { value: '105', label: '105 - MURFREESBORO' }
            ];
            
            console.log('Using default options due to fetch error');
            setTransactionOptions(defaultTransactionOptions);
            setBranchOptions(defaultBranchOptions);
        }
    };

    useEffect(() => {
        if (showPopup && snfDecoderData.length === 0) {
            fetchSnfDecoderData();
        }
    }, [showPopup]);

    // Updated filter effect to handle multiple filter boxes
    useEffect(() => {
        let filtered = snfDecoderData;

        // Apply filters for each field
        if (filters.fieldTransaction) {
            filtered = filtered.filter(item => 
                item.fieldTransaction?.toLowerCase().includes(filters.fieldTransaction.toLowerCase())
            );
        }
        if (filters.snfCode) {
            filtered = filtered.filter(item => 
                item.snfCode?.toLowerCase().includes(filters.snfCode.toLowerCase())
            );
        }
        if (filters.snfDescription) {
            filtered = filtered.filter(item => 
                item.snfDescription?.toLowerCase().includes(filters.snfDescription.toLowerCase())
            );
        }
        if (filters.snfPosition) {
            filtered = filtered.filter(item => 
                item.snfPosition?.toString().includes(filters.snfPosition)
            );
        }
        if (filters.snfLength) {
            filtered = filtered.filter(item => 
                item.snfLength?.toString().includes(filters.snfLength)
            );
        }
        if (filters.snfType) {
            filtered = filtered.filter(item => 
                item.snfType?.toLowerCase().includes(filters.snfType.toLowerCase())
            );
        }

        setFilteredSnfData(filtered);
    }, [filters, snfDecoderData]);

    // Handle filter changes
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            fieldTransaction: '',
            snfCode: '',
            snfDescription: '',
            snfPosition: '',
            snfLength: '',
            snfType: ''
        });
    };

    // Update the handleInputChange function (around line 350):
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Prevent changes to EDI Customer Number
        if (name === 'ediCustomerNumber') {
            return; // Don't allow changes to this field
        }
        
        setCustomer(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddressChange = (addressId, field, value) => {
        setAddresses(prev => prev.map(addr => 
            addr.id === addressId 
                ? { ...addr, [field]: value }
                : addr
        ));
    };

    const handleOverwritingValueChange = (overwritingId, field, value) => {
        setOverwritingValues(prev => prev.map(ow => 
            ow.id === overwritingId 
                ? { ...ow, [field]: value }
                : ow
        ));
    };

    const handleAddAddress = () => {
        const newAddress = {
            id: Date.now(),
            transaction: customer.transaction || '', // Pre-populate with selected global transaction
            branch: customer.branch || '', // Pre-populate with selected global branch
            addressType: '',
            addressCode: '',
            addressIdentifier: ''
        };
        setAddresses(prev => [...prev, newAddress]);
    };

    const handleDeleteAddress = (addressId) => {
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    };

    const handleEditAddress = (addressId) => {
        setEditingAddressId(addressId);
    };

    const handleSaveAddress = (addressId) => {
        setEditingAddressId(null);
    };

    const handleCancelEdit = () => {
        setEditingAddressId(null);
    };

    const handleAddOverwritingValue = () => {
        setShowPopup(true);
    };

    const handleDeleteOverwritingValue = (overwritingId) => {
        setOverwritingValues(prev => prev.filter(ow => ow.id !== overwritingId));
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        // Clear any filters when closing popup
        clearFilters();
    };

    const handleSelectSnfItem = (item) => {
        console.log('Selected SNF item:', item);
        
        // Create a new overwriting value with empty transaction/branch (user will set these)
        const newOverwritingValue = {
            id: `ow-${Date.now()}-${Math.random()}`, // Ensure unique ID
            recordCode: item.fieldTransaction || '',
            snfCode: item.snfCode || '',
            snfDescription: item.snfDescription || '',
            snfPosition: item.snfPosition?.toString() || '',
            snfLength: item.snfLength?.toString() || '',
            snfType: item.snfType || '',
            defaultValue: '',
            overrideValue: '',
            transaction: '', // Empty by default - user must select
            branch: '' // Empty by default - user must select
        };
        
        // Add the new item (allow duplicates)
        setOverwritingValues(prev => [...prev, newOverwritingValue]);
        setShowPopup(false);
    };

    // Add validation function for duplicate transaction/branch combinations:
    const validateUniqueTransactionBranchCombinations = (values) => {
        const combinations = new Map();
        const duplicates = [];
        
        values.forEach((config, index) => {
            // Create a key from SNF Code + SNF Description + Transaction + Branch
            const key = `${config.snfCode}-${config.snfDescription}-${config.transaction || 'empty'}-${config.branch || 'empty'}`;
            
            if (combinations.has(key)) {
                // Found duplicate combination
                const originalIndex = combinations.get(key);
                duplicates.push({
                    original: originalIndex,
                    duplicate: index,
                    snfCode: config.snfCode,
                    snfDescription: config.snfDescription,
                    transaction: config.transaction || '(empty)',
                    branch: config.branch || '(empty)'
                });
            } else {
                combinations.set(key, index);
            }
        });
        
        return duplicates;
    };

    // Helper function to transform field configuration data for backend
    const transformFieldConfigForBackend = (overwritingValues) => {
        if (!overwritingValues || overwritingValues.length === 0) {
            return {};
        }

        // Group by transaction and branch combination
        const groupedConfigs = {};
        console.log('Transforming field config with overwriting values:', overwritingValues);
        
        overwritingValues.forEach(config => {
            // Use config.transaction (user-selected transaction filter) instead of config.recordCode
            const transactionKey = config.recordCode || '';
            const branchKey = config.branch || '';
            const groupKey = `${transactionKey}_${branchKey}`;
            
            console.log('Processing config for transform:', {
                configId: config.id,
                transaction: config.recordCode,
                branch: config.branch,
                recordCode: config.recordCode,
                groupKey: groupKey
            });
            
            if (!groupedConfigs[groupKey]) {
                groupedConfigs[groupKey] = {
                    transaction: transactionKey, // This should be the user-selected transaction
                    branch: branchKey,
                    data: {} // This will contain SNF Code -> [SNF Descriptions with values]
                };
            }
            
            const snfCode = config.snfCode;
            const snfDescription = config.snfDescription;
            
            // Initialize SNF Code array if it doesn't exist
            if (!groupedConfigs[groupKey].data[snfCode]) {
                groupedConfigs[groupKey].data[snfCode] = [];
            }
            
            // Add SNF Description with its values to the array
            groupedConfigs[groupKey].data[snfCode].push({
                snfDescription: snfDescription,
                overrideValue: config.overrideValue || '',
                defaultValue: config.defaultValue || ''
            });
        });
        
        console.log('Final transformed field config:', groupedConfigs);
        return groupedConfigs;
    };

    // Replace the mergeCheckboxArraysIntoFieldConfig function (around line 500):
    const mergeCheckboxArraysIntoFieldConfig = (fieldConfigs, checkboxTextArrays) => {
        const merged = { ...fieldConfigs };
        
        // Add checkbox arrays to matching field config groups
        Object.keys(checkboxTextArrays).forEach(groupKey => {
            const checkboxArray = checkboxTextArrays[groupKey];
            const [transaction, branch] = groupKey.split('_');
            
            console.log('Processing checkbox group:', {
                groupKey,
                transaction,
                branch,
                checkboxArray
            });
            
            if (merged[groupKey]) {
                // Group already exists, add checkbox array to checkboxData
                merged[groupKey].checkboxData = checkboxArray;
            } else {
                // Group doesn't exist, create it with just the checkbox array
                merged[groupKey] = {
                    transaction: transaction || '', // Allow empty transaction
                    branch: branch || '', // Allow empty branch
                    checkboxData: checkboxArray, // Use checkboxData instead of data.checkboxOptions
                    data: {} // Keep data empty for field configurations
                };
            }
        });
        
        return merged;
    };

    // Complete the processFieldConfigurationDataWithDecoder function:
    const processFieldConfigurationDataWithDecoder = (configRows, snfDecoderData) => {
        const fieldConfigs = [];
        const checkboxConfigs = [];
        let idCounter = 1;
        
        console.log('Processing config rows:', configRows);
        console.log('Using SNF decoder data:', snfDecoderData);
        console.log('Available transaction options:', transactionOptions);
        console.log('Available branch options:', branchOptions);

        configRows.forEach(configRow => {
            const fieldData = configRow.ediac_data;
            const checkboxSettings = configRow.ediac_trans_cfg_settings;
            
            // FIX: Use the correct column name - ediac_trans instead of ediac_edi_trans_tpe
            const configTransaction = configRow.ediac_trans || '';
            const configBranch = configRow.ediac_branch || '';
            
            console.log('Processing config row:', {
                rawConfigRow: configRow,
                configTransaction,
                configBranch,
                fieldData,
                checkboxSettings,
                allColumns: Object.keys(configRow)
            });
            
            // Process checkbox settings from the separate field
            if (checkboxSettings) {
                console.log('Found checkboxSettings in ediac_trans_cfg_settings:', checkboxSettings);
                
                try {
                    let checkboxArray = [];
                    
                    if (typeof checkboxSettings === 'string') {
                        try {
                            checkboxArray = JSON.parse(checkboxSettings);
                        } catch (parseError) {
                            console.error('Failed to parse checkboxSettings as JSON:', parseError);
                            const matches = checkboxSettings.match(/"([^"]+)"/g);
                            if (matches) {
                                checkboxArray = matches.map(match => match.replace(/"/g, ''));
                            }
                        }
                    } else if (Array.isArray(checkboxSettings)) {
                        checkboxArray = checkboxSettings;
                    }
                    
                    console.log('Parsed checkbox array:', checkboxArray);
                    
                    if (checkboxArray.length > 0) {
                        // Find matching transaction and branch options from the dropdown data
                        const matchingTransactionOption = transactionOptions.find(opt => 
                            opt.value === configTransaction || 
                            opt.label === configTransaction ||
                            opt.edimt_trans_tpe === configTransaction
                        );
                        
                        const matchingBranchOption = branchOptions.find(opt => 
                            opt.value === configBranch || 
                            opt.label === configBranch ||
                            opt.edimt_branch === configBranch
                        );
                        
                        console.log('Found matching options:', {
                            configTransaction,
                            matchingTransactionOption,
                            configBranch,
                            matchingBranchOption
                        });
                        
                        const cardConfig = {
                            id: `checkbox-${idCounter++}`,
                            // Use the found options or create appropriate fallback objects
                            transaction: matchingTransactionOption ? {
                                value: matchingTransactionOption.value || matchingTransactionOption.edimt_trans_tpe,
                                label: matchingTransactionOption.label || `${matchingTransactionOption.edimt_trans_tpe} - ${matchingTransactionOption.edimt_trans_desc || ''}`
                            } : (configTransaction ? { value: configTransaction, label: configTransaction } : null),
                            
                            branch: matchingBranchOption ? {
                                value: matchingBranchOption.value || matchingBranchOption.edimt_branch,
                                label: matchingBranchOption.label || `${matchingBranchOption.edimt_branch} - ${matchingBranchOption.edimt_branch_desc || ''}`
                            } : (configBranch ? { value: configBranch, label: configBranch } : null),
                            
                            checkboxes: {}
                        };
                        
                        const checkboxOptions = [
                            { key: 'equipmentDescriptionRequired', label: 'Equipment Description Required' },
                            { key: 'acceptEDICancels', label: 'Accept EDI Cancels' },
                            { key: 'receiveMultiShops', label: 'Receive Multi Shops' },
                            { key: 'tenCharacterPO', label: '10 Character PO#' },
                            { key: 'scacRequired', label: 'SCAC Required' },
                            { key: 'oneBillShop', label: 'One Bill/Shop' },
                            { key: 'partLevelOverride', label: 'Part Level Override' },
                            { key: 'electrolux', label: 'Electrolux' },
                            { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
                            { key: 'metricValues', label: 'Metric Values' },
                            { key: 'oneTransEnvelope', label: 'One Trans/Envelope' },
                            { key: 'millHeatOnASN', label: 'Mill Heat on ASN' },
                            { key: 'duplicateForMill', label: 'Duplicate for Mill' },
                            { key: 'flag8', label: 'Flag 8' },
                            { key: 'cumulativePartPO', label: 'Cumulative Part/PO#' },
                            { key: 'cumulativeWeight', label: 'Cumulative Weight' },
                            { key: 'cumulativePieces', label: 'Cumulative Pieces' },
                            { key: 'dayLightSavings', label: 'Day Light Savings' }
                        ];
                        
                        // Set checkboxes to true if their label is in the checkboxArray
                        checkboxOptions.forEach(option => {
                            cardConfig.checkboxes[option.key] = checkboxArray.includes(option.label);
                        });
                        
                        checkboxConfigs.push(cardConfig);
                        console.log('Created checkbox config with proper transaction/branch objects:', {
                            configTransaction,
                            configBranch,
                            finalTransactionObject: cardConfig.transaction,
                            finalBranchObject: cardConfig.branch,
                            cardConfig
                        });
                    }
                    
                } catch (error) {
                    console.error('Error processing checkbox settings:', error);
                }
            }
            
            // Process regular field configurations
            if (fieldData && typeof fieldData === 'object') {
                Object.entries(fieldData).forEach(([snfCode, snfDescriptionsArray]) => {
                    // Skip checkbox-related data
                    if (snfCode === 'checkboxSettings' || snfCode === 'checkboxOptions' || snfCode === 'checkboxData') {
                        return;
                    }
                    
                    // Check if this is an array of SNF descriptions (new format)
                    if (Array.isArray(snfDescriptionsArray)) {
                        snfDescriptionsArray.forEach(descriptionObj => {
                            if (descriptionObj && typeof descriptionObj === 'object') {
                                const snfDescription = descriptionObj.snfDescription;
                                const overrideValue = descriptionObj.overrideValue || '';
                                const defaultValue = descriptionObj.defaultValue || '';
                                
                                // Find matching SNF entry for additional details
                                const matchingSnfEntry = snfDecoderData.find(snf => 
                                    snf.snfCode === snfCode && 
                                    snf.snfDescription === snfDescription
                                );
                                
                                fieldConfigs.push({
                                    id: `config-${idCounter++}`,
                                    recordCode: matchingSnfEntry?.fieldTransaction || '',
                                    snfCode: snfCode,
                                    snfDescription: snfDescription,
                                    snfPosition: matchingSnfEntry?.snfPosition?.toString() || '',
                                    snfLength: matchingSnfEntry?.snfLength?.toString() || '',
                                    snfType: matchingSnfEntry?.snfType || '',
                                    defaultValue: defaultValue,
                                    overrideValue: overrideValue,
                                    transaction: configTransaction, // Use corrected column name
                                    branch: configBranch
                                });
                            }
                        });
                    }
                    // Handle old format for backward compatibility
                    else if (snfDescriptionsArray && typeof snfDescriptionsArray === 'object') {
                        Object.entries(snfDescriptionsArray).forEach(([snfDescription, values]) => {
                            if (values && typeof values === 'object') {
                                const matchingSnfEntry = snfDecoderData.find(snf => 
                                    snf.snfCode === snfCode && 
                                    snf.snfDescription === snfDescription
                                );
                                
                                fieldConfigs.push({
                                    id: `config-${idCounter++}`,
                                    recordCode: matchingSnfEntry?.fieldTransaction || '',
                                    snfCode: snfCode,
                                    snfDescription: snfDescription,
                                    snfPosition: matchingSnfEntry?.snfPosition?.toString() || '',
                                    snfLength: matchingSnfEntry?.snfLength?.toString() || '',
                                    snfType: matchingSnfEntry?.snfType || '',
                                    defaultValue: values.defaultvalue || '',
                                    overrideValue: values.overridevalue || '',
                                    transaction: configTransaction, // Use corrected column name
                                    branch: configBranch
                                });
                            }
                        });
                    }
                });
            }
        });

        console.log('Final processed field configs:', fieldConfigs);
        console.log('Final processed checkbox configs:', checkboxConfigs);
        return { fieldConfigs, checkboxConfigs };
    };

    // Add this handleSave function after your other handler functions (around line 450):

    const handleSave = async () => {
        try {
            console.log('=== Starting Save Process ===');
            
            // Validate required fields
            if (!customer.ediCustomerNumber?.trim()) {
                alert('EDI Customer Number is required');
                return;
            }
            if (!customer.customerName?.trim()) {
                alert('Customer Name is required');
                return;
            }

            // Validate unique transaction/branch combinations for field configurations
            const duplicateCombinations = validateUniqueTransactionBranchCombinations(overwritingValues);
            if (duplicateCombinations.length > 0) {
                const duplicateMessages = duplicateCombinations.map(dup => 
                    `SNF Code "${dup.snfCode}" (${dup.snfDescription}) has duplicate Transaction: "${dup.transaction}" + Branch: "${dup.branch}" combination`
                );
                
                alert(`Duplicate field configuration combinations found:\n\n${duplicateMessages.join('\n\n')}\n\nPlease ensure each SNF field has unique Transaction/Branch combinations.`);
                return;
            }

            // Transform field configuration for backend
            const transformedFieldConfig = transformFieldConfigForBackend(overwritingValues);
            console.log('Transformed field config:', transformedFieldConfig);
            
            // Get checkbox data directly from the component when saving
            let checkboxData = {};
            console.log('Checking if checkboxCardsRef is available:', checkboxCardsRef.current);
            
            if (checkboxCardsRef.current) {
                try {
                    checkboxData = checkboxCardsRef.current.getCurrentCheckboxData();
                    console.log('Checkbox data retrieved on save:', checkboxData);
                } catch (error) {
                    console.error('Error getting checkbox data:', error);
                }
            } else {
                console.warn('checkboxCardsRef.current is null - checkbox component not mounted or ref not attached');
            }
            
            // Merge checkbox text arrays into field configurations
            const finalFieldConfig = mergeCheckboxArraysIntoFieldConfig(transformedFieldConfig, checkboxData);
            console.log('Final field configuration with checkbox arrays:', finalFieldConfig);

            const customerDataToSend = {
                ediCustomerNumber: customer.ediCustomerNumber,
                customerName: customer.customerName,
                as400Xref: customer.as400Xref,
                transaction: customer.transaction,
                branch: customer.branch,
                addresses: addresses,
                fieldConfiguration: finalFieldConfig // Use merged configuration with checkbox arrays
            };

            // For updates, include the original primary keys for identification
            if (!isAddMode) {
                customerDataToSend.originalEdiAccountId = customerId;
                
                if (customerData?.edia_edi_account_id) {
                    customerDataToSend.originalEdiAccountId = customerData.edia_edi_account_id;
                }
            }
            
            console.log('Final customer data being sent to backend:', JSON.stringify(customerDataToSend, null, 2));
            
            const url = isAddMode 
                ? `https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers`
                : `https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers/${customerId}`;
            
            const method = isAddMode ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(customerDataToSend)
            });
            
            const responseText = await response.text();
            console.log('Backend response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', parseError);
                console.error('Response was:', responseText);
                throw new Error('Server returned invalid JSON response');
            }
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            
            alert(isAddMode ? 'Customer added successfully!' : 'Customer updated successfully!');
            navigate('/CustomerConfiguration');
            
        } catch (error) {
            console.error('Error saving customer:', error);
            alert(`Error saving customer: ${error.message}. Please try again.`);
        }
    };

    // Add filtering logic for addresses and field configurations based on selected transaction/branch
    const filteredAddresses = addresses.filter(address => {
        // If customer has 'ALL' selected, show all addresses
        if (customer.transaction === 'ALL' && customer.branch === 'ALL') {
            return true;
        }
        
        // Filter by transaction
        if (customer.transaction !== 'ALL' && address.transaction !== customer.transaction) {
            return false;
        }
        
        // Filter by branch
        if (customer.branch !== 'ALL' && address.branch !== customer.branch) {
            return false;
        }
        
        return true;
    });

    const filteredOverwritingValues = overwritingValues.filter(config => {
        // If customer has 'ALL' selected, show all configurations
        if (customer.transaction === 'ALL' && customer.branch === 'ALL') {
            return true;
        }
        
        // Filter by transaction
        if (customer.transaction !== 'ALL' && config.transaction !== customer.transaction) {
            return false;
        }
        
        // Filter by branch
        if (customer.branch !== 'ALL' && config.branch !== customer.branch) {
            return false;
        }
        
        return true;
    });

    const styles = {
        container: {
            padding: '20px',
            maxWidth: '95%',
            margin: '0 auto'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: '15px'
        },
        title: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333',
            margin: 0
        },
        buttonGroup: {
            display: 'flex',
            gap: '10px'
        },
        button: {
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
        },
        saveButton: {
            backgroundColor: '#28a745',
            color: 'white'
        },
        cancelButton: {
            backgroundColor: '#6c757d',
            color: 'white'
        },
        addButton: {
            backgroundColor: '#007bff',
            color: 'white',
            padding: '8px 16px',
            fontSize: '14px'
        },
        deleteButton: {
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '4px 8px',
            fontSize: '12px'
        },
        clearButton: {
            backgroundColor: '#ffc107',
            color: 'black',
            padding: '6px 12px',
            fontSize: '12px',
            marginLeft: '10px'
        },
        section: {
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '25px'
        },
        sectionTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '20px',
            borderBottom: '1px solid #dee2e6',
            paddingBottom: '10px'
        },
        formRow: {
            display: 'flex',
            gap: '20px',
            marginBottom: '20px'
        },
        formGroup: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
        },
        label: {
            fontWeight: 'bold',
            marginBottom: '5px',
            color: '#333'
        },
        input: {
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px'
        },
        select: {
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px'
        },
        addressesContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 400px))', // Min 300px, Max 400px
            gap: '20px',
            padding: '15px 0',
            justifyContent: 'center' // Center the grid when there are fewer cards
        },
        addressCard: {
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#f9f9f9',
            width: '100%', // Take full width of grid cell
            boxSizing: 'border-box' // Include padding in width calculation
        },
        cardTitle: {
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '10px'
        },
        addressField: {
            marginBottom: '8px'
        },
        addressLabel: {
            fontSize: '12px',
            color: '#666',
            fontWeight: 'bold',
            marginBottom: '2px'
        },
        addressInput: {
            padding: '6px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontSize: '14px',
            width: '100%'
        },
        addAddressSection: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '15px'
        },
        th: {
            backgroundColor: '#f8f9fa',
            color: '#333',
            fontWeight: 'bold',
            padding: '12px 8px',
            textAlign: 'left',
            borderBottom: '2px solid #dee2e6',
            fontSize: '14px'
        },
        td: {
            padding: '8px',
            borderBottom: '1px solid #dee2e6',
            verticalAlign: 'top'
        },
        tableInput: {
            padding: '4px 6px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontSize: '13px',
            width: '100%'
        },
        // Popup styles
        popupOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        popup: {
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: '95%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        },
        popupHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #dee2e6',
            paddingBottom: '10px'
        },
        popupTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333',
            margin: 0
        },
        closeButton: {
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: '5px'
        },
        filtersContainer: {
            marginBottom: '15px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px',
            border: '1px solid #dee2e6'
        },
        filtersTitle: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        filtersGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px'
        },
        filterGroup: {
            display: 'flex',
            flexDirection: 'column'
        },
        filterLabel: {
            fontSize: '12px',
            color: '#666',
            fontWeight: 'bold',
            marginBottom: '3px'
        },
        filterInput: {
            padding: '6px 8px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontSize: '14px'
        },
        popupTableContainer: {
            maxHeight: '500px',
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
        },
        popupTable: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        popupTh: {
            backgroundColor: '#f8f9fa',
            color: '#333',
            fontWeight: 'bold',
            padding: '12px 8px',
            textAlign: 'left',
            borderBottom: '2px solid #dee2e6',
            fontSize: '14px',
            position: 'sticky',
            top: 0
        },
        popupTd: {
            padding: '10px 8px',
            borderBottom: '1px solid #dee2e6',
            cursor: 'pointer'
        },
        loading: {
            textAlign: 'center',
            fontSize: '18px',
            color: '#666',
            marginTop: '50px'
        },
        popupLoadingContainer: {
            textAlign: 'center',
            padding: '40px',
            color: '#666'
        }
    };


    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading customer details...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    {isAddMode ? 'Add New Trading Partner' : `Edit Trading Partner`}
                </h1>
                <div style={styles.buttonGroup}>
                    <button style={styles.button} onClick={() => navigate('/CustomerConfiguration')}>
                        Back
                    </button>
                    <button
                        style={{...styles.button, ...styles.saveButton}}
                        onClick={handleSave}
                    >
                        {isAddMode ? 'Save' : 'Update Trading Partner'}
                    </button>
                </div>
            </div>

            {/* Customer Information Component */}
            <CustomerInfo
                customer={customer}
                handleInputChange={handleInputChange}
                styles={styles}
                isAddMode={isAddMode}
            />

            {/* Transaction & Branch Configuration Component */}
            <TransactionBranchConfig
                customer={customer}
                transactionOptions={transactionOptions}
                branchOptions={branchOptions}
                setCustomer={setCustomer}  // Add this line
                styles={styles}
            />

            {/* Customer Address Component - now uses filtered addresses */}
            <CustomerAddress
                addresses={filteredAddresses} // Changed from addresses to filteredAddresses
                allAddresses={addresses} // Pass all addresses for context
                handleAddressChange={handleAddressChange}
                handleAddAddress={handleAddAddress}
                handleDeleteAddress={handleDeleteAddress}
                transactionOptions={transactionOptions}
                branchOptions={branchOptions}
                editingAddressId={editingAddressId}
                handleEditAddress={handleEditAddress}
                handleSaveAddress={handleSaveAddress}
                handleCancelEdit={handleCancelEdit}
                selectedTransaction={customer.transaction} // Add for filtering context
                selectedBranch={customer.branch} // Add for filtering context
                styles={styles}
            />

            {/* Customer Field Configuration Component - now uses filtered configurations */}
            <CustomerFieldConfig
                overwritingValues={filteredOverwritingValues} // Changed from overwritingValues to filteredOverwritingValues
                allOverwritingValues={overwritingValues} // Add this line
                handleOverwritingValueChange={handleOverwritingValueChange}
                handleAddOverwritingValue={handleAddOverwritingValue}
                handleDeleteOverwritingValue={handleDeleteOverwritingValue}
                showPopup={showPopup}
                handleClosePopup={handleClosePopup}
                popupLoading={popupLoading}
                snfDecoderData={snfDecoderData}
                filteredSnfData={filteredSnfData}
                filters={filters}
                handleFilterChange={handleFilterChange}
                clearFilters={clearFilters}
                handleSelectSnfItem={handleSelectSnfItem}
                transactionOptions={transactionOptions}
                branchOptions={branchOptions}
                selectedTransaction={customer.transaction} // Add this line
                selectedBranch={customer.branch} // Add this line
                styles={styles}
            />

            {/* Customer Checkbox Configuration Component - Add this new section */}
            <div style={styles.section}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={styles.sectionTitle}>Trading Partner Configuration Options</h2>
                    <button
                        style={{
                            ...styles.button, 
                            backgroundColor: showCheckboxCards ? '#6c757d' : '#17a2b8',
                            color: 'white',
                            padding: '10px 20px'
                        }}
                        onClick={() => setShowCheckboxCards(!showCheckboxCards)}
                    >
                        {showCheckboxCards ? 'Hide Options' : 'Show Options'}
                    </button>
                </div>
                
                {/* Always render the component but hide it with CSS when needed */}
                <div style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: showCheckboxCards ? 'block' : 'none'
                }}>
                    <CustomerCheckboxCards
                        ref={checkboxCardsRef}
                        customerId={customer.ediCustomerNumber}
                        initialData={checkboxConfigurations}
                        readOnly={false}
                        transactionOptions={transactionOptions}
                        branchOptions={branchOptions} // Make sure this is here
                        selectedTransaction={customer.transaction} 
                        selectedBranch={customer.branch}
                    />
                </div>
            </div>
        </div>
    );
};

export default CustomerModification;
