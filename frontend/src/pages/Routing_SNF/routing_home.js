//Imports
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiDownload, FiFilter, FiPlus, FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';
import { FcClearFilters } from "react-icons/fc";
import { stringifyForFilter, stringifyTrnsValue, formatDateForInput, csvEscape, normalizeVal } from '../../functions/helpers';
import RoutingTransactionTable from "./routing_snf"



const RoutingTransactionView = () => {
    //Declare Variables
    
    const [records, setRecords] = useState([]);
    const currentUser = sessionStorage.getItem('currentUser') || '';
    const userGroups = JSON.parse(sessionStorage.getItem('userGroups') || '[]');
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode') || 'I';
    const navigate = useNavigate();
    const [showFilters, setShowFilters] = useState(true);
    const FILTER_ROW_HEIGHT = 40; // px
    const [columnFilters, setColumnFilters] = useState({
               customer_id: '',
           isa_id: '',
           edi_account_id: ''
           // Remove transaction: ''
           });
    const [columns, setColumns] = useState([]);

       // Modal state for Add/Edit
       const [showModal, setShowModal] = useState(false);
       const [editingRecord, setEditingRecord] = useState(null);
       const [formData, setFormData] = useState({});
       const [loading, setLoading] = useState(false);
         const [error, setError] = useState("");
         const [pagination, setPagination] = useState({
              total: 0,
              limit: 12,
              offset: 0,
              hasMore: false
       });
           const handlePreviousPage = () => {
        const newOffset = Math.max(0, pagination.offset - pagination.limit);
        fetchTableData(newOffset);
    };

    const handleNextPage = () => {
        if (pagination.hasMore) {
            const newOffset = pagination.offset + pagination.limit;
            fetchTableData(newOffset);
        }
    };

    const formatValue = (value) => {
        if (value === null || value === undefined) return <span style={{ color: '#999', fontStyle: 'italic' }}>NULL</span>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

       // Fixed table name
       const tableName = "Routing_SNFs";
   
       // Field descriptions to help users
       const fieldDescriptions = {
           customer_id: "Customer ID (8-digit number)",
           isa_id: "GS Sender ID",
           edi_account_id: "Trading Partner Account ID"
           // Remove transaction description
       };
    // Track when we've attempted to restore from storage to avoid overwriting with empty defaults
    const hasAttemptedRestore = useRef(false);

const getCurrentPageInfo = () => {
        const start = pagination.offset + 1;
        const end = Math.min(pagination.offset + pagination.limit, pagination.total);
        return `${start}-${end} of ${pagination.total}`;
    };

    // Add this helper function to get display name for columns
    const getColumnDisplayName = (column) => {
        // Use comment if available, otherwise use column name
        return column.column_comment && column.column_comment.trim() !== '' 
            ? column.column_comment 
            : column.column_name;
    };

    // Modal handlers
    const openAddModal = () => {
        setEditingRecord(null);
        // Initialize form with default values using the correct field names
        setFormData({
            customer_id: '',
            isa_id: '',
            isa_qualifier: '',
            // Remove transaction: '',
            edi_account_id: ''
        });
        setShowModal(true);
    };

    const openEditModal = (record) => {
        setEditingRecord(record);
        // Remove the _row_id field from form data
        const { _row_id, ...recordData } = record;
        setFormData(recordData);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingRecord(null);
        setFormData({});
    };

    const handleFormChange = (columnName, value) => {
        setFormData(prev => ({ ...prev, [columnName]: value }));
    };
    
    
    useEffect(() => {
    // Set loading state at the beginning
    setLoading(true);
    
    const load = async () => {
        try {
            const params = new URLSearchParams();
            // Add any necessary query parameters here
             // Fetch columns and records in parallel
            const [columnsResponse, recordsResponse] = await Promise.all([
                fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${encodeURIComponent(tableName)}/Columns`),
                fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${encodeURIComponent(tableName)}/Records?${params.toString()}`)
            ]);

            const [columnsData, recordsData] = await Promise.all([
                columnsResponse.json(),
                recordsResponse.json()
            ]);

            if (columnsResponse.ok && recordsResponse.ok) {
                setColumns(columnsData.columns || []);
                setRecords(recordsData.records || []);
                setPagination({
                    total: recordsData.total || 0,
                    limit: recordsData.limit || 12,
                    offset: recordsData.offset || 0,
                    hasMore: recordsData.hasMore || false
                });
            } else {
                setError(columnsData.error || recordsData.error || 'Failed to fetch table data');
            }
        } catch (err) {
            console.error('Error fetching Routing_SNFs data:', err);
            setError('Failed to fetch Routing SNF data');
        } finally {
            setLoading(false);
        }
    };
    
    // Call the function directly - don't use await here
    load();
}, []);


    // Persist selections and filters whenever they change (after we attempted restore)
    useEffect(() => {
        if (!hasAttemptedRestore.current) return;
        try {
            sessionStorage.setItem('RoutingTrans', JSON.stringify({
                columnFilters: columnFilters
            }));
        } catch {}
    }, [columnFilters]);
    // #endregion




    // When viewing all tables or multiple, allow client-side field filtering and apply table/field search as LIKE
    const displayedRecords = React.useMemo(() => {
        let data = [...records];
        
        // Filter logic for the field names (removed transaction)
        const cf = columnFilters;
        const customerIdNeedle = (cf.customer_id || '').toLowerCase();
        const isaIdNeedle = (cf.isa_id || '').toLowerCase();
        const isaQualifierNeedle = (cf.isa_qualifier || '').toLowerCase();
        // Remove transactionNeedle
        const ediAccountIdNeedle = (cf.edi_account_id || '').toLowerCase();

        if (customerIdNeedle || isaIdNeedle || isaQualifierNeedle || ediAccountIdNeedle) {
            data = data.filter(r => {
                const customerIdStr = String(r.customer_id || '').toLowerCase();
                const isaIdStr = String(r.isa_id || '').toLowerCase();
                const isaQualifierStr = String(r.isa_qualifier || '').toLowerCase();
                // Remove transactionStr
                const ediAccountIdStr = String(r.edi_account_id || '').toLowerCase();


                return (
                    (!customerIdNeedle || customerIdStr.includes(customerIdNeedle)) &&
                    (!isaIdNeedle || isaIdStr.includes(isaIdNeedle)) &&
                    (!isaQualifierNeedle || isaQualifierStr.includes(isaQualifierNeedle)) &&
                    // Remove transaction filter condition
                    (!ediAccountIdNeedle || ediAccountIdStr.includes(ediAccountIdNeedle))
                );
            });
        }
        
        return data;
    }, [records, columnFilters]);

    // #endregion Computed Values


  
      
    const clearAllFilters = () => {
        setColumnFilters({});
    };
       

   const validateForm = () => {
        const errors = [];
        
        // Check the actual field names that match your specificFields in routing_snf.js
        if (!formData.customer_id || formData.customer_id.trim() === '') {
            errors.push('Customer ID is required');
        }
        if (!formData.isa_id || formData.isa_id.trim() === '') {
            errors.push('ISA ID is required');
        }
        if (!formData.isa_qualifier || formData.isa_qualifier.trim() === '') {
            errors.push('ISA Qualifier is required');
        }
        // Remove transaction validation
        if (!formData.edi_account_id || formData.edi_account_id.trim() === '') {
            errors.push('Trading Partner Account ID is required');
        }
        
        return errors;
    };

    const handleSave = async () => {
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setError(validationErrors.join(', '));
            return;
        }

        try {
            setLoading(true);
            setError("");
            const url = editingRecord 
                ? `https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${tableName}/Records/${editingRecord._row_id}`
                : `https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${tableName}/Records`;
            const method = editingRecord ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (response.ok) {
                closeModal();
                fetchTableData(pagination.offset);
            } else {
                setError(result.error || 'Failed to save record');
            }
        } catch (err) {
            setError('Failed to save record');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (record) => {
        const recordDesc = `Customer ID: ${record.customer_id}, ISA ID: ${record.isa_id}`;
        if (!window.confirm(`Are you sure you want to delete this record?\n\n${recordDesc}`)) {
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${tableName}/Records/${record._row_id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (response.ok) {
                fetchTableData(pagination.offset);
            } else {
                setError(result.error || 'Failed to delete record');
            }
        } catch (err) {
            setError('Failed to delete record');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        try {
            const headers = columns.map(col => getColumnDisplayName(col));
            const rows = records.map(record => 
                columns.map(col => {
                    const value = record[col.column_name];
                    if (value === null || value === undefined) return '';
                    return String(value);
                })
            );
            const csvEscape = (str) => {
                if (str == null) return '';
                const s = String(str);
                if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            };
            const csv = '\ufeff' + [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const pad = (n) => String(n).padStart(2, '0');
            const now = new Date();
            const fileName = `RoutingTransactionConfig_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Failed to export');
            console.error('Export error:', e);
        }
    };

    // Add this function definition
const fetchTableData = async (offset = 0) => {
    try {
        setLoading(true);
        setError("");
        
        const params = new URLSearchParams({
            limit: pagination.limit.toString(),
            offset: offset.toString()
        });
        
        // Add column filters if any are active
        const activeFilters = Object.entries(columnFilters || {}).filter(([_, v]) => (v ?? '').trim() !== '');
        if (activeFilters.length > 0) {
            params.append('columnFilters', JSON.stringify(Object.fromEntries(activeFilters)));
        }

        const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${encodeURIComponent(tableName)}/Records?${params.toString()}`);
        const data = await response.json();
        
        if (response.ok) {
            setRecords(data.records || []);
            setPagination({
                total: data.total || 0,
                limit: data.limit || 12,
                offset: data.offset || 0,
                hasMore: data.hasMore || false
            });
        } else {
            setError(data.error || 'Failed to fetch table data');
        }
    } catch (err) {
        console.error('Error fetching Routing_SNFs data:', err);
        setError('Failed to fetch routing transaction data');
    } finally {
        setLoading(false);
    }
};

// Add these new state variables after your existing useState declarations:
const [showEdiSearchModal, setShowEdiSearchModal] = useState(false);
const [ediAccounts, setEdiAccounts] = useState([]);
const [ediSearchTerm, setEdiSearchTerm] = useState('');
const [ediSearchLoading, setEdiSearchLoading] = useState(false);

// Add a new state to store all accounts
const [allEdiAccounts, setAllEdiAccounts] = useState([]);

// Update fetchEdiAccounts to only fetch once and store all accounts
const fetchEdiAccounts = async () => {
    try {
        setEdiSearchLoading(true);
        
        const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers`);
        const data = await response.json();
        
        if (response.ok) {
            const accounts = data || [];
            setAllEdiAccounts(accounts); // Store all accounts
            setEdiAccounts(accounts); // Show all accounts initially
        } else {
            console.error('Failed to fetch EDI accounts:', data.error);
            setEdiAccounts([]);
            setAllEdiAccounts([]);
        }
    } catch (error) {
        console.error('Error fetching EDI accounts:', error);
        setEdiAccounts([]);
        setAllEdiAccounts([]);
    } finally {
        setEdiSearchLoading(false);
    }
};

// Add function to open EDI search modal:
const openEdiSearchModal = () => {
    setShowEdiSearchModal(true);
    setEdiSearchTerm('');
    fetchEdiAccounts(); // Load initial data
};

// Add function to close EDI search modal:
const closeEdiSearchModal = () => {
    setShowEdiSearchModal(false);
    setEdiSearchTerm('');
    setEdiAccounts([]);
    setAllEdiAccounts([]);
};

// Add function to handle EDI account selection:
const handleEdiAccountSelect = (account) => {
    setFormData(prev => ({
        ...prev,
        edi_account_id: account.edia_edi_account_id
    }));
    closeEdiSearchModal();
};

// Update handleEdiSearch to filter locally
const handleEdiSearch = (searchTerm) => {
    setEdiSearchTerm(searchTerm);
    
    if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        const filtered = allEdiAccounts.filter(account => 
            account.edia_edi_account_id?.toLowerCase().includes(searchLower) ||
            account.edia_cust_name?.toLowerCase().includes(searchLower) ||
            account.edia_as400_xref?.toLowerCase().includes(searchLower) ||
            account.invex_account_ids?.toLowerCase().includes(searchLower)
        );
        setEdiAccounts(filtered);
    } else {
        // Show all accounts when search is cleared
        setEdiAccounts(allEdiAccounts);
    }
};

    return (
        <div>
            <div style={{ width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
                
{loading && (<div style={{ marginBottom: '20px' }}>
                
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '20px',
                        color: '#666'
                    }}>
                        Loading...
                    </div>
                
            </div>)}
                    {<RoutingTransactionTable
                        setColumnFilters={setColumnFilters}
                        columnFilters={columnFilters}
                        handleExport={handleExport}
                        clearAllFilters={clearAllFilters}
                        records={displayedRecords}
                        loading={loading}
                        error={error}
                        pagination={pagination}
                        handleNextPage={handleNextPage}
                        handlePreviousPage={handlePreviousPage}
                        getCurrentPageInfo={getCurrentPageInfo}
                        columns={columns}
                        fieldDescriptions={fieldDescriptions}
                        showModal={showModal}
                        openAddModal={openAddModal}
                        openEditModal={openEditModal}
                        closeModal={closeModal}
                        handleFormChange={handleFormChange}
                        formData={formData}
                        handleSave={handleSave}
                        editingRecord={editingRecord}
                        handleDelete={handleDelete}
                        FILTER_ROW_HEIGHT={FILTER_ROW_HEIGHT}
                        setShowFilters={setShowFilters}
                        showFilters={showFilters}
                        getColumnDisplayName={getColumnDisplayName}
                        formatValue={formatValue}
                        // Add new props for EDI search functionality
    showEdiSearchModal={showEdiSearchModal}
    openEdiSearchModal={openEdiSearchModal}
    closeEdiSearchModal={closeEdiSearchModal}
    ediAccounts={ediAccounts}
    ediSearchTerm={ediSearchTerm}
    ediSearchLoading={ediSearchLoading}
    handleEdiSearch={handleEdiSearch}
    handleEdiAccountSelect={handleEdiAccountSelect}
                    />}

                </div>
            </div>
        
    );
};

export default RoutingTransactionView;
