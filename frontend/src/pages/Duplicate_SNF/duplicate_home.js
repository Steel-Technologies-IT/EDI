//Imports
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiDownload, FiFilter, FiPlus, FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';
import { FcClearFilters } from "react-icons/fc";
import { stringifyForFilter, stringifyTrnsValue, formatDateForInput, csvEscape, normalizeVal } from '../../functions/helpers';
import DuplicateSNFTable from "./duplicate_snf"



const DuplicateSNFView = () => {
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
               dup_cus_id: '',
           dup_trans: '',
           dup_gs_id: '',
           dup_env: ''
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
       const tableName = "Duplicate_SNFs";
   
       // Field descriptions to help users
       const fieldDescriptions = {
           dup_cus_id: "Customer ID (8-digit number)",
           dup_trans: "Transaction type (3 characters, e.g., '856')",
           dup_gs_id: "GS Sender ID",
           dup_env: "Environment (Q=QA, P=Production, default: Q)"
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
        // Initialize form with default values
        setFormData({
            dup_cus_id: '',
            dup_trans: '',
            dup_gs_id: '',
            dup_isnd_id: '',
            dup_env: 'Q' // Default environment
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
                fetch(`https://${process.env.REACT_APP_HOST}:5000/DuplicateASN/Tables/${encodeURIComponent(tableName)}/Columns`),
                fetch(`https://${process.env.REACT_APP_HOST}:5000/DuplicateASN/Tables/${encodeURIComponent(tableName)}/Records?${params.toString()}`)
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
            console.error('Error fetching Duplicate_SNFs data:', err);
            setError('Failed to fetch duplicate SNF data');
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
            sessionStorage.setItem('Duplicate', JSON.stringify({
                columnFilters: columnFilters
            }));
        } catch {}
    }, [columnFilters]);
    // #endregion




    // When viewing all tables or multiple, allow client-side field filtering and apply table/field search as LIKE
    const displayedRecords = React.useMemo(() => {
        let data = [...records];
        
        // Filter logic for Duplicate SNF fields
        const cf = columnFilters;
        const cusNeedle = (cf.dup_cus_id || '').toLowerCase();
        const transNeedle = (cf.dup_trans || '').toLowerCase();
        const gsNeedle = (cf.dup_gs_id || '').toLowerCase();
        const envNeedle = (cf.dup_env || '').toLowerCase();

        if (cusNeedle || transNeedle || gsNeedle || envNeedle) {
            data = data.filter(r => {
                const cusStr = String(r.dup_cus_id || '').toLowerCase();
                const transStr = String(r.dup_trans || '').toLowerCase();
                const gsStr = String(r.dup_gs_id || '').toLowerCase();
                const envStr = String(r.dup_env || '').toLowerCase();
                
                return (
                    (!cusNeedle || cusStr.includes(cusNeedle)) &&
                    (!transNeedle || transStr.includes(transNeedle)) &&
                    (!gsNeedle || gsStr.includes(gsNeedle)) &&
                    (!envNeedle || envStr.includes(envNeedle))
                );
            });
        }
        
        return data;
    }, [records, columnFilters]);

    // #endregion Computed Values


  
      
    const clearAllFilters = () => {
        setColumnFilters({});
    };


    const handleCopy = (rule) => {
        // Persist current selections so Back restores them
        try {
            sessionStorage.setItem('TranslationHomeReturn', JSON.stringify({
                tables: selectedTables,
                fields: selectedFields,
                columnFilters: columnFilters
            }));
        } catch {}

        // Build query string with rule data for copying
        const params = new URLSearchParams();
        params.append('type', 'copy');
        params.append('table', (selectedTables.length === 1 ? selectedTables[0] : (rule.trns_trns_tbl || "")));
        params.append('seq', rule.trns_seq);
        params.append('field', (selectedFields.length === 1 ? selectedFields[0] : rule.trns_trns_fld));
        if (Array.isArray(selectedTables)) {
            params.append('searchTable', selectedTables.join(','));
        } else {
            params.append('searchTable', selectedTables);
        }
         if (Array.isArray(selectedFields)) {
            params.append('searchField', selectedFields.join(','));
        } else {
            params.append('searchField', selectedFields);
        }
        if(mode === 'O'){
            params.append('cust_no', (rule.trns_cust_no ?? rule.trns_customer_no ?? '').toString());
        }
        params.append('outputType', rule.trns_output_type || '');
        // Handle source component, operator, value, and output value
        if (Array.isArray(rule.trns_source_comp)) {
            params.append('sourceComp', rule.trns_source_comp.join(','));
        } else {
            params.append('sourceComp', rule.trns_source_comp || '');
        }
        if (Array.isArray(rule.trns_operatione)) {
            params.append('operator', rule.trns_operatione.join(','));
        } else {
            params.append('operator', rule.trns_operatione || '');
        }
        if (Array.isArray(rule.trns_value)) {
            params.append('value', JSON.stringify(rule.trns_value));
        } else {
            params.append('value', rule.trns_value || '');
        }
        params.append('outputValue', rule.trns_output_value || '');
        params.append('mode', mode);
        params.append('user', currentUser || '');
        mode === 'I' ?
        navigate(`/TranslationTableInsert?${params.toString()}`)
        :
        navigate(`/TranslationTableInsert?${params.toString()}`);
    };        

   const validateForm = () => {
        const errors = [];
        if (!formData.dup_cus_id || formData.dup_cus_id.trim() === '') {
            errors.push('Customer ID is required');
        }
        if (!formData.dup_trans || formData.dup_trans.trim() === '') {
            errors.push('Transaction type is required');
        }
        if (!formData.dup_gs_id || formData.dup_gs_id.trim() === '') {
            errors.push('GS ID is required');
        }
        if (formData.dup_cus_id && !/^\d{1,8}$/.test(formData.dup_cus_id)) {
            errors.push('Customer ID must be a number with up to 8 digits');
        }
        if (formData.dup_trans && formData.dup_trans.length > 3) {
            errors.push('Transaction type must be 3 characters or less');
        }
        if (formData.dup_gs_id && formData.dup_gs_id.length > 15) {
            errors.push('GS ID must be 15 characters or less');
        }
        if (formData.dup_env && formData.dup_env.length > 1) {
            errors.push('Environment must be 1 character');
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
                ? `https://${process.env.REACT_APP_HOST}:5000/DuplicateASN/Tables/${tableName}/Records/${editingRecord._row_id}`
                : `https://${process.env.REACT_APP_HOST}:5000/DuplicateASN/Tables/${tableName}/Records`;
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
        const recordDesc = `Customer ID: ${record.dup_cus_id}, Transaction: ${record.dup_trans}`;
        if (!window.confirm(`Are you sure you want to delete this record?\n\n${recordDesc}`)) {
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/DuplicateASN/Tables/${tableName}/Records/${record._row_id}`, {
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
            const fileName = `DuplicateSNFConfig_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
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
console.log(records)
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
                    {<DuplicateSNFTable
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
                    />}

                </div>
            </div>
        
    );
};

export default DuplicateSNFView;
