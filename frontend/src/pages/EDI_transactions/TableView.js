import React, { useEffect, useState, useCallback } from "react";
import Select from 'react-select';
import { FiFilter } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';

const TableView = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
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
    // New: search state
    const [searchColumn, setSearchColumn] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    // New: table dropdown search
    const [tableSearch, setTableSearch] = useState("");
    const [showFilters, setShowFilters] = useState(true);
    const FILTER_ROW_HEIGHT = 40; // px
    const [columnFilters, setColumnFilters] = useState({});

    // Fetch all available tables on component mount
    useEffect(() => {
        fetchTables();
    }, []);

    // Restore state like TranslationHome
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('TableViewState');
            if (raw) {
                const data = JSON.parse(raw);
                if (data && typeof data === 'object') {
                    if (typeof data.selectedTable === 'string') setSelectedTable(data.selectedTable);
                    if (typeof data.tableSearch === 'string') setTableSearch(data.tableSearch);
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
            sessionStorage.setItem('TableViewState', JSON.stringify({
                selectedTable,
                tableSearch,
                searchColumn,
                searchTerm,
                columnFilters
            }));
        } catch {}
    }, [selectedTable, tableSearch, searchColumn, searchTerm, columnFilters]);

    // Fetch records when selected table changes
    useEffect(() => {
        if (selectedTable) {
            // Reset search and pagination when table changes
            setSearchColumn("");
            setSearchTerm("");
            setColumnFilters({});
            fetchTableData(selectedTable, 0);
        } else {
            setRecords([]);
            setColumns([]);
            setPagination(prev => ({ ...prev, total: 0, offset: 0, hasMore: false }));
        }
    }, [selectedTable]);

    const fetchTables = async () => {
        try {
            const response = await fetch('https://az-cld-ivap-d1:5000/EDI_Tables/Tables');
            const data = await response.json();
            if (response.ok) {
                setTables(data.tables || []);
            } else {
                setError(data.error || 'Failed to fetch tables');
            }
        } catch (err) {
            console.error('Error fetching tables:', err);
            setError('Failed to connect to server');
        }
    };

    // Filter tables by search (LIKE '%q%'), but always include current selection
    const filteredTables = React.useMemo(() => {
        const q = tableSearch.trim().toLowerCase();
        let opts = q ? tables.filter(t => t.toLowerCase().includes(q)) : [...tables];
        if (selectedTable && !opts.includes(selectedTable)) {
            opts = [selectedTable, ...opts];
        }
        return opts;
    }, [tables, tableSearch, selectedTable]);

    // Apply client-side multi-column, multi-value filtering (comma-separated values per column)
    const displayedRecords = React.useMemo(() => {
        if (!records || records.length === 0) return [];
        const active = Object.entries(columnFilters || {}).filter(([_, v]) => (v ?? '').trim() !== '');
        if (active.length === 0) return records;
        return records.filter(row => {
            return active.every(([colName, val]) => {
                const tokens = String(val)
                    .split(',')
                    .map(s => s.trim().toLowerCase())
                    .filter(Boolean);
                const cell = row[colName];
                const cellStr = (cell === null || cell === undefined) ? '' : String(cell).toLowerCase();
                return tokens.some(tok => cellStr.includes(tok));
            });
        });
    }, [records, columnFilters]);

    const fetchTableData = useCallback(async (tableName, offset = 0) => {
        setLoading(true);
        setError("");

        try {
            // Build query for records with optional search
            const params = new URLSearchParams({ limit: String(pagination.limit), offset: String(offset) });
            const hasFilter = searchColumn && searchTerm.trim().length > 0;
            if (hasFilter) {
                params.append('searchColumn', searchColumn);
                params.append('searchTerm', searchTerm.trim());
            }

            // Fetch columns and records in parallel (columns unaffected by search)
            const [columnsResponse, recordsResponse] = await Promise.all([
                fetch(`https://az-cld-ivap-d1:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/Columns`),
                fetch(`https://az-cld-ivap-d1:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/Records?${params.toString()}`)
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
                    limit: recordsData.limit || 15,
                    offset: recordsData.offset || 0,
                    hasMore: recordsData.hasMore || false
                });
            } else {
                setError(columnsData.error || recordsData.error || 'Failed to fetch table data');
            }
        } catch (err) {
            console.error('Error fetching table data:', err);
            setError('Failed to fetch table data');
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, searchColumn, searchTerm]);

    // Debounce search to avoid excessive calls
    useEffect(() => {
        if (!selectedTable) return;
        const timer = setTimeout(() => {
            setPagination(prev => ({ ...prev, offset: 0 }));
            fetchTableData(selectedTable, 0);
        }, 300);
        return () => clearTimeout(timer);
    }, [selectedTable, searchColumn, searchTerm, fetchTableData]);

    const handleTableChange = (selectedOption) => {
        if (selectedOption && selectedOption.value) {
            setSelectedTable(selectedOption.value);
            // After selecting, show full list again (not filtered by prior search)
            setTableSearch('');
        } else {
            // Cleared
            setSelectedTable('');
        }
    };

    const clearAllColumnFilters = () => {
        setColumnFilters({});
        setSearchColumn("");
        setSearchTerm("");
        // Also clear selected table and table search so dropdown resets to ''
        setSelectedTable("");
        setTableSearch("");
    };

    const clearSearch = () => {
        setSearchColumn("");
        setSearchTerm("");
        if (selectedTable) fetchTableData(selectedTable, 0);
    };

    const handlePreviousPage = () => {
        const newOffset = Math.max(0, pagination.offset - pagination.limit);
        fetchTableData(selectedTable, newOffset);
    };

    const handleNextPage = () => {
        if (pagination.hasMore) {
            const newOffset = pagination.offset + pagination.limit;
            fetchTableData(selectedTable, newOffset);
        }
    };

    const formatValue = (value) => {
        if (value === null) return <span style={{ color: '#999', fontStyle: 'italic' }}>NULL</span>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const getCurrentPageInfo = () => {
        const start = pagination.offset + 1;
        const end = Math.min(pagination.offset + pagination.limit, pagination.total);
        return `${start}-${end} of ${pagination.total}`;
    };

    return (
        <div style={{ width: '100%', minHeight: '80vh', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2>EDI Table Viewer</h2>
                
                {/* Table Selection Dropdown with search like TranslationHome */}
                <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="tableSelect" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Select Table:
                    </label>
                    <Select
                        placeholder="Select a table..."
                        isClearable
                        onChange={handleTableChange}
                        value={selectedTable ? { value: selectedTable, label: selectedTable } : null}
                        options={filteredTables.map(table => ({ value: table, label: table }))}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            menu: (base) => ({ ...base, zIndex: 9999 })
                        }}
                    />
                </div>

                {/* Controls similar to TranslationHome: toggle filter row and clear filters */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '12px' }}>
                    <button
                        type="button"
                        onClick={() => setShowFilters(v => !v)}
                        title={showFilters ? 'Hide Filters' : 'Show Filters'}
                        aria-label={showFilters ? 'Hide Filters' : 'Show Filters'}
                        style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '6px 8px', cursor: 'pointer' }}
                    >
                        <FiFilter size={18} color="#000" />
                    </button>
                    <button
                        type="button"
                        onClick={clearAllColumnFilters}
                        title="Clear Filters"
                        aria-label="Clear Filters"
                        style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '6px 8px', cursor: 'pointer' }}
                    >
                        <FcClearFilters size={18} />
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
                        Loading table data...
                    </div>
                )}

                {/* Pagination Info and Controls */}
                {selectedTable && !loading && records.length > 0 && (
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
                            <strong>Table:</strong> {selectedTable} | <strong>Records:</strong> {getCurrentPageInfo()}
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
            {selectedTable && !loading && records.length > 0 && (
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
                                                    aria-label={`Filter ${column.column_name}`}
                                                    value={columnFilters[column.column_name] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setColumnFilters(prev => ({ ...prev, [column.column_name]: val }));
                                                    }}
                                                    style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                                                />
                                            </th>
                                        ))}
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
                                            title={`Type: ${column.data_type}, Nullable: ${column.is_nullable}`}
                                        >
                                            {column.column_name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedRecords.map((record, rowIndex) => (
                                    <tr 
                                        key={rowIndex}
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Data Message */}
            {selectedTable && !loading && records.length === 0 && !error && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    color: '#666'
                }}>
                    No records found in table "{selectedTable}".
                </div>
            )}

            {/* No rows after applying filters */}
            {selectedTable && !loading && records.length > 0 && displayedRecords.length === 0 && !error && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '20px',
                    background: '#fff3cd',
                    border: '1px solid #ffeeba',
                    borderRadius: '4px',
                    color: '#856404',
                    marginTop: '12px'
                }}>
                    No rows match the current column filters.
                </div>
            )}

            {/* No Table Selected Message */}
            {!selectedTable && !loading && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    color: '#666'
                }}>
                    Please select a table to view its records.
                </div>
            )}
        </div>
    );
};

export default TableView;
