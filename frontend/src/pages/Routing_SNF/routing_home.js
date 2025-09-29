//Imports
import React, { useEffect, useState } from "react";
import RoutingTransactionTable from "./routing_snf";



const RoutingTransactionView = () => {
    // State variables
    const [allCustomerAccounts, setAllCustomerAccounts] = useState([]);
    const [allEdiAccounts, setAllEdiAccounts] = useState([]);
    const [records, setRecords] = useState([]);
    const [showFilters, setShowFilters] = useState(true);
    const [columnFilters, setColumnFilters] = useState({
        customer_id: '',
        isa_id: '',
        edi_account_id: ''
    });
    const [columns, setColumns] = useState([]);
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

    const tableName = "Routing_SNFs";
    const FILTER_ROW_HEIGHT = 40;

    // Helper functions
    const getCustomerDisplayName = (customerId) => {
        if (!customerId || !allCustomerAccounts || allCustomerAccounts.length === 0) {
            return customerId || '';
        }
        
        const customerAccount = allCustomerAccounts.find(acc => acc.eii_ichg_acct_id === customerId);
        return customerAccount && customerAccount.cus_cus_nm 
            ? `${customerId} - ${customerAccount.cus_cus_nm}`
            : customerId;
    };

    const getTradingPartnerDisplayName = (ediAccountId) => {
        if (!ediAccountId || !allEdiAccounts || allEdiAccounts.length === 0) {
            return ediAccountId || '';
        }
        
        const ediAccount = allEdiAccounts.find(acc => acc.edia_edi_account_id === ediAccountId);
        return ediAccount && ediAccount.edia_cust_name 
            ? `${ediAccountId} - ${ediAccount.edia_cust_name}`
            : ediAccountId;
    };

    const getCurrentPageInfo = () => {
        const start = pagination.offset + 1;
        const end = Math.min(pagination.offset + pagination.limit, pagination.total);
        return `${start}-${end} of ${pagination.total}`;
    };

    const getColumnDisplayName = (column) => {
        return column.column_comment && column.column_comment.trim() !== '' 
            ? column.column_comment 
            : column.column_name;
    };

    const formatValue = (value) => {
        if (value === null || value === undefined) return <span style={{ color: '#999', fontStyle: 'italic' }}>NULL</span>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    // Modal handlers
    const openAddModal = () => {
        setEditingRecord(null);
        setFormData({
            customer_id: '',
            isa_id: '',
            isa_qualifier: '',
            edi_account_id: ''
        });
        setShowModal(true);
    };

    const openEditModal = (record) => {
        setEditingRecord(record);
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

    // Data fetching functions
    const fetchCustomerAccounts = async () => {
        try {
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/InvexCustomers`);
            const data = await response.json();
            
            if (response.ok) {
                let accounts = [];
                if (data && data.customers && data.customers.Data) {
                    accounts = data.customers.Data;
                } else if (data && Array.isArray(data)) {
                    accounts = data;
                } else if (data && data.Data && Array.isArray(data.Data)) {
                    accounts = data.Data;
                }
                
                setAllCustomerAccounts(accounts);
            } else {
                console.error('Failed to fetch customer accounts:', data.error || 'Unknown error');
                setAllCustomerAccounts([]);
            }
        } catch (error) {
            console.error('Error fetching customer accounts:', error);
            setAllCustomerAccounts([]);
        }
    };

    const fetchEdiAccounts = async () => {
        try {
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/CustomerConfiguration/customers`);
            const data = await response.json();
            
            if (response.ok) {
                const accounts = data || [];
                setAllEdiAccounts(accounts);
            } else {
                console.error('Failed to fetch EDI accounts:', data.error);
                setAllEdiAccounts([]);
            }
        } catch (error) {
            console.error('Error fetching EDI accounts:', error);
            setAllEdiAccounts([]);
        }
    };

    const fetchTableData = async (offset = 0) => {
        try {
            setLoading(true);
            setError("");
            
            const params = new URLSearchParams({
                limit: pagination.limit.toString(),
                offset: offset.toString()
            });
            
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

    // Pagination handlers
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

    // Filter and form handlers
    const clearAllFilters = () => {
        setColumnFilters({
            customer_id: '',
            isa_id: '',
            edi_account_id: ''
        });
    };

    const validateForm = () => {
        const errors = [];
        
        if (!formData.customer_id || formData.customer_id.trim() === '') {
            errors.push('Customer ID is required');
        }
        if (!formData.isa_id || formData.isa_id.trim() === '') {
            errors.push('ISA ID is required');
        }
        if (!formData.isa_qualifier || formData.isa_qualifier.trim() === '') {
            errors.push('ISA Qualifier is required');
        }
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

    // Initial data load
    useEffect(() => {
        setLoading(true);
        
        const load = async () => {
            try {
                await fetchCustomerAccounts();
                await fetchEdiAccounts();
                
                const [columnsResponse, recordsResponse] = await Promise.all([
                    fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${encodeURIComponent(tableName)}/Columns`),
                    fetch(`https://${process.env.REACT_APP_HOST}:5000/RoutingTrans/Tables/${encodeURIComponent(tableName)}/Records`)
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
        
        load();
    }, []);

    return (
        <div>
            <div style={{ width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
                {loading && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '20px',
                            color: '#666'
                        }}>
                            Loading...
                        </div>
                    </div>
                )}
                
                <RoutingTransactionTable
                    setColumnFilters={setColumnFilters}
                    columnFilters={columnFilters}
                    handleExport={handleExport}
                    clearAllFilters={clearAllFilters}
                    records={records}
                    loading={loading}
                    error={error}
                    pagination={pagination}
                    handleNextPage={handleNextPage}
                    handlePreviousPage={handlePreviousPage}
                    getCurrentPageInfo={getCurrentPageInfo}
                    columns={columns}
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
                    fetchCustomerAccounts={fetchCustomerAccounts}
                    getCustomerDisplayName={getCustomerDisplayName}
                    getTradingPartnerDisplayName={getTradingPartnerDisplayName}
                    allCustomerAccounts={allCustomerAccounts}
                    allEdiAccounts={allEdiAccounts}
                />
            </div>
        </div>
    );
};

export default RoutingTransactionView;
