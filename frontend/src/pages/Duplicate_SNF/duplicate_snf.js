import React, { useEffect, useState, useCallback } from "react";
import { FiFilter, FiPlus, FiEdit, FiTrash2, FiDownload } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';

const DuplicateSNFTable = ({
    setColumnFilters,
    columnFilters,
    handleExport,
    clearAllFilters,
    records,
    loading,
    error,
    pagination,
    handleNextPage,
    handlePreviousPage,
    getCurrentPageInfo,
    columns,
    fieldDescriptions,
    showModal,
    openAddModal,
    openEditModal,
    closeModal,
    handleFormChange,
    formData,
    handleSave,
    editingRecord,
    handleDelete,
    FILTER_ROW_HEIGHT = 40,
    setShowFilters,
    showFilters,
    getColumnDisplayName,
    formatValue
}) => {
// Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 20;
    const totalPages = Math.ceil(records.length / rowsPerPage);
    const paginatedRecords = records.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const Pagination = () => (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
            <span style={{ margin: '0 12px' }}>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
    );

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
                            <Pagination />
                        </div>
                    </div>
                )}
            </div>

            {/* Table Display */}
            {!loading && (
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
                                {paginatedRecords.length > 0 ? (
                                    paginatedRecords.map((record, rowIndex) => (
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length + 1} style={{ 
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#666',
                                            border: '1px solid #dee2e6'
                                        }}>
                                            No matching records found. Try adjusting your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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

export default DuplicateSNFTable;
