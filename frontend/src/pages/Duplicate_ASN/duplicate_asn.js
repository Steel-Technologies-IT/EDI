import React, { useEffect, useState, useCallback } from "react";
import { FiFilter, FiPlus, FiEdit, FiTrash2, FiDownload } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';

const DuplicateASNView = () => {
    const [columns, setColumns] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pagination, setPagination] = useState({
        total: 0,
        limit: 12,
        offset: 0,
        hasMore: false
    });
    // Search state
    const [searchColumn, setSearchColumn] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(true);
    const FILTER_ROW_HEIGHT = 40; // px
    const [columnFilters, setColumnFilters] = useState({});

    // Modal state for Add/Edit
    const [showModal, setShowModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({});

    // Fixed table name
    const tableName = "Duplicate_SNFs";

    // Field descriptions to help users
    const fieldDescriptions = {
        dup_cus_id: "Customer ID (8-digit number)",
        dup_trans: "Transaction type (3 characters, e.g., '856')",
        dup_isa_qual: "ISA Qualifier (2 characters, e.g., 'ZZ')",
        dup_isnd_id: "Interchange Sender ID (up to 15 characters)",
        dup_env: "Environment (Q=QA, P=Production, default: Q)"
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchTableData(0);
    }, []);

    // Restore state from sessionStorage
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('DuplicateASNViewState');
            if (raw) {
                const data = JSON.parse(raw);
                if (data && typeof data === 'object') {
                    if (typeof data.searchColumn === 'string') setSearchColumn(data.searchColumn);
                    if (typeof data.searchTerm === 'string') setSearchTerm(data.searchTerm);
                    if (data.columnFilters && typeof data.columnFilters === 'object') setColumnFilters(data.columnFilters);
                }
            }
        } catch {}
    }, []);

    // Persist state
    useEffect(() => {
        try {
            sessionStorage.setItem('DuplicateASNViewState', JSON.stringify({
                searchColumn,
                searchTerm,
                columnFilters
            }));
        } catch {}
    }, [searchColumn, searchTerm, columnFilters]);

    const fetchTableData = useCallback(async (offset = 0) => {
        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({ 
                limit: String(pagination.limit), 
                offset: String(offset) 
            });
            
            // Add search parameters
            const hasFilter = searchColumn && searchTerm.trim().length > 0;
            if (hasFilter) {
                params.append('searchColumn', searchColumn);
                params.append('searchTerm', searchTerm.trim());
            }

            // Add column filters to the request
            const activeFilters = Object.entries(columnFilters || {}).filter(([_, v]) => (v ?? '').trim() !== '');
            if (activeFilters.length > 0) {
                params.append('columnFilters', JSON.stringify(Object.fromEntries(activeFilters)));
            }

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
    }, [pagination.limit, searchColumn, searchTerm, columnFilters]);

    // Debounce search to avoid excessive calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setPagination(prev => ({ ...prev, offset: 0 }));
            fetchTableData(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchColumn, searchTerm, columnFilters, fetchTableData]);

    const clearAllFilters = () => {
        setColumnFilters({});
        setSearchColumn("");
        setSearchTerm("");
    };

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
            dup_isa_qual: '',
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

    const validateForm = () => {
        const errors = [];
        
        // Check required fields (based on your business logic)
        if (!formData.dup_cus_id || formData.dup_cus_id.trim() === '') {
            errors.push('Customer ID is required');
        }
        if (!formData.dup_trans || formData.dup_trans.trim() === '') {
            errors.push('Transaction type is required');
        }
        if (!formData.dup_isa_qual || formData.dup_isa_qual.trim() === '') {
            errors.push('ISA Qualifier is required');
        }
        if (!formData.dup_isnd_id || formData.dup_isnd_id.trim() === '') {
            errors.push('Interchange Sender ID is required');
        }

        // Validate field lengths and formats
        if (formData.dup_cus_id && !/^\d{1,8}$/.test(formData.dup_cus_id)) {
            errors.push('Customer ID must be a number with up to 8 digits');
        }
        if (formData.dup_trans && formData.dup_trans.length > 3) {
            errors.push('Transaction type must be 3 characters or less');
        }
        if (formData.dup_isa_qual && formData.dup_isa_qual.length > 2) {
            errors.push('ISA Qualifier must be 2 characters or less');
        }
        if (formData.dup_isnd_id && formData.dup_isnd_id.length > 15) {
            errors.push('Interchange Sender ID must be 15 characters or less');
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
                fetchTableData(pagination.offset); // Refresh current page
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
                fetchTableData(pagination.offset); // Refresh current page
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
            // Create headers using display names
            const headers = columns.map(col => getColumnDisplayName(col));
            
            // Create rows with actual data
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
            const a = document.createElement('a');
            const pad = (n) => String(n).padStart(2, '0');
            const now = new Date();
            const fileName = `DuplicateSNFConfig_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
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

    return (
        <div style={{ width: '100%', minHeight: '80vh', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2>Duplicate SNF Configuration</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Configure customers who need duplicate SNF records sent. Each record defines a customer and transaction type combination that requires duplicates.
                </p>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '12px' }}>
                    <button
                        type="button"
                        onClick={() => setShowFilters(v => !v)}
                        title={showFilters ? 'Hide Filters' : 'Show Filters'}
                        style={{ 
                            border: 'none',
                            padding: '6px 8px', 
                            cursor: 'pointer',
                            display: 'flex',
                            background: 'none',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FiFilter size={18} color="#000" />
                    </button>
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        title="Clear All Filters"
                        style={{ 
                            border: 'none',
                            background: 'none',  
                            borderRadius: 4, 
                            padding: '6px 8px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FcClearFilters size={18} />
                    </button>
                    
                    
                    <button
                        type="button"
                        onClick={openAddModal}
                        title="Add New Configuration"
                        style={{ 
                            color: 'black',
                            border: 'none',
                            background: 'none', 
                            borderRadius: 4, 
                            padding: '6px 12px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FiPlus size={18} />
                    </button>
                    <button
                    onClick={handleExport}
                    title="Export to Excel (CSV)"
                    aria-label="Export to CSV"
                    style={{ 
                        color: 'black',
                        border: 'none',
                        background: 'none',
                        borderRadius: 4, 
                        padding: '6px 12px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                    <FiDownload size={22} color="#000000ff" />
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div style={{ 
                        background: '#ffebee', 
                        color: '#c62828', 
                        padding: '12px', 
                        borderRadius: '4px', 
                        marginBottom: '20px',
                        border: '1px solid #ffcdd2'
                    }}>
                        Error: {error}
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '20px',
                        color: '#666'
                    }}>
                        Loading...
                    </div>
                )}

                {/* Pagination Info and Controls */}
                {!loading && records.length > 0 && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '20px',
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: '4px'
                    }}>
                        <div>
                            <strong>Records:</strong> {getCurrentPageInfo()}
                        </div>
                        <div>
                            <button 
                                onClick={handlePreviousPage} 
                                disabled={pagination.offset === 0}
                                style={{ 
                                    padding: '6px 12px', 
                                    marginRight: '8px',
                                    background: pagination.offset === 0 ? '#ccc' : '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: pagination.offset === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Previous
                            </button>
                            <button 
                                onClick={handleNextPage} 
                                disabled={!pagination.hasMore}
                                style={{ 
                                    padding: '6px 12px',
                                    background: !pagination.hasMore ? '#ccc' : '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: !pagination.hasMore ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table Display */}
            {!loading && records.length > 0 && (
                <div style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                    overflow: 'hidden' 
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            fontSize: '14px'
                        }}>
                            <thead>
                                {showFilters && (
                                    <tr>
                                        {columns.map((column, index) => (
                                            <th
                                                key={`filter-${index}`}
                                                style={{
                                                    padding: 0,
                                                    background: '#fff',
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 6,
                                                    border: '1px solid #dee2e6',
                                                    borderBottom: 0,
                                                    height: FILTER_ROW_HEIGHT
                                                }}
                                            >
                                                <input
                                                    placeholder={`Filter ${getColumnDisplayName(column)}`}
                                                    value={columnFilters[column.column_name] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setColumnFilters(prev => ({ ...prev, [column.column_name]: val }));
                                                    }}
                                                    style={{ 
                                                        width: '100%', 
                                                        height: '100%', 
                                                        boxSizing: 'border-box', 
                                                        border: 'none', 
                                                        outline: 'none', 
                                                        padding: 8,
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </th>
                                        ))}
                                        <th style={{
                                            padding: 0,
                                            background: '#fff',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 6,
                                            border: '1px solid #dee2e6',
                                            borderBottom: 0,
                                            height: FILTER_ROW_HEIGHT,
                                            width: '100px'
                                        }}>
                                            {/* Actions column header for filter row */}
                                        </th>
                                    </tr>
                                )}
                                <tr style={{ background: '#f8f9fa' }}>
                                    {columns.map((column, index) => (
                                        <th 
                                            key={index}
                                            style={{ 
                                                padding: '12px 8px', 
                                                border: '1px solid #dee2e6',
                                                textAlign: 'left',
                                                fontWeight: 'bold',
                                                position: 'sticky',
                                                top: showFilters ? FILTER_ROW_HEIGHT : 0,
                                                background: '#f8f9fa',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={`${column.column_name}: ${fieldDescriptions[column.column_name] || `Type: ${column.data_type}, Nullable: ${column.is_nullable}`}`}
                                        >
                                            {getColumnDisplayName(column)}
                                        </th>
                                    ))}
                                    <th style={{ 
                                        padding: '12px 8px', 
                                        border: '1px solid #dee2e6',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        position: 'sticky',
                                        top: showFilters ? FILTER_ROW_HEIGHT : 0,
                                        background: '#f8f9fa',
                                        width: '100px'
                                    }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record, rowIndex) => (
                                    <tr 
                                        key={record._row_id || rowIndex}
                                        style={{ 
                                            background: rowIndex % 2 === 0 ? '#fff' : '#f8f9fa'
                                        }}
                                    >
                                        {columns.map((column, colIndex) => (
                                            <td 
                                                key={colIndex}
                                                style={{ 
                                                    padding: '8px', 
                                                    border: '1px solid #dee2e6',
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title={String(record[column.column_name] || '')}
                                            >
                                                {formatValue(record[column.column_name])}
                                            </td>
                                        ))}
                                        <td style={{ 
                                            padding: '8px', 
                                            border: '1px solid #dee2e6',
                                            textAlign: 'center'
                                        }}><div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                marginBottom: '20px',
                                                padding: '10px',
                                                background: 'none',
                                                borderRadius: '4px'
                                            }}>
                                            <button
                                                onClick={() => openEditModal(record)}
                                                style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                            }}
                                                title="Edit Configuration"
                                            >
                                                <FiEdit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                }}
                                                title="Delete Configuration"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Data Message */}
            {!loading && records.length === 0 && !error && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    color: '#666'
                }}>
                    No duplicate configurations found. Click "Add Configuration" to create the first one.
                </div>
            )}

            {/* Modal for Add/Edit */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '20px',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }}>
                        <h3>{editingRecord ? 'Edit Configuration' : 'Add New Configuration'}</h3>
                        
                        <div style={{ marginBottom: '20px' }}>
                            {columns.map((column) => (
                                <div key={column.column_name} style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        {getColumnDisplayName(column)}
                                        <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData[column.column_name] || ''}
                                        onChange={(e) => handleFormChange(column.column_name, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            boxSizing: 'border-box'
                                        }}
                                        placeholder={`Enter ${getColumnDisplayName(column)}`}
                                    />
                                    <small style={{ color: '#666' }}>
                                        {fieldDescriptions[column.column_name] || `Type: ${column.data_type}`}
                                    </small>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeModal}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    background: '#f8f9fa',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: '#28a745',
                                    color: 'white',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuplicateASNView;
