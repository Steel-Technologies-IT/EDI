import React, { useEffect, useState, useCallback } from "react";

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

    // Fetch all available tables on component mount
    useEffect(() => {
        fetchTables();
    }, []);

    // Fetch records when selected table changes
    useEffect(() => {
        if (selectedTable) {
            // Reset search and pagination when table changes
            setSearchColumn("");
            setSearchTerm("");
            fetchTableData(selectedTable, 0);
        } else {
            setRecords([]);
            setColumns([]);
            setPagination(prev => ({ ...prev, total: 0, offset: 0, hasMore: false }));
        }
    }, [selectedTable]);

    const fetchTables = async () => {
        try {
            const response = await fetch('http://az-cld-ivap-d1:5000/EDI_Tables/Tables');
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
                fetch(`http://az-cld-ivap-d1:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/Columns`),
                fetch(`http://az-cld-ivap-d1:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/Records?${params.toString()}`)
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

    const handleTableChange = (e) => {
        setSelectedTable(e.target.value);
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
                
                {/* Table Selection Dropdown */}
                <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="tableSelect" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Select Table:
                    </label>
                    {/* Search inside dropdown area */}
                    <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Search tables..."
                        style={{ 
                            padding: '6px 10px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            minWidth: '300px',
                            marginBottom: '8px'
                        }}
                    />
                    <select 
                        id="tableSelect"
                        value={selectedTable} 
                        onChange={handleTableChange}
                        style={{ 
                            padding: '8px 12px', 
                            fontSize: '14px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            minWidth: '300px'
                        }}
                    >
                        <option value="">-- Select a table --</option>
                        {filteredTables.map(table => (
                            <option key={table} value={table}>{table}</option>
                        ))}
                    </select>
                </div>

                {/* Search Controls */}
                {selectedTable && columns.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                        <label htmlFor="searchColumn" style={{ fontWeight: 600 }}>Search:</label>
                        <select
                            id="searchColumn"
                            value={searchColumn}
                            onChange={(e) => setSearchColumn(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, minWidth: 200 }}
                        >
                            <option value="">-- Select column --</option>
                            {columns.map((c) => (
                                <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder={searchColumn ? `Filter by ${searchColumn}` : 'Enter text to filter'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, minWidth: 260 }}
                        />
                        <button
                            type="button"
                            onClick={clearSearch}
                            disabled={!searchColumn && !searchTerm}
                            style={{
                                padding: '6px 12px',
                                background: (!searchColumn && !searchTerm) ? '#ccc' : '#6c757d',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: (!searchColumn && !searchTerm) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Clear
                        </button>
                    </div>
                )}

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
                                                top: 0,
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
                                {records.map((record, rowIndex) => (
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
