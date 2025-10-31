import React, { useEffect, useState, useCallback } from "react";
import Select from 'react-select';
import { FiFilter } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';
import  { extractTxnNumber, formatValue }   from "../../functions/helpers";

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
    const [columnFilters, setColumnFilters] = useState({});
    // Mill coil search (from detail table)
    const [coilSearch, setCoilSearch] = useState("");
    const [coilMatches, setCoilMatches] = useState([]);
    // Heat search (from detail table)
    const [heatSearch, setHeatSearch] = useState("");
    const [heatMatches, setHeatMatches] = useState([]);
    const [sendingKey, setSendingKey] = useState(null);
    const [rowStatus, setRowStatus] = useState({}); 
    

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
                    if (typeof data.coilSearch === 'string') setCoilSearch(data.coilSearch);
                    if (typeof data.heatSearch === 'string') setHeatSearch(data.heatSearch);
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
                columnFilters,
                coilSearch,
                heatSearch
            }));
        } catch {}
    }, [selectedTable, selectedNumber, tableSearch, searchColumn, searchTerm, columnFilters, coilSearch, heatSearch]);

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
            const response = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables`);
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

    const inferFieldTransaction = useCallback(() => {
        const num = selectedNumber || extractTxnNumber(selectedTable) || '';
        return num; 
    }, [selectedNumber, selectedTable, extractTxnNumber]);

    const handleResend = useCallback(async (record) => {
        try {
            setError("");
            const key = record?.['hdr_key'];
            const fieldtransaction = inferFieldTransaction();
            if (!key || !fieldtransaction) {
                setError('Missing hdr_key or transaction number');
                return;
            }
            setSendingKey(String(key));
            setRowStatus(prev => ({ ...prev, [key]: undefined }));
            const resp = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/ResendTransaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, fieldtransaction })
            });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                setRowStatus(prev => ({ ...prev, [key]: 'err' }));
                setError(data?.error || 'Failed to resend transaction');
                return;
            }
            setRowStatus(prev => ({ ...prev, [key]: 'ok' }));
        } catch (e) {
            setRowStatus(prev => ({ ...prev, [record?.['hdr_key']]: 'err' }));
            setError('Error calling resend endpoint');
        } finally {
            setSendingKey(null);
        }
    }, [inferFieldTransaction]);

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

        // If a heat search is active, restrict headers to those whose hdr_key is in the
        // set of dtl_keys that matched the heat (dtl_key = hdr_key relationship).
        if ((heatSearch || '').trim() !== '') {
            const matchSet = new Set((heatMatches || []).map(v => String(v)));
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
    }, [records, columnFilters, coilSearch, coilMatches, heatSearch, heatMatches]);

    // Helper: check if any of the three primary filters have a value
    const hasAnyPrimary = React.useMemo(() => {
        const keys = ['hdr_key', 'hdr_isnd_id', 'hdr_bol_no', 'hdr_ictl_no'];
        const anyTopThree = keys.some(k => ((columnFilters[k] ?? '').trim() !== ''));
        const hasCoil = (coilSearch || '').trim() !== '';
        const hasHeat = (heatSearch || '').trim() !== '';
        return anyTopThree || hasCoil || hasHeat;
    }, [columnFilters, coilSearch, heatSearch]);

    // Derive display column order: first 3 primary, then synthetic dtl_mcoil as the 4th col, dtl_heat as 5th, then others
    const displayColumns = React.useMemo(() => {
        const preferred = ['hdr_key', 'hdr_isnd_id', 'hdr_bol_no'];
        const names = (columns || []).map(c => c.column_name);
        const order = [];
        const seen = new Set();
        for (const p of preferred) {
            if (names.includes(p)) { order.push(p); seen.add(p); }
        }
        // Insert synthetic detail columns in positions 4 and 5
        order.push('dtl_mcoil');
        seen.add('dtl_mcoil');
        order.push('dtl_heat');
        seen.add('dtl_heat');
        for (const n of names) { if (!seen.has(n)) order.push(n); }
        const byName = new Map((columns || []).map(c => [c.column_name, c]));
        return order
            .map(n => {
                if (n === 'dtl_mcoil') return { column_name: 'dtl_mcoil', data_type: 'text', is_nullable: 'YES' };
                if (n === 'dtl_heat') return { column_name: 'dtl_heat', data_type: 'text', is_nullable: 'YES' };
                return byName.get(n);
            })
            .filter(Boolean);
    }, [columns]);


    //Fetch table data
   const fetchTableData = useCallback(async (tableName) => {
        setLoading(true);
        setError("");

        try {
            // Always fetch columns first - this should now include comments
            const columnsResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/ColumnsInfo`);
            const columnsData = await columnsResponse.json();
            if (!columnsResponse.ok) {
                setError(columnsData.error || 'Failed to fetch table columns');
                setColumns([]);
                setRecords([]);
                setMeta({ total: 0 });
                return;
            }
            
            // Log the columns data to verify comments are being received
           
            setColumns(columnsData.columns || []);

            // ADD THIS MISSING CODE TO FETCH RECORDS:
            if (!hasAnyPrimary) {
                setRecords([]);
                setMeta({ total: 0 });
                return;
            }

            // Build search parameters for records
            const params = new URLSearchParams();
            params.append('limit', 'all');

            // Add column filters
            const activeFilters = Object.entries(columnFilters || {}).filter(([_, v]) => (v ?? '').trim() !== '');
            if (activeFilters.length > 0) {
                // For now, just use the first active filter as the primary search
                const [searchCol, searchVal] = activeFilters[0];
                params.append('searchColumn', searchCol);
                params.append('searchTerm', searchVal.trim());
            }

            // Fetch records
            const recordsResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/Records?${params}`);
            const recordsData = await recordsResponse.json();
            
            if (!recordsResponse.ok) {
                setError(recordsData.error || 'Failed to fetch table records');
                setRecords([]);
                setMeta({ total: 0 });
                return;
            }

            setRecords(recordsData.records || []);
            setMeta({ total: recordsData.meta?.total || recordsData.records?.length || 0 });

            // --- Add this block to inject dtl_mcoil and dtl_heat arrays ---
            // Only if header records exist and table ends with _SNF_Header
            if ((recordsData.records?.length ?? 0) > 0 && /_SNF_Header$/i.test(tableName)) {
                const detailTable = tableName.replace(/_SNF_Header$/i, '_SNF_Detail');
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (hasDetail) {
                    // Fetch all detail records for this transaction
                    const detailResp = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all`);
                    const detailData = await detailResp.json();
                    if (detailResp.ok && Array.isArray(detailData.records)) {
                        // Build a map: hdr_key -> { coils: [], heats: [] }
                        const detailMap = {};
                        for (const d of detailData.records) {
                            const key = d['dtl_key'];
                            if (!key) continue;
                            if (!detailMap[key]) detailMap[key] = { coils: [], heats: [] };
                            if (d['dtl_mcoil']) detailMap[key].coils.push(d['dtl_mcoil']);
                            if (d['dtl_heat']) detailMap[key].heats.push(d['dtl_heat']);
                        }
                        // Inject arrays into header records
                        setRecords(prev =>
                            prev.map(r => ({
                                ...r,
                                dtl_mcoil: detailMap[r['hdr_key']]?.coils ?? [],
                                dtl_heat: detailMap[r['hdr_key']]?.heats ?? []
                            }))
                        );
                    }
                }
            }
            // --- End injection block ---

        } catch (err) {
            console.error('Error fetching table data:', err);
            setError('Failed to fetch table data');
            setRecords([]);
            setColumns([]);
            setMeta({ total: 0 });
        } finally {
            setLoading(false);
        }
    }, [hasAnyPrimary, columnFilters]);

    // Debounce loading: only fetch records when any primary filter has value
    useEffect(() => {
        if (!selectedTable) return;
        const timer = setTimeout(() => {
            fetchTableData(selectedTable);
        }, 300);
        return () => clearTimeout(timer);
    }, [selectedTable, columnFilters['hdr_key'], columnFilters['hdr_isnd_id'], columnFilters['hdr_bol_no'], coilSearch, heatSearch, fetchTableData]);

    // Fetch dtl_keys that match the entered mill coil (dtl_mcoil) from the detail table
    useEffect(() => {
        const run = async () => {
            try {
                if (!selectedTable || coilSearch.trim() === '') { setCoilMatches([]); return; }
                const detailTable = (selectedTable || '').replace(/_SNF_Header$/i, '_SNF_Detail');
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (!hasDetail) { setCoilMatches([]); return; }
                const url = `https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=${encodeURIComponent('dtl_mcoil')}&searchTerm=${encodeURIComponent(coilSearch.trim())}`;
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

    // Fetch dtl_keys that match the entered heat (dtl_heat) from the detail table
    useEffect(() => {
        const run = async () => {
            try {
                if (!selectedTable || heatSearch.trim() === '') { setHeatMatches([]); return; }
                const detailTable = (selectedTable || '').replace(/_SNF_Header$/i, '_SNF_Detail');
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (!hasDetail) { setHeatMatches([]); return; }
                const url = `https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=${encodeURIComponent('dtl_heat')}&searchTerm=${encodeURIComponent(heatSearch.trim())}`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (!resp.ok) { setHeatMatches([]); return; }
                const keys = new Set();
                for (const r of (data.records || [])) {
                    if (r && r['dtl_key'] != null) keys.add(r['dtl_key']);
                }
                setHeatMatches(Array.from(keys));
            } catch (e) {
                setHeatMatches([]);
            }
        };
        run();
    }, [selectedTable, heatSearch, tables]);

    const clearAllColumnFilters = () => {
        setColumnFilters({});
        setSearchColumn("");
        setSearchTerm("");
        // Also clear selected table and table search so dropdown resets to ''
    setSelectedTable("");
    setSelectedNumber("");
        setTableSearch("");
        setCoilSearch("");
        setHeatSearch("");
    };

    const getColumnDisplayName = useCallback((columnName) => {
        if (columnName === 'dtl_mcoil') return 'Mill Coil Numbers';
        if (columnName === 'dtl_heat') return 'Heat Numbers';
        
        const column = columns.find(c => c.column_name === columnName);
        // Use column_comment if available, otherwise fall back to column_name
        if (column?.column_comment && column.column_comment.trim() !== '') {
            return column.column_comment;
        }
        return columnName;
    }, [columns]);

    


   
    // MARK: RENDERED CONTENT
    return (
        <div style={{ width: '100%', minHeight: '80vh', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2>Resend Transaction Inbound</h2>

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
                        value={columnFilters['hdr_ictl_no'] || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setColumnFilters(prev => ({ ...prev, ['hdr_ictl_no']: val }));
                        }}
                        placeholder={`Search ISA Control Number`}
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
                    <input
                        type="text"
                        value={heatSearch}
                        onChange={(e) => setHeatSearch(e.target.value)}
                        placeholder={`Search Heat Number`}
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
                    {heatSearch.trim() !== '' && (
                        <span style={{ fontSize: 12, color: '#555' }} title={heatMatches.join(', ')}>
                            Matches: {heatMatches.length}
                        </span>
                    )}

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
                                    <th
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
                                    >
                                        Resend
                                    </th>
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
                                            title={`Column: ${column.column_name}, Type: ${column.data_type}, Nullable: ${column.is_nullable}`}
                                        >
                                            {getColumnDisplayName(column.column_name)}
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
                                        <td
                                            style={{
                                                padding: '8px',
                                                border: '1px solid #dee2e6',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleResend(record)}
                                                disabled={sendingKey === String(record['hdr_key'])}
                        style={(() => {
                                                    const isSending = sendingKey === String(record['hdr_key']);
                                                    const status = rowStatus[record['hdr_key']];
                                                    // Base style
                                                    const base = {
                                                        padding: '4px 8px',
                                                        fontSize: 12,
                                                        borderRadius: 4,
                                                        cursor: isSending ? 'not-allowed' : 'pointer',
                                                    };
                                                    if (isSending) {
                            return { ...base, background: '#fbff00ff', border: '1px solid #000000ff', color: '#000000ff' }; // yellow
                                                    }
                                                    if (status === 'ok') {
                                                        return { ...base, background: '#33ff00ff', border: '1px solid #000000ff', color: '#000000ff' }; // green
                                                    }
                                                    if (status === 'err') {
                                                        return { ...base, background: '#ff0015ff', border: '1px solid #000000ff', color: '#000000ff' }; // red (optional)
                                                    }
                                                    return { ...base, background: '#f5f5f5', border: '1px solid #888', color: '#000' };
                        })()}
                                                title={rowStatus[record['hdr_key']] === 'ok' ? 'Last send succeeded' : rowStatus[record['hdr_key']] === 'err' ? 'Last send failed' : 'Resend this transaction'}
                                            >
                                                {sendingKey === String(record['hdr_key']) ? 'Sending…' : (rowStatus[record['hdr_key']] === 'ok' ? 'Sent' : 'Resend')}
                                            </button>
                                        </td>
                                        {displayColumns.map((column, colIndex) => {
                                            // Determine column width and styling based on column type
                                            let maxWidth = '200px';
                                            let whiteSpace = 'nowrap';
                                            let overflow = 'hidden';
                                            let textOverflow = 'ellipsis';
                                            
                                            if (column.column_name === 'dtl_mcoil' || column.column_name === 'dtl_heat') {
                                                maxWidth = '200px'; // Increase width for coil/heat columns
                                                whiteSpace = 'normal'; // Allow wrapping for these columns
                                                overflow = 'visible';
                                                textOverflow = 'clip';
                                            } else if (column.column_name === 'hdr_key') {
                                                maxWidth = '100px';
                                            } else if (column.column_name === 'hdr_isnd_id') {
                                                maxWidth = '120px';
                                            } else if (column.column_name === 'hdr_bol_no') {
                                                maxWidth = '130px';
                                            }

                                            return (
                                                <td 
                                                    key={colIndex}
                                                    style={{ 
                                                        padding: '8px', 
                                                        border: '1px solid #dee2e6',
                                                        maxWidth: maxWidth,
                                                        overflow: overflow,
                                                        textOverflow: textOverflow,
                                                        whiteSpace: whiteSpace,
                                                        verticalAlign: 'top' // Align content to top when wrapping
                                                    }}
                                                    title={Array.isArray(record[column.column_name]) 
                                                        ? record[column.column_name].join(', ') 
                                                        : String(record[column.column_name] || '')
                                                    }
                                                >
                                                    {formatValue(record[column.column_name])}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Data Message */}
            {selectedTable && !loading && records.length === 0 && !error && hasAnyPrimary && (
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
            Enter a value in at least one of the top filters (key, ISA ID, BOL Number, Mill Coil, or Heat Number) to load records.
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
