import React, { useEffect, useState, useCallback } from "react";
import Select from 'react-select';
import { FiFilter } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';

const TableView = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [selectedNumber, setSelectedNumber] = useState("");
    const [columns, setColumns] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    // Pagination removed: we'll fetch all records and render them
    const [meta, setMeta] = useState({ total: 0 });
    // New: search state
    const [searchColumn, setSearchColumn] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    // New: table dropdown search
    const [tableSearch, setTableSearch] = useState("");
    const [showFilters, setShowFilters] = useState(true);
    const FILTER_ROW_HEIGHT = 40; // px
    const [columnFilters, setColumnFilters] = useState({});
    // Mill coil search (from detail table)
    const [coilSearch, setCoilSearch] = useState("");
    const [coilMatches, setCoilMatches] = useState([]);

    // Helper: robustly extract a 3-digit transaction number from a table name
    const extractTxnNumber = React.useCallback((t) => {
        if (typeof t !== 'string') return null;
        if (t.length >= 4 && /\d/.test(t[1]) && /\d/.test(t[2]) && /\d/.test(t[3])) {
            // User-specified: slice(1,4) when second char onward are digits (e.g., 'I856_...')
            return t.slice(1, 4);
        }
        const mStart = t.match(/^(\d{3})/); // starts with 3 digits (e.g., '856_...')
        if (mStart) return mStart[1];
        const mAny = t.match(/(\d{3})/); // any 3-digit sequence
        if (mAny) return mAny[1];
        return null;
    }, []);

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
            if (typeof data.selectedNumber === 'string') setSelectedNumber(data.selectedNumber);
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
                selectedNumber,
                tableSearch,
                searchColumn,
                searchTerm,
                columnFilters
            }));
        } catch {}
    }, [selectedTable, selectedNumber, tableSearch, searchColumn, searchTerm, columnFilters]);

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
            setMeta({ total: 0 });
        }
    }, [selectedTable]);

    // Build a map of <slice(1,4)> -> corresponding header table (ends with _SNF_Header)
    const headerTableByNumber = React.useMemo(() => {
        const map = new Map();
        for (const t of tables) {
            if (typeof t !== 'string') continue;
            const num = extractTxnNumber(t);
            if (!num) continue;
            const tLower = t.toLowerCase();
            if (tLower.endsWith('_snf_header')) {
                map.set(num, t);
            }
        }
        return map;
    }, [tables, extractTxnNumber]);

    // Options for number dropdown: unique values from t.slice(1,4) of all tables
    const numberOptions = React.useMemo(() => {
        return Array.from(headerTableByNumber.keys())
            .sort((a, b) => Number(a) - Number(b))
            .map(n => ({ value: n, label: n }));
    }, [headerTableByNumber]);

    // When a number is selected, auto-select the corresponding Header table
    useEffect(() => {
        if (selectedNumber) {
            const hdr = headerTableByNumber.get(selectedNumber);
            setSelectedTable(hdr || "");
        } else {
            // Clearing the number clears table selection too
            setSelectedTable("");
        }
    }, [selectedNumber, headerTableByNumber]);

    const fetchTables = async () => {
        try {
            const response = await fetch('https://localhost:5000/EDI_Tables/Tables');
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

    // Apply client-side multi-column, multi-value filtering (comma-separated values per column)
    const displayedRecords = React.useMemo(() => {
        if (!records || records.length === 0) return [];

        // Start from all loaded records
        let filtered = records;

        // If a mill coil search is active, restrict headers to those whose hdr_key is in the
        // set of dtl_keys that matched the coil (dtl_key = hdr_key relationship).
        if ((coilSearch || '').trim() !== '') {
            const matchSet = new Set((coilMatches || []).map(v => String(v)));
            filtered = filtered.filter(r => matchSet.has(String(r['hdr_key'])));
        }

        // Apply client-side per-column filters (comma-separated tokens per column)
        const active = Object.entries(columnFilters || {}).filter(([_, v]) => (v ?? '').trim() !== '');
        if (active.length === 0) return filtered;
        return filtered.filter(row => {
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
    }, [records, columnFilters, coilSearch, coilMatches]);

    // Helper: check if any of the three primary filters have a value
    const hasAnyPrimary = React.useMemo(() => {
        const keys = ['hdr_key', 'hdr_isnd_id', 'hdr_bol_no'];
        const anyTopThree = keys.some(k => ((columnFilters[k] ?? '').trim() !== ''));
        const hasCoil = (coilSearch || '').trim() !== '';
        return anyTopThree || hasCoil;
    }, [columnFilters, coilSearch]);

    // Derive display column order: first 3 primary, then synthetic dtl_mcoil as the 4th col, then others
    const displayColumns = React.useMemo(() => {
        const preferred = ['hdr_key', 'hdr_isnd_id', 'hdr_bol_no'];
        const names = (columns || []).map(c => c.column_name);
        const order = [];
        const seen = new Set();
        for (const p of preferred) {
            if (names.includes(p)) { order.push(p); seen.add(p); }
        }
        // Insert synthetic detail column in position 4
        order.push('dtl_mcoil');
        seen.add('dtl_mcoil');
        for (const n of names) { if (!seen.has(n)) order.push(n); }
        const byName = new Map((columns || []).map(c => [c.column_name, c]));
        return order
            .map(n => (n === 'dtl_mcoil' ? { column_name: 'dtl_mcoil', data_type: 'text', is_nullable: 'YES' } : byName.get(n)))
            .filter(Boolean);
    }, [columns]);

    const fetchTableData = useCallback(async (tableName) => {
        setLoading(true);
        setError("");

        try {
            // Always fetch columns first
            const columnsResponse = await fetch(`https://localhost:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/Columns`);
            const columnsData = await columnsResponse.json();
            if (!columnsResponse.ok) {
                setError(columnsData.error || 'Failed to fetch table columns');
                setColumns([]);
                setRecords([]);
                setMeta({ total: 0 });
                return;
            }
            setColumns(columnsData.columns || []);

            // If no primary filters, do not load records yet
            if (!hasAnyPrimary) {
                setRecords([]);
                setMeta({ total: 0 });
                return;
            }

            // Use the first filled primary filter as a server-side search to reduce payload
            const firstActive = [
                { col: 'hdr_key', val: columnFilters['hdr_key'] },
                { col: 'hdr_isnd_id', val: columnFilters['hdr_isnd_id'] },
                { col: 'hdr_bol_no', val: columnFilters['hdr_bol_no'] }
            ].find(f => (f.val ?? '').trim() !== '');

            let recordsUrl = `https://localhost:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/Records?limit=all`;
            if (firstActive) {
                recordsUrl += `&searchColumn=${encodeURIComponent(firstActive.col)}&searchTerm=${encodeURIComponent(firstActive.val.trim())}`;
            }

            const recordsResponse = await fetch(recordsUrl);
            const recordsData = await recordsResponse.json();
            if (!recordsResponse.ok) {
                setError(recordsData.error || 'Failed to fetch table records');
                setRecords([]);
                setMeta({ total: 0 });
                return;
            }
            let headerRows = recordsData.records || [];

            // Augment with dtl_mcoil values from the detail table where dtl_key = hdr_key
            try {
                const headerName = tableName || '';
                const detailTable = headerName.replace(/_SNF_Header$/i, '_SNF_Detail');
                // Verify detail table exists in the catalog we fetched earlier
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (hasDetail) {
                    // Optionally narrow detail fetch if hdr_key is the active filter
                    const activeHdrKey = (firstActive && firstActive.col === 'hdr_key') ? (firstActive.val || '').trim() : '';
                    const detailFilter = activeHdrKey ? `&searchColumn=${encodeURIComponent('dtl_key')}&searchTerm=${encodeURIComponent(activeHdrKey)}` : '';
                    const detailUrl = `https://localhost:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all${detailFilter}`;
                    const dResp = await fetch(detailUrl);
                    const dData = await dResp.json();
                    if (dResp.ok) {
                        const detailRows = dData.records || [];
                        const map = new Map(); // dtl_key -> array of dtl_mcoil
                        for (const r of detailRows) {
                            const k = r['dtl_key'];
                            const v = r['dtl_mcoil'];
                            if (k == null) continue;
                            if (!map.has(k)) map.set(k, []);
                            if (v !== undefined && v !== null && String(v).trim() !== '') map.get(k).push(v);
                        }
                        headerRows = headerRows.map(hr => {
                            const k = hr['hdr_key'];
                            const arr = (k != null && map.has(k)) ? map.get(k) : [];
                            // Store as an array per request
                            return { ...hr, dtl_mcoil: arr };
                        });
                    } else {
                        headerRows = headerRows.map(hr => ({ ...hr, dtl_mcoil: [] }));
                    }
                } else {
                    headerRows = headerRows.map(hr => ({ ...hr, dtl_mcoil: [] }));
                }
            } catch (e) {
                headerRows = headerRows.map(hr => ({ ...hr, dtl_mcoil: [] }));
            }

            setRecords(headerRows);
            setMeta({ total: recordsData.total || headerRows.length });
        } catch (err) {
            console.error('Error fetching table data:', err);
            setError('Failed to fetch table data');
        } finally {
            setLoading(false);
        }
    }, [hasAnyPrimary, columnFilters, tables]);

    // Debounce loading: only fetch records when any primary filter has value
    useEffect(() => {
        if (!selectedTable) return;
        const timer = setTimeout(() => {
            fetchTableData(selectedTable);
        }, 300);
        return () => clearTimeout(timer);
    }, [selectedTable, columnFilters['hdr_key'], columnFilters['hdr_isnd_id'], columnFilters['hdr_bol_no'], coilSearch, fetchTableData]);

    // Fetch dtl_keys that match the entered mill coil (dtl_mcoil) from the detail table
    useEffect(() => {
        const run = async () => {
            try {
                if (!selectedTable || coilSearch.trim() === '') { setCoilMatches([]); return; }
                const detailTable = (selectedTable || '').replace(/_SNF_Header$/i, '_SNF_Detail');
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (!hasDetail) { setCoilMatches([]); return; }
                const url = `https://localhost:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=${encodeURIComponent('dtl_mcoil')}&searchTerm=${encodeURIComponent(coilSearch.trim())}`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (!resp.ok) { setCoilMatches([]); return; }
                const keys = new Set();
                for (const r of (data.records || [])) {
                    if (r && r['dtl_key'] != null) keys.add(r['dtl_key']);
                }
                setCoilMatches(Array.from(keys));
            } catch (e) {
                setCoilMatches([]);
            }
        };
        run();
    }, [selectedTable, coilSearch, tables]);


    const clearAllColumnFilters = () => {
        setColumnFilters({});
        setSearchColumn("");
        setSearchTerm("");
        // Also clear selected table and table search so dropdown resets to ''
    setSelectedTable("");
    setSelectedNumber("");
        setTableSearch("");
    };



    const formatValue = (value) => {
        if (value === null) return <span style={{ color: '#999', fontStyle: 'italic' }}>NULL</span>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    // MARK: RENDERED CONTENT
    return (
        <div style={{ width: '100%', minHeight: '80vh', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2>Resend Transaction</h2>

                {/* Controls similar to TranslationHome: toggle filter row and clear filters */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '12px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                    <button
                        type="button"
                        onClick={clearAllColumnFilters}
                        title="Clear Filters"
                        aria-label="Clear Filters"
                        style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', height: 30, lineHeight: '20px' }}
                    >
                        <FcClearFilters size={18} />
                    </button>
                    <Select
                        placeholder="Select Transaction..."
                        isClearable
                        onChange={(opt) => {
                            if (opt && opt.value) {
                                setSelectedNumber(opt.value);
                            } else {
                                setSelectedNumber('');
                            }
                        }}
                        value={selectedNumber ? { value: selectedNumber, label: selectedNumber } : null}
                        options={numberOptions}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            menu: (base) => ({ ...base, zIndex: 9999 }),
                            container: (base) => ({ ...base, width: 190, minWidth: 160 }),
                            control: (base) => ({ ...base, minHeight: 30, height: 30, fontSize: 12, paddingLeft: 0 }),
                            valueContainer: (base) => ({ ...base, padding: '0 6px' }),
                            indicatorsContainer: (base) => ({ ...base, height: 30 }),
                            input: (base) => ({ ...base, margin: 0, padding: 0 }),
                            placeholder: (base) => ({ ...base, fontSize: 12 }),
                            singleValue: (base) => ({ ...base, fontSize: 12 })
                        }}
                    />
                    <input
                        type="text"
                        value={columnFilters['hdr_key'] || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setColumnFilters(prev => ({ ...prev, ['hdr_key']: val }));
                        }}
                        placeholder={`Search Key`}
                        style={{
                            width: 160,
                            boxSizing: 'border-box',
                            padding: '4px 6px',
                            height: 30,
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            outline: 'none',
                            fontSize: 12
                        }}
                    />
                    <input
                        type="text"
                        value={columnFilters['hdr_isnd_id'] || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setColumnFilters(prev => ({ ...prev, ['hdr_isnd_id']: val }));
                        }}
                        placeholder={`Search ISA Interchange ID`}
                        style={{
                            width: 180,
                            boxSizing: 'border-box',
                            padding: '4px 6px',
                            height: 30,
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            outline: 'none',
                            fontSize: 12
                        }}
                    />
                    <input
                        type="text"
                        value={columnFilters['hdr_bol_no'] || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setColumnFilters(prev => ({ ...prev, ['hdr_bol_no']: val }));
                        }}
                        placeholder={`Search BOL Number`}
                        style={{
                            width: 160,
                            boxSizing: 'border-box',
                            padding: '4px 6px',
                            height: 30,
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            outline: 'none',
                            fontSize: 12
                        }}
                    />
                    <input
                        type="text"
                        value={coilSearch}
                        onChange={(e) => setCoilSearch(e.target.value)}
                        placeholder={`Search Mill Coil Number`}
                        style={{
                            width: 160,
                            boxSizing: 'border-box',
                            padding: '4px 6px',
                            height: 30,
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            outline: 'none',
                            fontSize: 12
                        }}
                    />
                    {coilSearch.trim() !== '' && (
                        <span style={{ fontSize: 12, color: '#555' }} title={coilMatches.join(', ')}>
                            Matches: {coilMatches.length}
                        </span>
                    )}
                    {/* <input
                        type="text"
                        value={columnFilters['hdr_key'] || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setColumnFilters(prev => ({ ...prev, ['hdr_key']: val }));
                        }}
                        placeholder={`Filter Mill Coil`}
                        style={{
                            width: 160,
                            boxSizing: 'border-box',
                            padding: '4px 6px',
                            height: 30,
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            outline: 'none',
                            fontSize: 12
                        }}
                    /> */}







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
                                {/* Column headers */}
                                <tr style={{ background: '#f8f9fa' }}>
                                    {displayColumns.map((column, index) => (
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
                                {/* Filter row */}
                                
                            </thead>
                            <tbody>
                                {displayedRecords.map((record, rowIndex) => (
                                    <tr 
                                        key={rowIndex}
                                        style={{ 
                                            background: rowIndex % 2 === 0 ? '#fff' : '#f8f9fa'
                                        }}
                                    >
                                        {displayColumns.map((column, colIndex) => (
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

            {/* Prompt to enter a primary filter before loading */}
        {selectedTable && !loading && records.length === 0 && !error && !hasAnyPrimary && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '20px',
                    background: '#e3f2fd',
                    border: '1px solid #90caf9',
                    borderRadius: '4px',
                    color: '#1565c0',
                    marginTop: '12px'
                }}>
            Enter a value in at least one of the top filters (hdr_key, hdr_isnd_id, hdr_bol_no, or mcoil) to load records.
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
                    Please select a transaction to view its records.
                </div>
            )}
        </div>
    );
};

export default TableView;
