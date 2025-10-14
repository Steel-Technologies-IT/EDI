import React, { useEffect, useState, useCallback } from "react";
import Select from 'react-select';
import { FiFilter } from 'react-icons/fi';
import { FcClearFilters } from 'react-icons/fc';
import  { extractTxnNumber, formatValue }   from "../../functions/helpers";

const ResendTransactionOutbound = () => {
    const [routingPartnerData, setRoutingPartnerData] = useState({ records: [] });
    const [tradingPartnerInfo, setTradingPartnerInfo] = useState({});
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
                customerIdSearch
            }));
        } catch {}
    }, [selectedTable, selectedNumber, tableSearch, searchColumn, searchTerm, columnFilters, coilSearch, heatSearch, BOLSearch, branchSearch, customerIdSearch]);

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
            const key = record?.['ictl_key'];
            const fieldtransaction = inferFieldTransaction();
            if (!key || !fieldtransaction) {
                setError('Missing ictl_key or transaction number');
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
            
            const resp = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/ResendTransactionOutbound`, {
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
            
            setRowStatus(prev => ({ ...prev, [key]: 'ok' }));
            
        } catch (e) {
            setRowStatus(prev => ({ ...prev, [record?.['ictl_key']]: 'err' }));
            setError('Error calling resend endpoint');
        } finally {
            setSendingKey(null);
        }
    }, [inferFieldTransaction]);

    // Add this new function to handle modal close:
    const handleModalClose = useCallback(() => {
        setShowTradingPartnerModal(false);
        setSelectedRecord(null);
        setSelectedRecordTradingPartners([]);
    }, []);

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
    }, [records, columnFilters, coilSearch, coilMatches, heatSearch, heatMatches, BOLSearch, BOLMatches, branchSearch, branchMatches, customerIdSearch, customerIdMatches]);

    // Helper: check if any of the three primary filters have a value
    const hasAnyPrimary = React.useMemo(() => {
        const keys = ['ictl_key', 'ictl_receiverinterchangeid', 'ish_transactionreference', 'ictl_edixcontrolnumber','prd_externaltagid', 'prd_heat'];
        const anyTopThree = keys.some(k => ((columnFilters[k] ?? '').trim() !== ''));
        const hasCoil = (coilSearch || '').trim() !== '';
        const hasHeat = (heatSearch || '').trim() !== '';
        const hasBOL = (BOLSearch || '').trim() !== '';
        const hasBranch = (branchSearch || '').trim() !== '';
        const hasCustomerId = (customerIdSearch || '').trim() !== '';
        return anyTopThree || hasCoil || hasHeat || hasBOL || hasBranch || hasCustomerId;
    }, [columnFilters, coilSearch, heatSearch, BOLSearch, branchSearch, customerIdSearch]);

    // Derive display column order: first 3 primary, then synthetic prd_externaltagid as the 4th col, prd_heat as 5th, then others
    const displayColumns = React.useMemo(() => {
        const preferred = ['ictl_key', 'ictl_receiverinterchangeid', 'ish_transactionreference', 'ictl_edixcontrolnumber','prd_externaltagid', 'prd_heat'];
        const names = (columns || []).map(c => c.column_name);
        const order = [];
        const seen = new Set();
        for (const p of preferred) {
            if (names.includes(p)) { order.push(p); seen.add(p); }
        }
        // Insert synthetic detail columns in positions 4 and 5
        order.push('prd_externaltagid');
        seen.add('prd_externaltagid');
        order.push('prd_heat');
        seen.add('prd_heat');
        order.push('ish_transactionreference');
        seen.add('ish_transactionreference');
        // Add branch and customer ID columns
        order.push('ictl_invexbranchcode');
        seen.add('ictl_invexbranchcode');
        order.push('shp_partcustomerid');
        seen.add('shp_partcustomerid');
        // Add trading partner IDs column
        order.push('rte_edi_acct_id');
        seen.add('rte_edi_acct_id');

        for (const n of names) { if (!seen.has(n)) order.push(n); }
        const byName = new Map((columns || []).map(c => [c.column_name, c]));
        return order
            .map(n => {
                if (n === 'prd_externaltagid') return { column_name: 'prd_externaltagid', data_type: 'text', is_nullable: 'YES' };
                if (n === 'prd_heat') return { column_name: 'prd_heat', data_type: 'text', is_nullable: 'YES' };
                if (n === 'ish_transactionreference') return { column_name: 'ish_transactionreference', data_type: 'text', is_nullable: 'YES' };
                if (n === 'ictl_invexbranchcode') return { column_name: 'ictl_invexbranchcode', data_type: 'text', is_nullable: 'YES' };
                if (n === 'shp_partcustomerid') return { column_name: 'shp_partcustomerid', data_type: 'text', is_nullable: 'YES' };
                if (n === 'rte_edi_acct_id') return { column_name: 'rte_edi_acct_id', data_type: 'text', is_nullable: 'YES' };
                return byName.get(n);
            })
            .filter(Boolean);
    }, [columns]);


    //Fetch table data
   const fetchTableData = useCallback(async (tableName) => {
        setLoading(true);
        setError("");

        try {
            const routingPartnerResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/Routing_SNFs/Records?limit=all`);
            setRoutingPartnerData(await routingPartnerResponse.json());
            const tradingPartnerResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/EDI_Accounts/Records?limit=all`);
            setTradingPartnerInfo(await tradingPartnerResponse.json());
            // Always fetch columns first
            const columnsResponse = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(tableName)}/ColumnsInfo`);
            const columnsData = await columnsResponse.json();
            if (!columnsResponse.ok) {
                setError(columnsData.error || 'Failed to fetch table columns');
                setColumns([]);
                setRecords([]);
                setMeta({ total: 0 });
                return;
            }
            
            setColumns(columnsData.columns || []);

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

            // Filter records to only show those with ictl_type = 'O'
            const filteredRecords = (recordsData.records || []).filter(
                record => record.ictl_type === 'O'
            );

            setRecords(filteredRecords);
            setMeta({ total: filteredRecords.length });

            // --- Add this block to inject prd_externaltagid and prd_heat arrays ---
            // Only if header records exist and table ends with _Invex_InterchangeControl
            if ((filteredRecords.length ?? 0) > 0 && /_Invex_InterchangeControl$/i.test(tableName)) {
                const detailTable = tableName.replace(/_Invex_InterchangeControl$/i, '_Invex_ProductItem');
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (hasDetail) {
                    // Fetch all detail records for this transaction
                    const detailResp = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all`);
                    const detailData = await detailResp.json();
                    if (detailResp.ok && Array.isArray(detailData.records)) {
                        // Build a map: ictl_key -> { coils: [], heats: [] }
                        const detailMap = {};
                        for (const d of detailData.records) {
                            const key = d['prd_key'];
                            if (!key) continue;
                            if (!detailMap[key]) detailMap[key] = { coils: [], heats: [] };
                            if (d['prd_externaltagid']) detailMap[key].coils.push(d['prd_externaltagid']);
                            if (d['prd_heat']) detailMap[key].heats.push(d['prd_heat']);
                        }
                        // Inject arrays into header records
                        setRecords(prev =>
                            prev.map(r => ({
                                ...r,
                                prd_externaltagid: detailMap[r['ictl_key']]?.coils ?? [],
                                prd_heat: detailMap[r['ictl_key']]?.heats ?? []
                            }))
                        );
                    }
                }
            }
            if ((filteredRecords.length ?? 0) > 0 && /_Invex_InterchangeControl$/i.test(tableName)) {
                const Shipment = tableName.replace(/_Invex_InterchangeControl$/i, '_Invex_ShipmentHeader');
                const hasShipment = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === Shipment.toLowerCase());
                if (hasShipment) {
                    // Fetch all shipment header records for this transaction
                    const shipresp = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(Shipment)}/Records?limit=all`);
                    const shipdata = await shipresp.json();
                    if (shipresp.ok && Array.isArray(shipdata.records)) {
                        // Build a map: ictl_key -> { bol: [] }
                        const ShipmentMap = {};
                        for (const d of shipdata.records) {
                            // Use the proper foreign key field that relates to ictl_key
                            // This might be ish_interchangekey or similar - check your database schema
                            const key = d['ish_key']; 
                            if (!key) continue;
                            if (!ShipmentMap[key]) ShipmentMap[key] = { bol: [] };
                            if (d['ish_transactionreference']) ShipmentMap[key].bol.push(d['ish_transactionreference']);
                        }
                        
                        // Inject arrays into header records
                        setRecords(prev =>
                            prev.map(r => ({
                                ...r,
                                ish_transactionreference: ShipmentMap[r['ictl_key']]?.bol ?? []
                            }))
                        );
                    }
                }
            }
            // Add this block after the existing injection blocks around line 290, right after the BOL injection:
            if ((filteredRecords.length ?? 0) > 0 && /_Invex_InterchangeControl$/i.test(tableName)) {
                const shipmentItemTable = tableName.replace(/_Invex_InterchangeControl$/i, '_Invex_ShipmentItem');
                const hasShipmentItem = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === shipmentItemTable.toLowerCase());
                if (hasShipmentItem) {
                    // Fetch all shipment item records for this transaction
                    const shipmentItemResp = await fetch(`https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(shipmentItemTable)}/Records?limit=all`);
                    const shipmentItemData = await shipmentItemResp.json();
                    if (shipmentItemResp.ok && Array.isArray(shipmentItemData.records)) {
                        // Build a map: ictl_key -> { customerIds: [] }
                        const shipmentItemMap = {};
                        for (const d of shipmentItemData.records) {
                            const key = d['shp_key']; 
                            if (!key) continue;
                            if (!shipmentItemMap[key]) shipmentItemMap[key] = { customerIds: [] };
                            if (d['shp_partcustomerid']) shipmentItemMap[key].customerIds.push(d['shp_partcustomerid']);
                        }
                        
                        // Inject customer ID arrays into header records
                        
                            setRecords(prev =>
                                prev.map(r => ({
                                    ...r,
                                    shp_partcustomerid: shipmentItemMap[r['ictl_key']]?.customerIds ?? []
                                }))
                            )
                        
                        
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
    }, [selectedTable, columnFilters['ictl_key'], columnFilters['ictl_receiverinterchangeid'], BOLSearch, coilSearch, heatSearch, branchSearch, customerIdSearch, fetchTableData]);


    useEffect(() => {
    const injectTradingPartners = async () => {
        // Only proceed if we have records with customer IDs and no trading partners yet
        if (!records || records.length === 0) {
            console.log('No records available for TP injection');
            return;
        }
        
        // Check if records already have trading partner data
        const hasTPData = records.some(r => r.rte_edi_acct_id !== undefined);
        if (hasTPData) {
            console.log('Trading partner data already exists');
            return;
        }
        
        // Check if records have customer IDs injected
        const hasCustomerIds = records.some(r => Array.isArray(r.shp_partcustomerid) && r.shp_partcustomerid.length > 0);
        if (!hasCustomerIds) {
            console.log('No customer IDs found in records yet');
            return;
        }
        
        console.log('Starting trading partner injection for records:', records);
        
        // Collect all unique customer IDs from records
        const allCustomerIds = new Set();
        
        for (const record of records) {
            console.log('Processing record for trading partners:', record);
            const customerIds = record.shp_partcustomerid || [];
            console.log('Customer IDs for this record:', customerIds);
            
            if (Array.isArray(customerIds)) {
                customerIds.forEach(id => {
                    if (id && id.trim()) {
                        allCustomerIds.add(id.trim());
                    }
                });
            }
        }
        
        console.log("All customer IDs found:", Array.from(allCustomerIds));
        
        if (allCustomerIds.size > 0) {
            try {
                // Fetch trading partner IDs for all customer IDs at once
                
                if (Array.isArray(routingPartnerData.records)) {
                    console.log("Trading partner records:", routingPartnerData.records);
                    
                    // Build a map: customer_id -> [trading_partner_ids]
                    const tradingPartnerMap = {};
                    
                    for (const tpRecord of routingPartnerData.records) {
                        const customerId = tpRecord.rte_cus_id;
                        const tradingPartnerId = tpRecord.rte_edi_acct_id;
                        
                        if (customerId && tradingPartnerId && allCustomerIds.has(customerId.trim())) {
                            if (!tradingPartnerMap[customerId]) {
                                tradingPartnerMap[customerId] = [];
                            }
                            
                            // Avoid duplicates
                            if (!tradingPartnerMap[customerId].includes(tradingPartnerId)) {
                                tradingPartnerMap[customerId].push(tradingPartnerId);
                            }
                        }
                    }
                    
                    console.log("Trading partner map:", tradingPartnerMap);
                    
                    // Inject trading partner arrays into header records
                    setRecords(prev =>
                        prev.map(r => {
                            const customerIds = r.shp_partcustomerid || [];
                            const tradingPartnerIds = [];

                            // For each customer ID in this record, get their trading partners
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
                } else {
                    console.error("Failed to fetch trading partner data");
                }
            } catch (error) {
                console.error("Error fetching trading partner data:", error);
            }
        }
    };
    
    // Run the injection when records change
    injectTradingPartners();
}, [records]); // Trigger when records change

    // Fetch prd_keys that match the entered mill coil (prd_externaltagid) from the detail table
    useEffect(() => {
        const run = async () => {
            try {
                if (!selectedTable || coilSearch.trim() === '') { setCoilMatches([]); return; }
                const detailTable = (selectedTable || '').replace(/_Invex_InterchangeControl$/i, '_Invex_ProductItem');
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (!hasDetail) { setCoilMatches([]); return; }
                const url = `https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=${encodeURIComponent('prd_externaltagid')}&searchTerm=${encodeURIComponent(coilSearch.trim())}`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (!resp.ok) { setCoilMatches([]); return; }
                const keys = new Set();
                for (const r of (data.records || [])) {
                    if (r && r['prd_key'] != null) keys.add(r['prd_key']);
                }
                console.log("Coil matches:", Array.from(keys));
                setCoilMatches(Array.from(keys));
            } catch (e) {
                setCoilMatches([]);
            }
        };
        run();
    }, [selectedTable, coilSearch, tables]);



    // Fetch prd_keys that match the entered heat (prd_heat) from the detail table
    useEffect(() => {
        const run = async () => {
            try {
                if (!selectedTable || heatSearch.trim() === '') { setHeatMatches([]); return; }
                const detailTable = (selectedTable || '').replace(/_Invex_InterchangeControl$/i, '_Invex_ProductItem');
                const hasDetail = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === detailTable.toLowerCase());
                if (!hasDetail) { setHeatMatches([]); return; }
                const url = `https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(detailTable)}/Records?limit=all&searchColumn=${encodeURIComponent('prd_heat')}&searchTerm=${encodeURIComponent(heatSearch.trim())}`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (!resp.ok) { setHeatMatches([]); return; }
                const keys = new Set();
                for (const r of (data.records || [])) {
                    if (r && r['prd_key'] != null) keys.add(r['prd_key']);
                }
                
                setHeatMatches(Array.from(keys));
            } catch (e) {
                setHeatMatches([]);
            }
        };
        run();
    }, [selectedTable, heatSearch, tables]);


    // Fetch BOL matches 
useEffect(() => {
    const run = async () => {
        try {
            if (!selectedTable || BOLSearch.trim() === '') { setBOLMatches([]); return; }
            const shipmentTable = (selectedTable || '').replace(/_Invex_InterchangeControl$/i, '_Invex_ShipmentHeader');
            const hasShipment = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === shipmentTable.toLowerCase());
            if (!hasShipment) { setBOLMatches([]); return; }
            
            // Search the shipment header table for matching BOL numbers
            const url = `https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(shipmentTable)}/Records?limit=all&searchColumn=${encodeURIComponent('ish_transactionreference')}&searchTerm=${encodeURIComponent(BOLSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (!resp.ok) { setBOLMatches([]); return; }
            
            console.log("BOL search found records:", data.records);
            
            // Filter for outbound only before extracting keys
            const outboundRecords = (data.records || []).filter(record => {
                // You might need to check the corresponding InterchangeControl record
                // For now, just get all keys and let the main filter handle it
                return true; // We'll filter at the InterchangeControl level
            });
            
            const keys = new Set();
            for (const r of outboundRecords) {
                if (r && r['ish_key'] != null) keys.add(r['ish_key']);
            }
            console.log("BOL matches:", Array.from(keys));
            setBOLMatches(Array.from(keys));
        } catch (e) {
            console.error("BOL search error:", e);
            setBOLMatches([]);
        }
    };
    run();
}, [selectedTable, BOLSearch, tables]);

    // Fetch keys that match the entered branch (ictl_invexbranchcode) from the interchange control table
useEffect(() => {
    const run = async () => {
        try {
            if (!selectedTable || branchSearch.trim() === '') { 
                setBranchMatches([]); 
                return; 
            }
            
            // Branch is directly in the InterchangeControl table, so search the current table
            const url = `https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(selectedTable)}/Records?limit=all&searchColumn=${encodeURIComponent('ictl_invexbranchcode')}&searchTerm=${encodeURIComponent(branchSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (!resp.ok) { 
                setBranchMatches([]); 
                return; 
            }
            
            console.log("Branch search found records:", data.records);
            
            const keys = new Set();
            for (const r of (data.records || [])) {
                if (r && r['ictl_key'] != null) keys.add(r['ictl_key']);
            }
            
            console.log("Branch matches (ictl_keys):", Array.from(keys));
            setBranchMatches(Array.from(keys));
        } catch (e) {
            console.error("Branch search error:", e);
            setBranchMatches([]);
        }
    };
    run();
}, [selectedTable, branchSearch]);

// Fetch keys that match the entered customer ID (shp_partcustomerid) from the shipment item table
useEffect(() => {
    const run = async () => {
        try {
            if (!selectedTable || customerIdSearch.trim() === '') { 
                setCustomerIdMatches([]); 
                return; 
            }
            
            const shipmentItemTable = (selectedTable || '').replace(/_Invex_InterchangeControl$/i, '_Invex_ShipmentItem');
            const hasShipmentItem = tables.some(t => t && typeof t === 'string' && t.toLowerCase() === shipmentItemTable.toLowerCase());
            if (!hasShipmentItem) { 
                setCustomerIdMatches([]); 
                return; 
            }
            
            // Search the shipment item table for matching customer IDs
            const url = `https://${process.env.REACT_APP_HOST}:5000/EDI_Tables/Tables/${encodeURIComponent(shipmentItemTable)}/Records?limit=all&searchColumn=${encodeURIComponent('shp_partcustomerid')}&searchTerm=${encodeURIComponent(customerIdSearch.trim())}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (!resp.ok) { 
                setCustomerIdMatches([]); 
                return; 
            }
            
            console.log("Customer ID search found records:", data.records);
            
            const keys = new Set();
            for (const r of (data.records || [])) {
                // Use shp_key to match with ictl_key in InterchangeControl table
                if (r && r['shp_key'] != null) keys.add(r['shp_key']);
            }
            
            console.log("Customer ID matches (shp_keys):", Array.from(keys));
            setCustomerIdMatches(Array.from(keys));
        } catch (e) {
            console.error("Customer ID search error:", e);
            setCustomerIdMatches([]);
        }
    };
    run();
}, [selectedTable, customerIdSearch, tables]);

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
        setBOLSearch("");
        setBranchSearch("");
        setCustomerIdSearch("");
    };

    const getColumnDisplayName = useCallback((columnName) => {
        if (columnName === 'prd_externaltagid') return 'Mill Coil Numbers';
        if (columnName === 'prd_heat') return 'Heat Numbers';
        if (columnName === 'ish_transactionreference') return 'BOL Number';
        if (columnName === 'ictl_invexbranchcode') return 'Branch Code';
        if (columnName === 'shp_partcustomerid') return 'Customer ID';
        if (columnName === 'rte_edi_acct_id') return 'Trading Partner IDs';


        const column = columns.find(c => c.column_name === columnName);
        // Use column_comment if available, otherwise fall back to column_name
        if (column?.column_comment && column.column_comment.trim() !== '') {
            return column.column_comment;
        }
        return columnName;
    }, [columns]);

    const getTradingPartnerName = (id) => {
        const tp = tradingPartnerInfo.records.find(tp => tp.edia_edi_account_id === id);
        return tp ? tp.edia_cust_name : id;
    }


   
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
                                                disabled={sendingKey === String(record['ictl_key'])}
                        style={(() => {
                                                    const isSending = sendingKey === String(record['ictl_key']);
                                                    const status = rowStatus[record['ictl_key']];
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
                                                title={rowStatus[record['ictl_key']] === 'ok' ? 'Last send succeeded' : rowStatus[record['ictl_key']] === 'err' ? 'Last send failed' : 'Resend this transaction'}
                                            >
                                                {sendingKey === String(record['ictl_key']) ? 'Sending…' : (rowStatus[record['ictl_key']] === 'ok' ? 'Sent' : 'Resend')}
                                            </button>
                                        </td>
                                        {displayColumns.map((column, colIndex) => {
                                            // Determine column width and styling based on column type
                                            let maxWidth = '200px';
                                            let whiteSpace = 'nowrap';
                                            let overflow = 'hidden';
                                            let textOverflow = 'ellipsis';
                                            
                                            if (column.column_name === 'prd_externaltagid' || column.column_name === 'prd_heat') {
                                                maxWidth = '200px'; // Increase width for coil/heat columns
                                                whiteSpace = 'normal'; // Allow wrapping for these columns
                                                overflow = 'visible';
                                                textOverflow = 'clip';
                                            } else if (column.column_name === 'ictl_key') {
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
        </div>
    );
};

export default ResendTransactionOutbound;
