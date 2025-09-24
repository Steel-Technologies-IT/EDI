import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import CustomerInfo from './components/customer_info';
import CustomerAddress from './components/customer_address';
import CustomerFieldConfig from './components/customer_field_config';
import Select from 'react-select';

const CustomerModification = () => {
    const { mode, customerId } = useParams(); // Now you can get both mode and customerId
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check if we have customer data passed from navigation
    const customerData = location.state?.customerData;
    
    const [customer, setCustomer] = useState({
        invexCustomerNumber: '',
        ediCustomerNumber: '',
        customerName: '', // Add this new field
        transaction: '',
        branch: '',
        as400Xref: '' // Add this new field
    });
    const [addresses, setAddresses] = useState([]);
    const [overwritingValues, setOverwritingValues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [snfDecoderData, setSnfDecoderData] = useState([]);
    const [filteredSnfData, setFilteredSnfData] = useState([]);
    const [popupLoading, setPopupLoading] = useState(false);

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
                invexCustomerNumber: customerInfo.edia_invex_account_id || '',
                ediCustomerNumber: customerInfo.edia_edi_account_id || '',
                customerName: customerInfo.edia_cust_name || '', // Change this from edia_customer_name to edia_cust_name
                as400Xref: customerInfo.edia_as400_xref || '' // Add this line
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
                        transaction: addr.ediaat_edi_trans_tpe || '', // Include transaction from DB
                        branch: addr.ediaat_branch || '', // Include branch from DB
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

            fetchDropdownOptions();
            // Fetch field configuration for this customer
            const configResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/field-config/${customerId}`);
            
            if (configResponse.ok) {
                const configData = await configResponse.json();
                console.log('Field config data fetched:', configData);
                console.log('Raw config data:', configData);
                
                if (configData.rows?.length > 0) {
                    // Set transaction and branch from config data
                    setCustomer(prev => ({
                        ...prev,
                        transaction: configData.rows[0].ediac_edi_trans_tpe || '',
                        branch: configData.rows[0].ediac_branch || ''
                    }));

                    // Parse the ediac_data JSON structure
                    const ediacData = configData.rows[0].ediac_data;
                    console.log('Processing ediac_data:', ediacData);

                    if (ediacData && typeof ediacData === 'object') {
                        // First, fetch SNF decoder data to get position, length, and type
                        const snfResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/snf-decoder`);
                        let snfDecoderData = [];
                        
                        if (snfResponse.ok) {
                            const snfData = await snfResponse.json();
                            snfDecoderData = snfData.rows || [];
                            console.log('SNF Decoder data for matching:', snfDecoderData);
                        }

                        const formattedConfigs = [];
                        let idCounter = 1;

                        // Update the field configuration processing in fetchAllCustomerData:
                        if (configData.rows && configData.rows.length > 0) {
                            console.log('Processing config data:', configData.rows);
                            
                            for (const configRow of configData.rows) {
                                const fieldData = configRow.ediac_data;
                                const configTransaction = configRow.ediac_edi_trans_tpe || '';
                                const configBranch = configRow.ediac_branch || '';
                                
                                if (fieldData && typeof fieldData === 'object') {
                                    // New structure: fieldData is now fieldTransaction -> snfCodes (no longer branch -> transaction)
                                    // Since we now store one record per branch/transaction combo
                                    for (const [fieldTransaction, snfCodes] of Object.entries(fieldData)) {
                                        if (snfCodes && typeof snfCodes === 'object') {
                                            // Process each SNF code
                                            for (const [snfCode, snfDescriptions] of Object.entries(snfCodes)) {
                                                if (snfDescriptions && typeof snfDescriptions === 'object') {
                                                    // Process each SNF description
                                                    for (const [snfDescription, values] of Object.entries(snfDescriptions)) {
                                                        // Find matching SNF entry for additional details
                                                        const matchingSnfEntry = snfDecoderData.find(snf => 
                                                            snf.fieldTransaction === fieldTransaction && 
                                                            snf.snfCode === snfCode && 
                                                            snf.snfDescription === snfDescription
                                                        );
                                                        
                                                        formattedConfigs.push({
                                                            id: `config-${idCounter++}`,
                                                            recordCode: fieldTransaction,
                                                            snfCode: snfCode,
                                                            snfDescription: snfDescription,
                                                            snfPosition: matchingSnfEntry?.snfPosition?.toString() || '',
                                                            snfLength: matchingSnfEntry?.snfLength?.toString() || '',
                                                            snfType: matchingSnfEntry?.snfType || '',
                                                            defaultValue: values.defaultvalue || '',
                                                            overrideValue: values.overridevalue || '',
                                                            transaction: configTransaction, // Use the transaction from the database record
                                                            branch: configBranch // Use the branch from the database record
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        console.log('Formatted field configs:', formattedConfigs);
                        setOverwritingValues(formattedConfigs);
                    }
                }
            } else {
                console.log('No field configuration found or error fetching config');
                setOverwritingValues([]);
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
            // Fetch transaction options
            const transactionResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/transaction-options`);
            if (transactionResponse.ok) {
                const transactionData = await transactionResponse.json();
                setTransactionOptions(transactionData.rows || []);
            }

            // Fetch branch options  
            const branchResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/branch-options`);
            if (branchResponse.ok) {
                const branchData = await branchResponse.json();
                setBranchOptions(branchData.rows || []);
            }
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
            // Set some default options if the API fails
            setTransactionOptions([
                { value: '810', label: '810 - Invoice' },
                { value: '850', label: '850 - Purchase Order' },
                { value: '856', label: '856 - Ship Notice' }
            ]);
            setBranchOptions([
                { value: '01', label: '01 - Main Branch' },
                { value: '02', label: '02 - Secondary Branch' }
            ]);
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
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

    const handleSelectSnfItem = (snfItem) => {
        // Check if this SNF decoder entry already exists based on all primary key fields
        const isDuplicate = overwritingValues.some(existing => 
            existing.recordCode === snfItem.fieldTransaction && 
            existing.snfCode === snfItem.snfCode &&
            existing.snfDescription === snfItem.snfDescription &&
            existing.snfPosition === snfItem.snfPosition?.toString()
        );

        if (isDuplicate) {
            alert(`This SNF decoder entry already exists:\nField Transaction: ${snfItem.fieldTransaction}\nSNF Code: ${snfItem.snfCode}\nDescription: ${snfItem.snfDescription}\nPosition: ${snfItem.snfPosition}`);
            return;
        }

        const newOverwritingValue = {
            id: Date.now(),
            recordCode: snfItem.fieldTransaction,
            snfCode: snfItem.snfCode,
            snfDescription: snfItem.snfDescription,
            snfPosition: snfItem.snfPosition?.toString() || '',
            snfLength: snfItem.snfLength?.toString() || '',
            snfType: snfItem.snfType,
            defaultValue: '',
            overrideValue: '',
            transaction: customer.transaction || '', // Pre-populate with selected global transaction
            branch: customer.branch || '' // Pre-populate with selected global branch
        };
        setOverwritingValues(prev => [...prev, newOverwritingValue]);
        setShowPopup(false);
        clearFilters();
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        clearFilters();
    };

    const handleDeleteOverwritingValue = (overwritingId) => {
        if (window.confirm('Are you sure you want to delete this overwriting value?')) {
            setOverwritingValues(prev => prev.filter(ow => ow.id !== overwritingId));
        }
    };

    const handleDeleteAddress = (addressId) => {
        if (window.confirm('Are you sure you want to delete this address?')) {
            setAddresses(prev => prev.filter(addr => addr.id !== addressId));
        }
    };

    const handleSave = async () => {
        try {
            // Transform overwriting values into the new nested structure: branch -> transaction -> fieldTransaction -> snfCodes
            const transformedFieldConfig = {};
            
            overwritingValues.forEach(item => {
                const fieldTransaction = item.recordCode;
                const snfCode = item.snfCode;
                const snfDescription = item.snfDescription;
                const overrideValue = item.overrideValue || "";
                const defaultValue = item.defaultValue || "";
                const transaction = item.transaction || ""; // Get transaction from item
                const branch = item.branch || ""; // Get branch from item
                
                // Initialize branch if it doesn't exist
                if (!transformedFieldConfig[branch]) {
                    transformedFieldConfig[branch] = {};
                }
                
                // Initialize transaction within branch if it doesn't exist
                if (!transformedFieldConfig[branch][transaction]) {
                    transformedFieldConfig[branch][transaction] = {};
                }
                
                // Initialize fieldTransaction within transaction if it doesn't exist
                if (!transformedFieldConfig[branch][transaction][fieldTransaction]) {
                    transformedFieldConfig[branch][transaction][fieldTransaction] = {};
                }
                
                // Initialize SNF Code if it doesn't exist
                if (!transformedFieldConfig[branch][transaction][fieldTransaction][snfCode]) {
                    transformedFieldConfig[branch][transaction][fieldTransaction][snfCode] = {};
                }
                
                // Add SNF Description with override and default values as separate properties
                transformedFieldConfig[branch][transaction][fieldTransaction][snfCode][snfDescription] = {
                    overridevalue: overrideValue,
                    defaultvalue: defaultValue
                };
            });
            
            const customerDataToSend = {
                // Current form values (what user wants to update to)
                invexCustomerNumber: customer.invexCustomerNumber,
                ediCustomerNumber: customer.ediCustomerNumber,
                customerName: customer.customerName,
                as400Xref: customer.as400Xref,
                transaction: customer.transaction,
                branch: customer.branch,
                addresses: addresses,
                fieldConfiguration: transformedFieldConfig
            };

            // For updates, include the original primary keys for identification
            if (!isAddMode) {
                customerDataToSend.originalEdiAccountId = customerId;
                
                if (customerData?.edia_invex_account_id) {
                    customerDataToSend.originalInvexAccountId = customerData.edia_invex_account_id;
                }
            }
            
            console.log('Saving customer with transformed data:', customerDataToSend);
            
            // Use the correct endpoint that matches your backend
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
            
            // Log the response for debugging
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
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
            
            console.log('Save result:', result);
            
            alert(isAddMode ? 'Customer added successfully!' : 'Customer updated successfully!');
            navigate('/CustomerConfiguration');
            
        } catch (error) {
            console.error('Error saving customer:', error);
            alert(`Error saving customer: ${error.message}. Please try again.`);
        }
    };

    // Add these computed values before the return statement
    const filteredAddresses = addresses.filter(address => {
        // If no transaction/branch selected globally, show all addresses
        if (!customer.transaction && !customer.branch) {
            return true;
        }
        
        // Filter based on selected transaction and branch
        const transactionMatch = !customer.transaction || address.transaction === customer.transaction;
        const branchMatch = !customer.branch || address.branch === customer.branch;
        
        return transactionMatch && branchMatch;
    });

    const filteredOverwritingValues = overwritingValues.filter(config => {
        // If no transaction/branch selected globally, show all configurations
        if (!customer.transaction && !customer.branch) {
            return true;
        }
        
        // Filter based on selected transaction and branch
        const transactionMatch = !customer.transaction || config.transaction === customer.transaction;
        const branchMatch = !customer.branch || config.branch === customer.branch;
        
        return transactionMatch && branchMatch;
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginTop: '15px'
        },
        addressCard: {
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            maxWidth: '300px'
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

    // Update the TransactionBranchConfig component
    const TransactionBranchConfig = () => {
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
                    {isAddMode ? 'Add New Customer' : `Edit Customer`}
                </h1>
                <div style={styles.buttonGroup}>
                    <button style={styles.button} onClick={() => navigate('/CustomerConfiguration')}>
                        Back to List
                    </button>
                    <button
                        style={{...styles.button, ...styles.saveButton}}
                        onClick={handleSave}
                    >
                        {isAddMode ? 'Add Customer' : 'Update Customer'}
                    </button>
                </div>
            </div>

            {/* Customer Information Component */}
            <CustomerInfo
                customer={customer}
                handleInputChange={handleInputChange}
                styles={styles}
            />

            {/* Transaction & Branch Configuration Component */}
            <TransactionBranchConfig />

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
                allOverwritingValues={overwritingValues} // Pass all configurations for context
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
                selectedTransaction={customer.transaction} // Add for filtering context
                selectedBranch={customer.branch} // Add for filtering context
                styles={styles}
            />
        </div>
    );
};

export default CustomerModification;