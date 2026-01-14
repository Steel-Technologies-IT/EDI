import React, { useEffect, useState, useCallback } from "react";
import Select from 'react-select';
import { FiFilter } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';
import  { extractTxnNumber, formatValue }   from "../../functions/helpers";

const ResendTransactionOutbound = () => {
    //MARK: Variables
    const [routingPartnerData, setRoutingPartnerData] = useState({ records: [] });
    const [tradingPartnerInfo, setTradingPartnerInfo] = useState({});
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [selectedNumber, setSelectedNumber] = useState("");
    const [columns, setColumns] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
   const [successMessage, setSuccessMessage] = useState("");
const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [tagLotIdSearch, setTagLotIdSearch] = useState("");
    const [tagLotIdMatches, setTagLotIdMatches] = useState([]);
    const [tradingPartnerSearch, setTradingPartnerSearch] = useState("");
    const [tradingPartnerSearchMatches, setTradingPartnerSearchMatches] = useState([]);
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
    const [BOLSearch, setBOLSearch] = useState("");
    const [BOLMatches, setBOLMatches] = useState([]);
    const [branchSearch, setBranchSearch] = useState("");
    const [customerIdSearch, setCustomerIdSearch] = useState("");
    // New state variables for trading partner selection
    const [showTradingPartnerModal, setShowTradingPartnerModal] = useState(false);
    const [selectedRecordTradingPartners, setSelectedRecordTradingPartners] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    // New: branch and customer ID matches
    const [branchMatches, setBranchMatches] = useState([]);
    const [customerIdMatches, setCustomerIdMatches] = useState([]);
    // Add new state variable for trading partner matches after the existing state declarations around line 34:
    const [tradingPartnerMatches, setTradingPartnerMatches] = useState([]);

    // Fetch all available tables on component mount
    useEffect(() => {
        fetchTables();
    }, []);


    const getTradingPartnerName = (id) => {
        console.log(tradingPartnerInfo)
        const tp = tradingPartnerInfo.records.find(tp => tp.edia_edi_account_id === id);
        return tp ? tp.edia_cust_name : id;
    }


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
                if (typeof data.BOLSearch === 'string') setBOLSearch(data.BOLSearch);
                if (typeof data.branchSearch === 'string') setBranchSearch(data.branchSearch);
                if (typeof data.customerIdSearch === 'string') setCustomerIdSearch(data.customerIdSearch);
                if (typeof data.tagLotIdSearch === 'string') setTagLotIdSearch(data.tagLotIdSearch);
                if (typeof data.tradingPartnerSearch === 'string') setTradingPartnerSearch(data.tradingPartnerSearch);
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
            heatSearch,
            BOLSearch,
            branchSearch,
            customerIdSearch,
            tagLotIdSearch,
            tradingPartnerSearch
        }));
    } catch {}
}, [selectedTable, selectedNumber, tableSearch, searchColumn, searchTerm, columnFilters, coilSearch, heatSearch, BOLSearch, branchSearch, customerIdSearch, tagLotIdSearch, tradingPartnerSearch]);
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

    // Build a map of <slice(1,4)> -> corresponding header table (ends with _Invex_InterchangeControl)
    const headerTableByNumber = React.useMemo(() => {
        const map = new Map();
        for (const t of tables) {
            if (typeof t !== 'string') continue;
            const num = extractTxnNumber(t);
            if (!num) continue;
            const tLower = t.toLowerCase();
            if (tLower.endsWith('_invex_interchangecontrol')) {
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
            const response = await fetch(`${process.env.REACT_APP_HOST}EDI_Tables/Tables`);
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

    //MARK: RESEND LOGIC
    const handleResend = useCallback(async (record) => {
        try {
            setError("");
            const key = record?.['ictl_edixcontrolnumber'];
            const fieldtransaction = inferFieldTransaction();
            if (!key || !fieldtransaction) {
                setError('Missing ictl_edixcontrolnumber or transaction number');
                return;
            }

            // Get trading partners for this record
            const tradingPartners = record.rte_edi_acct_id || [];
            
            if (tradingPartners.length === 0) {
                setError('No trading partners found for this record');
                return;
            }

            console.log(tradingPartners)
                // If multiple trading partners, show selection modal
                setSelectedRecord(record);
                setSelectedRecordTradingPartners(tradingPartners);
                setShowTradingPartnerModal(true);
            

        } catch (e) {
            setError('Error initiating resend');
        }
    }, [inferFieldTransaction]);

    // Add this new function to handle the actual resend after trading partner selection:
   const performResend = useCallback(async (record, selectedTradingPartner) => {
    try {
        const key = record?.['ictl_key'];
        const fieldtransaction = inferFieldTransaction();
        
        setSendingKey(String(key));
        setRowStatus(prev => ({ ...prev, [key]: undefined }));
        
        // Close modal if it was open
        setShowTradingPartnerModal(false);
        setSelectedRecord(null);
        setSelectedRecordTradingPartners([]);
        
<<<<<<< Updated upstream
        const resp = await fetch(`https://10.202.0.10:5000/EDI_Tables/ResendTransactionOutbound`, {
=======
        const resp = await fetch(`${process.env.REACT_APP_HOST}EDI_Tables/ResendTransactionOutbound`, {
>>>>>>> Stashed changes
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                key, 
                fieldtransaction,
                tradingPartner: selectedTradingPartner
            })
        });
        
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            setRowStatus(prev => ({ ...prev, [key]: 'err' }));
            setError(data?.error || 'Failed to resend transaction');
            return;
        }
        
        // SUCCESS - Show success message
        setRowStatus(prev => ({ ...prev, [key]: 'ok' }));
        
        // Get trading partner name for better message
        const tradingPartnerName = getTradingPartnerName(selectedTradingPartner);
        const displayName = tradingPartnerName !== selectedTradingPartner ? 
            `${selectedTradingPartner} - ${tradingPartnerName}` : 
            selectedTradingPartner;
            
        setSuccessMessage(`Transaction ${key} successfully resent to trading partner: ${displayName}`);
        setShowSuccessMessage(true);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage("");
        }, 5000);
        
    } catch (e) {
        setRowStatus(prev => ({ ...prev, [record?.['ictl_key']]: 'err' }));
        setError('Error calling resend endpoint');
    } finally {
        setSendingKey(null);
    }
}, [inferFieldTransaction, getTradingPartnerName]);

const closeSuccessMessage = useCallback(() => {
    setShowSuccessMessage(false);
    setSuccessMessage("");
}, []);

    // Add this new function to handle modal close:
    const handleModalClose = useCallback(() => {
        setShowTradingPartnerModal(false);
        setSelectedRecord(null);
        setSelectedRecordTradingPartners([]);
    }, []);

    //MARK: FILTERING LOGIC
    // Apply client-side multi-column, multi-value filtering (comma-separated values per column)
    const displayedRecords = React.useMemo(() => {
    if (!records || records.length === 0) return [];

    // Start from all loaded records
    let filtered = records;

    // If a mill coil search is active, restrict headers to those whose ictl_key is in the
    // set of prd_keys that matched the coil (prd_key = ictl_key relationship).
    if ((coilSearch || '').trim() !== '') {
        const matchSet = new Set((coilMatches || []).map(v => String(v)));
        filtered = filtered.filter(r => matchSet.has(String(r['ictl_key'])));
    }

    // If a heat search is active, restrict headers to those whose ictl_key is in the
    // set of prd_keys that matched the heat (prd_key = ictl_key relationship).
    if ((heatSearch || '').trim() !== '') {
        const matchSet = new Set((heatMatches || []).map(v => String(v)));
        filtered = filtered.filter(r => matchSet.has(String(r['ictl_key'])));
    }

    // If a tag lot ID search is active, restrict headers to those whose ictl_key is in the
    // set of prd_keys that matched the tag lot ID.
    if ((tagLotIdSearch || '').trim() !== '') {
        const matchSet = new Set((tagLotIdMatches || []).map(v => String(v)));
        filtered = filtered.filter(r => matchSet.has(String(r['ictl_key'])));
    }

    // If a BOL search is active, restrict headers to those whose ictl_key is in the
    // set of prd_keys that matched the BOL (prd_key = ictl_key relationship).
    if ((BOLSearch || '').trim() !== '') {
        const matchSet = new Set((BOLMatches || []).map(v => String(v)));
        filtered = filtered.filter(r => matchSet.has(String(r['ictl_key'])));
    }

    // If a branch search is active, restrict headers to those whose ictl_key is in the
    // set of ictl_keys that matched the branch.
    if ((branchSearch || '').trim() !== '') {
        const matchSet = new Set((branchMatches || []).map(v => String(v)));
        filtered = filtered.filter(r => matchSet.has(String(r['ictl_key'])));
    }

    // If a customer ID search is active, restrict headers to those whose ictl_key is in the
    // set of shp_keys that matched the customer ID.
    if ((customerIdSearch || '').trim() !== '') {
        const matchSet = new Set((customerIdMatches || []).map(v => String(v)));
        filtered = filtered.filter(r => matchSet.has(String(r['ictl_key'])));
    }

    // If a trading partner search is active, filter based on trading partner matches
    if ((tradingPartnerSearch || '').trim() !== '') {
        const matchSet = new Set((tradingPartnerSearchMatches || []).map(v => String(v)));
        filtered = filtered.filter(r => matchSet.has(String(r['ictl_key'])));
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
}, [records, columnFilters, coilSearch, coilMatches, heatSearch, heatMatches, tagLotIdSearch, tagLotIdMatches, BOLSearch, BOLMatches, branchSearch, branchMatches, customerIdSearch, customerIdMatches, tradingPartnerSearch, tradingPartnerSearchMatches]);
    // Helper: check if any of the three primary filters have a value
    // Update the hasAnyPrimary useMemo around line 240:
const hasAnyPrimary = React.useMemo(() => {
    const keys = ['ictl_key', 'ictl_receiverinterchangeid', 'ish_transactionreference', 'ictl_edixcontrolnumber','prd_externaltagid', 'prd_heat'];
    const anyTopThree = keys.some(k => ((columnFilters[k] ?? '').trim() !== ''));
    const hasCoil = (coilSearch || '').trim() !== '';
    const hasHeat = (heatSearch || '').trim() !== '';
    const hasTagLotId = (tagLotIdSearch || '').trim() !== '';
    const hasBOL = (BOLSearch || '').trim() !== '';
    const hasBranch = (branchSearch || '').trim() !== '';
    const hasCustomerId = (customerIdSearch || '').trim() !== '';
    const hasTradingPartner = (tradingPartnerSearch || '').trim() !== '';
    return anyTopThree || hasCoil || hasHeat || hasTagLotId || hasBOL || hasBranch || hasCustomerId || hasTradingPartner;
}, [columnFilters, coilSearch, heatSearch, tagLotIdSearch, BOLSearch, branchSearch, customerIdSearch, tradingPartnerSearch]);

    // Derive display column order: first 3 primary, then synthetic prd_externaltagid as the 4th col, prd_heat as 5th, then others
    const displayColumns = React.useMemo(() => {
        const specificColumns = [
        'ictl_edixcontrolnumber',
        'ictl_receiverinterchangeid',
        'ish_transactionreference', 
        'prd_externaltagid',
        'prd_heat',
        'prd_taglotid',
        'ictl_invexbranchcode',
        'shp_partcustomerid',
        'rte_edi_acct_id'
    ];

    // Create column definitions for each specific column
    return specificColumns.map(columnName => {
        // For synthetic columns (injected data), create custom definitions
        if (columnName === 'prd_externaltagid') {
            return { column_name: 'prd_externaltagid', data_type: 'text', is_nullable: 'YES' };
        }
        if (columnName === 'prd_heat') {
            return { column_name: 'prd_heat', data_type: 'text', is_nullable: 'YES' };
        }
        if (columnName === 'prd_taglotid') {
            return { column_name: 'prd_taglotid', data_type: 'text', is_nullable: 'YES' };
        }
        if (columnName === 'ish_transactionreference') {
            return { column_name: 'ish_transactionreference', data_type: 'text', is_nullable: 'YES' };
        }
        if (columnName === 'ictl_invexbranchcode') {
            return { column_name: 'ictl_invexbranchcode', data_type: 'text', is_nullable: 'YES' };
        }
        if (columnName === 'shp_partcustomerid') {
            return { column_name: 'shp_partcustomerid', data_type: 'text', is_nullable: 'YES' };
        }
        if (columnName === 'rte_edi_acct_id') {
            return { column_name: 'rte_edi_acct_id', data_type: 'text', is_nullable: 'YES' };
        }

        // For actual database columns, find them in the columns array
        const actualColumn = (columns || []).find(c => c.column_name === columnName);
        return actualColumn || { column_name: columnName, data_type: 'text', is_nullable: 'YES' };
    }).filter(Boolean); // Remove any undefined columns
}, [columns]);


    //MARK: Fetch table data
const fetchTableData = useCallback(async (tableName) => {
    setLoading(true);
    setError("");

    try {
        // Create fetch promises - always fetch if we don't have data
        const fetchPromises = [];
        
        // Routing partner data fetch
        if (!routingPartnerData.records || routingPartnerData.records.length === 0) {
            fetchPromises.push(
                fetch(`${process.env.REACT_APP_HOST}EDI_Tables/Tables/Routing_SNFs/Records?limit=all`)
                    .then(r => r.json())
                    .then(data => ({ type: 'routing', data }))
            );
        }
        
        // Trading partner data fetch
        if (!tradingPartnerInfo.records || tradingPartnerInfo.records.length === 0) {
            fetchPromises.push(
                fetch(`${process.env.REACT_APP_HOST}EDI_Tables/Tables/EDI_Accounts/Records?limit=all`)
                    .then(r => r.json())
                    .then(data => ({ type: 'trading', data }))
            );
        }
        
        fetchPromises.push(
            fetch(`${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(tableName)}/ColumnsInfo`)
                .then(r => ({ response: r, data: r.json() }))
                .then(async ({ response, data }) => ({ 
                    type: 'columns', 
                    data: await data, 
                    ok: response.ok 
                }))
        );

        // Execute all fetches
        const results = await Promise.all(fetchPromises);
        
        // Process results
        results.forEach(result => {
            switch (result.type) {
                case 'routing':
                    console.log('Routing partner data fetched:', result.data);
                    setRoutingPartnerData(result.data);
                    break;
                case 'trading':
                    console.log('Trading partner data fetched:', result.data);
                    setTradingPartnerInfo(result.data);
                    break;
                case 'columns':
                    if (!result.ok) {
                        setError(result.data.error || 'Failed to fetch table columns');
                        setColumns([]);
                        setRecords([]);
                        setMeta({ total: 0 });
                        return;
                    }
                    setColumns(result.data.columns || []);
                    break;
            }
        });

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
            const [searchCol, searchVal] = activeFilters[0];
            params.append('searchColumn', searchCol);
            params.append('searchTerm', searchVal.trim());
        }

        // Fetch records
        const recordsResponse = await fetch(`${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(tableName)}/Records?${params}`);
        const recordsData = await recordsResponse.json();
        
        if (!recordsResponse.ok) {
            setError(recordsData.error || 'Failed to fetch table records');
            setRecords([]);
            setMeta({ total: 0 });
            return;
        }

        // Filter records to only show those with ictl_type = 'O'
        const filteredRecords = (recordsData.records || []).filter(
            record => record.ictl_type === 'O'
        );

        setRecords(filteredRecords);
        setMeta({ total: filteredRecords.length });

        // Rest of your injection logic continues unchanged...
        // OPTIMIZED INJECTION: Run all injections in parallel
        if (filteredRecords.length > 0 && /_Invex_InterchangeControl$/i.test(tableName)) {
    const baseTableName = tableName.replace(/_Invex_InterchangeControl$/i, '');
    const detailTable = `${baseTableName}_Invex_ProductItem`;
    const shipmentTable = baseTableName === '863' ? `${baseTableName}_Invex_ShipmentHeaderTestResult` : `${baseTableName}_Invex_ShipmentHeader`;

    const tableChecks = {
        hasDetail: tables.some(t => t?.toLowerCase() === detailTable.toLowerCase()),
        hasShipment: tables.some(t => t?.toLowerCase() === shipmentTable.toLowerCase())
    };

    // Create array of fetch promises for parallel execution
    const injectionPromises = [];
    
    if (tableChecks.hasDetail) {
        injectionPromises.push(
            fetch(`${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all`)
                .then(r => r.json())
                .then(data => ({ type: 'detail', data }))
        );
    }
    if (tableChecks.hasShipment) {
        injectionPromises.push(
            fetch(`${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(shipmentTable)}/Records?limit=all`)
                .then(r => r.json())
                .then(data => ({ type: 'shipment', data }))
        );
    }

    // Execute all fetches in parallel
    if (injectionPromises.length > 0) {
        try {
            const injectionResults = await Promise.all(injectionPromises);
            
            // Process results and build maps
            const maps = {
                detail: {},
                shipment: {}
            };

            injectionResults.forEach(result => {
                if (result.data?.records) {
                    switch (result.type) {
                        case 'detail':
                            result.data.records.forEach(d => {
                                const key = d.prd_key;
                                if (!key) return;
                                if (!maps.detail[key]) maps.detail[key] = { 
                                    coils: [], 
                                    heats: [], 
                                    taglotids: [], 
                                    customerIds: [] // Add customer IDs to detail map
                                };
                                
                                // Mill coil logic: customertagno first, then vendortagid, then null
                                const millCoil = d.prd_customertagno ? d.prd_customertagno : d.prd_vendortagid ? d.prd_vendortagid : null;
                                if (millCoil) maps.detail[key].coils.push(millCoil);
                                
                                if (d.prd_heat) maps.detail[key].heats.push(d.prd_heat);
                                if (d.prd_taglotid) maps.detail[key].taglotids.push(d.prd_taglotid);
                                
                                // Customer ID now comes from ProductItem table
                                if (d.prd_partcustomerid) maps.detail[key].customerIds.push(d.prd_partcustomerid);
                            });
                            break;
                        case 'shipment':
                            result.data.records.forEach(d => {
                                const key = d.ish_key || d.tres_key;
                                if (!key) return;
                                const bol = d.ish_transactionreference ? d.ish_transactionreference : d.tres_transactionreference ? d.tres_transactionreference : null;
                                if (!maps.shipment[key]) maps.shipment[key] = { bol: [] };
                                if (bol) maps.shipment[key].bol.push(bol);
                            });
                            break;
                    }
                }
            });

            // Apply all injections at once
            setRecords(prev =>
                prev.map(r => ({
                    ...r,
                    prd_externaltagid: maps.detail[r.ictl_key]?.coils ?? [],
                    prd_heat: maps.detail[r.ictl_key]?.heats ?? [],
                    prd_taglotid: maps.detail[r.ictl_key]?.taglotids ?? [],
                    ish_transactionreference: maps.shipment[r.ictl_key]?.bol ?? [],
                    shp_partcustomerid: maps.detail[r.ictl_key]?.customerIds ?? [] // Now comes from ProductItem
                }))
            );
        } catch (injectionError) {
            console.error('Error during parallel injection:', injectionError);
        }
    }}

    } catch (err) {
        console.error('Error fetching table data:', err);
        setError('Failed to fetch table data');
        setRecords([]);
        setColumns([]);
        setMeta({ total: 0 });
    } finally {
        setLoading(false);
    }
}, [hasAnyPrimary, columnFilters, tables, routingPartnerData.records, tradingPartnerInfo.records]);
//MARK: SEARCH USE EFFECTS

useEffect(() => {
    const searchTagLotId = async () => {
        if (!selectedTable || tagLotIdSearch.trim() === '') { 
            setTagLotIdMatches([]); 
            return; 
        }

        try {
            const detailTable = selectedTable.replace(/_Invex_InterchangeControl$/i, '_Invex_ProductItem');
            const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
            if (!hasDetail) { 
                setTagLotIdMatches([]); 
                return; 
            }

            const url = `${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=prd_taglotid&searchTerm=${encodeURIComponent(tagLotIdSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            
            if (resp.ok && data.records) {
                const keys = data.records.map(r => r.prd_key).filter(Boolean);
                setTagLotIdMatches(keys);
            } else {
                setTagLotIdMatches([]);
            }
        } catch (e) {
            console.error("Tag Lot ID search error:", e);
            setTagLotIdMatches([]);
        }
    };

    const timeoutId = setTimeout(searchTagLotId, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [selectedTable, tagLotIdSearch, tables]);

// Trading Partner search - searches within the records that have already been loaded
useEffect(() => {
    const searchTradingPartner = () => {
        if (!tradingPartnerSearch.trim()) {
            setTradingPartnerSearchMatches([]);
            return;
        }

        // Filter current records based on trading partner search term
        const searchTerm = tradingPartnerSearch.trim().toLowerCase();
        const matchingKeys = records
            .filter(record => {
                const tradingPartners = record.rte_edi_acct_id || [];
                if (Array.isArray(tradingPartners)) {
                    return tradingPartners.some(tpId => 
                        tpId && tpId.toLowerCase().includes(searchTerm)
                    );
                }
                return false;
            })
            .map(record => record.ictl_key)
            .filter(Boolean);

        setTradingPartnerSearchMatches(matchingKeys);
    };

    const timeoutId = setTimeout(searchTradingPartner, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [tradingPartnerSearch, records]);

// Optimized mill coil search
useEffect(() => {
    const searchCoils = async () => {
        if (!selectedTable || coilSearch.trim() === '') { 
            setCoilMatches([]); 
            return; 
        }

        try {
            const detailTable = selectedTable.replace(/_Invex_InterchangeControl$/i, '_Invex_ProductItem');
            const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
            if (!hasDetail) { 
                setCoilMatches([]); 
                return; 
            }

            // Search both prd_customertagno and prd_vendortagid
            const searchTerm = encodeURIComponent(coilSearch.trim());
            const customerTagUrl = `${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=prd_customertagno&searchTerm=${searchTerm}`;
            const vendorTagUrl = `${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=prd_vendortagid&searchTerm=${searchTerm}`;
            
            const [customerResp, vendorResp] = await Promise.all([
                fetch(customerTagUrl),
                fetch(vendorTagUrl)
            ]);
            
            const [customerData, vendorData] = await Promise.all([
                customerResp.json(),
                vendorResp.json()
            ]);
            
            const allKeys = new Set();
            
            if (customerResp.ok && customerData.records) {
                customerData.records.forEach(r => {
                    if (r.prd_key) allKeys.add(r.prd_key);
                });
            }
            
            if (vendorResp.ok && vendorData.records) {
                vendorData.records.forEach(r => {
                    if (r.prd_key) allKeys.add(r.prd_key);
                });
            }
            
            setCoilMatches(Array.from(allKeys));
        } catch (e) {
            console.error("Coil search error:", e);
            setCoilMatches([]);
        }
    };

    const timeoutId = setTimeout(searchCoils, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [selectedTable, coilSearch, tables]);

// Optimized heat search
useEffect(() => {
    const searchHeats = async () => {
        if (!selectedTable || heatSearch.trim() === '') { 
            setHeatMatches([]); 
            return; 
        }

        try {
            const detailTable = selectedTable.replace(/_Invex_InterchangeControl$/i, '_Invex_ProductItem');
            const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
            if (!hasDetail) { 
                setHeatMatches([]); 
                return; 
            }

            const url = `${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=prd_heat&searchTerm=${encodeURIComponent(heatSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            
            if (resp.ok && data.records) {
                const keys = data.records.map(r => r.prd_key).filter(Boolean);
                setHeatMatches(keys);
            } else {
                setHeatMatches([]);
            }
        } catch (e) {
            console.error("Heat search error:", e);
            setHeatMatches([]);
        }
    };

    const timeoutId = setTimeout(searchHeats, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [selectedTable, heatSearch, tables]);

// Optimized branch search
useEffect(() => {
    const searchBranch = async () => {
        if (!selectedTable || branchSearch.trim() === '') { 
            setBranchMatches([]); 
            return; 
        }

        try {
            const url = `${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(selectedTable)}/Records?limit=all&searchColumn=ictl_invexbranchcode&searchTerm=${encodeURIComponent(branchSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            
            if (resp.ok && data.records) {
                const keys = data.records.map(r => r.ictl_key).filter(Boolean);
                setBranchMatches(keys);
            } else {
                setBranchMatches([]);
            }
        } catch (e) {
            console.error("Branch search error:", e);
            setBranchMatches([]);
        }
    };

    const timeoutId = setTimeout(searchBranch, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [selectedTable, branchSearch]);

// Optimized customer ID search
useEffect(() => {
    const searchCustomerId = async () => {
        if (!selectedTable || customerIdSearch.trim() === '') { 
            setCustomerIdMatches([]); 
            return; 
        }

        try {
            // Change from ShipmentItem to ProductItem table
            const productItemTable = selectedTable.replace(/_Invex_InterchangeControl$/i, '_Invex_ProductItem');
            const hasProductItem = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === productItemTable.toLowerCase());
            if (!hasProductItem) { 
                setCustomerIdMatches([]); 
                return; 
            }

            // Search prd_partcustomerid instead of shp_partcustomerid
            const url = `${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(productItemTable)}/Records?limit=all&searchColumn=prd_partcustomerid&searchTerm=${encodeURIComponent(customerIdSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            
            if (resp.ok && data.records) {
                // Use prd_key instead of shp_key
                const keys = data.records.map(r => r.prd_key).filter(Boolean);
                setCustomerIdMatches(keys);
            } else {
                setCustomerIdMatches([]);
            }
        } catch (e) {
            console.error("Customer ID search error:", e);
            setCustomerIdMatches([]);
        }
    };

    const timeoutId = setTimeout(searchCustomerId, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [selectedTable, customerIdSearch, tables]);

    // Debounce loading: only fetch records when any primary filter has value
    useEffect(() => {
    if (!selectedTable) return;
    const timer = setTimeout(() => {
        fetchTableData(selectedTable);
    }, 300);
    return () => clearTimeout(timer);
}, [selectedTable, columnFilters['ictl_key'], columnFilters['ictl_receiverinterchangeid'], BOLSearch, coilSearch, heatSearch, tagLotIdSearch, branchSearch, customerIdSearch, tradingPartnerSearch, fetchTableData]);

useEffect(() => {
    const injectTradingPartners = () => {
        // Only proceed if we have records with customer IDs and routing partner data
        if (!records || records.length === 0 || !routingPartnerData.records) {
            return;
        }
        
        // Check if records already have trading partner data
        const hasTPData = records.some(r => r.rte_edi_acct_id !== undefined);
        if (hasTPData) {
            return;
        }
        
        // Check if records have customer IDs injected
        const hasCustomerIds = records.some(r => Array.isArray(r.shp_partcustomerid) && r.shp_partcustomerid.length > 0);
        if (!hasCustomerIds) {
            return;
        }

        // Build trading partner map from routing data
        const tradingPartnerMap = {};
        routingPartnerData.records.forEach(tpRecord => {
            const customerId = tpRecord.rte_cus_id;
            const tradingPartnerId = tpRecord.rte_edi_acct_id;
            
            if (customerId && tradingPartnerId) {
                if (!tradingPartnerMap[customerId]) {
                    tradingPartnerMap[customerId] = [];
                }
                if (!tradingPartnerMap[customerId].includes(tradingPartnerId)) {
                    tradingPartnerMap[customerId].push(tradingPartnerId);
                }
            }
        });

        // Apply trading partner injection synchronously
        setRecords(prev =>
            prev.map(r => {
                const customerIds = r.shp_partcustomerid || [];
                const tradingPartnerIds = [];

                if (Array.isArray(customerIds)) {
                    customerIds.forEach(customerId => {
                        if (customerId && tradingPartnerMap[customerId.trim()]) {
                            tradingPartnerMap[customerId.trim()].forEach(tpId => {
                                if (!tradingPartnerIds.includes(tpId)) {
                                    tradingPartnerIds.push(tpId);
                                }
                            });
                        }
                    });
                }
                
                return {
                    ...r,
                    rte_edi_acct_id: tradingPartnerIds
                };
            })
        );
    };
    
    // Run synchronously when dependencies change
    injectTradingPartners();
}, [records, routingPartnerData.records]);



// FIXED BOL search - the issue was using ish_key instead of matching properly
useEffect(() => {
    const searchBOL = async () => {
        if (!selectedTable || BOLSearch.trim() === '') { 
            setBOLMatches([]); 
            return; 
        }

        try {
            const shipmentTable = selectedTable.replace(/_Invex_InterchangeControl$/i, '_Invex_ShipmentHeader');
            const hasShipment = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === shipmentTable.toLowerCase());
            if (!hasShipment) { 
                setBOLMatches([]); 
                return; 
            }

            const url = `${process.env.REACT_APP_HOST}EDI_Tables/Tables/${encodeURIComponent(shipmentTable)}/Records?limit=all&searchColumn=ish_transactionreference&searchTerm=${encodeURIComponent(BOLSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            
            if (resp.ok && data.records) {
                // FIX: Use ish_key which should match ictl_key in the InterchangeControl table
                const keys = data.records.map(r => r.ish_key).filter(Boolean);
                setBOLMatches(keys);
                console.log("BOL matches found:", keys);
            } else {
                setBOLMatches([]);
            }
        } catch (e) {
            console.error("BOL search error:", e);
            setBOLMatches([]);
        }
    };

    const timeoutId = setTimeout(searchBOL, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [selectedTable, BOLSearch, tables]);



//MARK: Clear Column Filters
    const clearAllColumnFilters = () => {
    setColumnFilters({});
    setSearchColumn("");
    setSearchTerm("");
    setSelectedTable("");
    setSelectedNumber("");
    setTableSearch("");
    setCoilSearch("");
    setHeatSearch("");
    setTagLotIdSearch("");
    setBOLSearch("");
    setBranchSearch("");
    setCustomerIdSearch("");
    setTradingPartnerSearch("");
};

  const getColumnDisplayName = useCallback((columnName) => {
    if (columnName === 'prd_externaltagid') return 'Mill Coil Numbers';
    if (columnName === 'prd_heat') return 'Heat Numbers';
    if (columnName === 'prd_taglotid') return 'Tag Lot ID';
    if (columnName === 'ish_transactionreference') return 'BOL Number';
    if (columnName === 'ictl_invexbranchcode') return 'Branch Code';
    if (columnName === 'shp_partcustomerid') return 'Customer ID';
    if (columnName === 'rte_edi_acct_id') return 'Trading Partner IDs';
    if (columnName === 'ictl_edixcontrolnumber') return 'Interchange Control Number';
    if (columnName === 'ictl_receiverinterchangeid') return 'Receiver ID';
    // Find the column in the columns array

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
                <h2>Resend Transaction Outbound</h2>

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
                                value={columnFilters['ictl_key'] || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setColumnFilters(prev => ({ ...prev, ['ictl_key']: val }));
                                }}
                                placeholder={`Search Interchange Control Number`}
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
                                value={columnFilters['ictl_receiverinterchangeid'] || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setColumnFilters(prev => ({ ...prev, ['ictl_receiverinterchangeid']: val }));
                                }}
                                placeholder={`Search Receiver ID`}
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
                                value={BOLSearch}
                                onChange={(e) => {
                                    setBOLSearch(e.target.value);
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
                            <input
                                type="text"
                                value={tagLotIdSearch}
                                onChange={(e) => setTagLotIdSearch(e.target.value)}
                                placeholder={`Search Tag Lot ID`}
                                style={{
                                    width: 140,
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
                                value={branchSearch}
                                onChange={(e) => setBranchSearch(e.target.value)}
                                placeholder={`Search Branch`}
                                style={{
                                    width: 140,
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
                                value={customerIdSearch}
                                onChange={(e) => setCustomerIdSearch(e.target.value)}
                                placeholder={`Search Customer ID`}
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
                                value={tradingPartnerSearch}
                                onChange={(e) => setTradingPartnerSearch(e.target.value)}
                                placeholder={`Search Trading Partner ID`}
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
        overflow: 'hidden',
        height: 'calc(100vh - 250px)',
        display: 'flex',
        flexDirection: 'column'
    }}>
        {/* Single scrollable table container */}
        <div style={{
            flex: 1,
            overflow: 'auto', // Both horizontal and vertical scroll
            position: 'relative'
        }}>
            <table style={{ 
                width: 'max-content', // Allow table to expand beyond container
                minWidth: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
            }}>
                {/* Sticky Header */}
                <thead>
    <tr style={{ 
        background: '#f8f9fa',
        position: 'sticky',
        top: 0,
        zIndex: 10
    }}>
        <th
            style={{
                padding: '12px 8px',
                border: '1px solid #dee2e6',
                textAlign: 'left',
                fontWeight: 'bold',
                background: '#f8f9fa',
                whiteSpace: 'nowrap',
                width: '100px',
                minWidth: '100px',
                maxWidth: '100px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}
        >
            Resend
        </th>
        {displayColumns.map((column, index) => {
            // Set specific widths for different column types
            let columnWidth = '150px';
            if (column.column_name === 'ictl_key') columnWidth = '120px';
            else if ( column.column_name === 'ictl_edixcontrolnumber') columnWidth = '180px';
            else if (column.column_name === 'ictl_receiverinterchangeid' || column.column_name === 'prd_externaltagid') columnWidth = '200px';
            else if (column.column_name === 'prd_heat') columnWidth = '150px';
            else if (column.column_name === 'prd_taglotid') columnWidth = '150px';
            else if (column.column_name === 'ish_transactionreference') columnWidth = '160px';
            else if (column.column_name === 'shp_partcustomerid') columnWidth = '200px';
            else if (column.column_name === 'rte_edi_acct_id') columnWidth = '200px';
            else if (column.column_name === 'ictl_invexbranchcode') columnWidth = '120px';

            return (
                <th 
                    key={`header-${column.column_name}-${index}`}
                    style={{ 
                        padding: '12px 8px', 
                        border: '1px solid #dee2e6',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        background: '#f8f9fa',
                        whiteSpace: 'nowrap',
                        width: columnWidth,
                        minWidth: columnWidth,
                        maxWidth: columnWidth,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        position: 'relative'
                    }}
                    title={`${getColumnDisplayName(column.column_name)} - Column: ${column.column_name}, Type: ${column.data_type}, Nullable: ${column.is_nullable}`}
                >
                    <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%'
                    }}>
                        {getColumnDisplayName(column.column_name)}
                    </div>
                </th>
            );
        })}
    </tr>
</thead>

                {/* Table Body */}
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
                                    whiteSpace: 'nowrap',
                                    width: '100px',
                                    minWidth: '100px',
                                    maxWidth: '100px'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleResend(record)}
                                    disabled={sendingKey === String(record['ictl_key'])}
                                    style={(() => {
                                        const isSending = sendingKey === String(record['ictl_key']);
                                        const status = rowStatus[record['ictl_key']];
                                        const base = {
                                            padding: '4px 8px',
                                            fontSize: 12,
                                            borderRadius: 4,
                                            cursor: isSending ? 'not-allowed' : 'pointer',
                                            width: '80px'
                                        };
                                        if (isSending) {
                                            return { ...base, background: '#fbff00ff', border: '1px solid #000000ff', color: '#000000ff' };
                                        }
                                        if (status === 'ok') {
                                            return { ...base, background: '#33ff00ff', border: '1px solid #000000ff', color: '#000000ff' };
                                        }
                                        if (status === 'err') {
                                            return { ...base, background: '#ff0015ff', border: '1px solid #000000ff', color: '#000000ff' };
                                        }
                                        return { ...base, background: '#f5f5f5', border: '1px solid #888', color: '#000' };
                                    })()}
                                    title={rowStatus[record['ictl_key']] === 'ok' ? 'Last send succeeded' : rowStatus[record['ictl_key']] === 'err' ? 'Last send failed' : 'Resend this transaction'}
                                >
                                    {sendingKey === String(record['ictl_key']) ? 'Sending…' : (rowStatus[record['ictl_key']] === 'ok' ? 'Sent' : 'Resend')}
                                </button>
                            </td>
                            {displayColumns.map((column, colIndex) => {
                                // Match the same widths as headers
                                let columnWidth = '150px';
                                let whiteSpace = 'nowrap';
                                let overflow = 'hidden';
                                let textOverflow = 'ellipsis';

                                if (column.column_name === 'ictl_key') {
                                    columnWidth = '120px';
                                } else if (column.column_name === 'ictl_receiverinterchangeid') {
                                    columnWidth = '180px';
                                } else if (column.column_name === 'prd_externaltagid') {
                                    columnWidth = '200px';
                                    whiteSpace = 'normal';
                                    overflow = 'visible';
                                    textOverflow = 'clip';
                                } else if (column.column_name === 'prd_heat') {
                                    columnWidth = '150px';
                                    whiteSpace = 'normal';
                                    overflow = 'visible';
                                    textOverflow = 'clip';
                                } else if (column.column_name === 'prd_taglotid') {
                                    columnWidth = '150px';
                                    whiteSpace = 'normal';
                                    overflow = 'visible';
                                    textOverflow = 'clip';
                                } else if (column.column_name === 'ish_transactionreference') {
                                    columnWidth = '160px';
                                } else if (column.column_name === 'shp_partcustomerid') {
                                    columnWidth = '200px';
                                    whiteSpace = 'normal';
                                    overflow = 'visible';
                                    textOverflow = 'clip';
                                } else if (column.column_name === 'rte_edi_acct_id') {
                                    columnWidth = '200px';
                                    whiteSpace = 'normal';
                                    overflow = 'visible';
                                    textOverflow = 'clip';
                                } else if (column.column_name === 'ictl_invexbranchcode') {
                                    columnWidth = '120px';
                                }

                                return (
                                    <td 
                                        key={colIndex}
                                        style={{ 
                                            padding: '8px', 
                                            border: '1px solid #dee2e6',
                                            width: columnWidth,
                                            minWidth: columnWidth,
                                            maxWidth: columnWidth,
                                            overflow: overflow,
                                            textOverflow: textOverflow,
                                            whiteSpace: whiteSpace,
                                            verticalAlign: 'top'
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
            Enter a value in at least one of the top filters (key, Reciever ID, BOL Number, Mill Coil or Heat Number) to load records.
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

            {/* Trading Partner Selection Modal */}
            {showTradingPartnerModal && (
                <div style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: 'rgba(0, 0, 0, 0.7)', 
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ 
                        background: '#fff', 
                        borderRadius: '8px', 
                        padding: '20px', 
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)', 
                        maxWidth: '500px',
                        width: '100%',
                        position: 'relative'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Select Trading Partner</h3>

                        {/* Display available trading partners for this record */}
                        <div style={{ marginBottom: '20px' }}>
                            {selectedRecordTradingPartners.length === 0 && (
                                <div style={{ color: '#666', padding: '10px', borderRadius: '4px', background: '#f8f9fa', border: '1px solid #dee2e6' }}>
                                    No trading partners available for this record.
                                </div>
                            )}
                            {selectedRecordTradingPartners.map((tpId, index) => (
                                <div key={index} style={{ 
                                    padding: '10px', 
                                    borderRadius: '4px', 
                                    marginBottom: '10px',
                                    background: '#f1f3f5',
                                    border: '1px solid #ced4da',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ fontSize: '14px', color: '#333' }}>
                                        Trading Partner ID and Name: <strong>{tpId} - {getTradingPartnerName(tpId)}</strong>
                                    </div>
                                    

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            // Perform resend for this trading partner
                                            await performResend(selectedRecord, tpId);
                                        }}
                                        style={{
                                            background: '#007bff',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            transition: 'background 0.3s'
                                        }}
                                        title="Resend transaction with this trading partner"
                                    >
                                        Resend
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={handleModalClose}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '18px',
                                color: '#666',
                                transition: 'color 0.3s'
                            }}
                            title="Close this window"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
            {showSuccessMessage && (
    <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px', 
        zIndex: 10001,
        animation: 'slideInRight 0.3s ease-out'
    }}>
        <div style={{ 
            background: '#d4edda', 
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '8px', 
            padding: '16px 20px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
            maxWidth: '400px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        }}>
            {/* Success Icon */}
            <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#28a745',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                flexShrink: 0
            }}>
                ✓
            </div>
            
            {/* Message Content */}
            <div style={{ flex: 1 }}>
                <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '4px',
                    fontSize: '14px'
                }}>
                    Transaction Sent Successfully!
                </div>
                <div style={{ 
                    fontSize: '13px',
                    lineHeight: '1.4'
                }}>
                    {successMessage}
                </div>
            </div>

            {/* Close button */}
            <button
                type="button"
                onClick={closeSuccessMessage}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#155724',
                    opacity: 0.7,
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'opacity 0.2s, background 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.target.style.opacity = 1;
                    e.target.style.background = 'rgba(21, 87, 36, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.opacity = 0.7;
                    e.target.style.background = 'none';
                }}
                title="Close"
            >
                ×
            </button>
        </div>
    </div>
)}
        </div>
    );
};

export default ResendTransactionOutbound;
