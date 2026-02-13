import React, { useState, useEffect } from 'react';
import { FaSync, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { FcClearFilters } from 'react-icons/fc';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './InvoiceUpload.css';

function ErroredOutInvoices() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [excludeTypeU, setExcludeTypeU] = useState(true);
  const FILTER_ROW_HEIGHT = 40;

  const [columnFilters, setColumnFilters] = useState({
    vch_key: '',
    vch_type: '',
    vch_companyid: '',
    vch_entrydate: '',
    vch_vendorid: '',
    vch_vendorinvoicenumber: '',
    vch_externalreference: '',
    vch_vendorinvoicedate_from: null,
    vch_vendorinvoicedate_to: null,
    vch_purchaseorderprefix: '',
    vch_purchaseordernumber: '',
    vch_purchaseorderitem: '',
    vch_voucheramount: '',
    vch_discountableamount: '',
    vch_err_msg: ''
  });

  const clearAllFilters = () => {
    setColumnFilters({
      vch_key: '',
      vch_type: '',
      vch_companyid: '',
      vch_entrydate: '',
      vch_vendorid: '',
      vch_vendorinvoicenumber: '',
      vch_externalreference: '',
      vch_vendorinvoicedate_from: null,
      vch_vendorinvoicedate_to: null,
      vch_purchaseorderprefix: '',
      vch_purchaseordernumber: '',
      vch_purchaseorderitem: '',
      vch_voucheramount: '',
      vch_discountableamount: '',
      vch_err_msg: ''
    });
  };

  const fetchErroredVouchers = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching errored vouchers from:', `${process.env.REACT_APP_HOST}/Voucher/erroredVouchers`);
      
      const response = await fetch(`${process.env.REACT_APP_HOST}/Voucher/erroredVouchers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      console.log('Errored vouchers response:', responseData);

      if (response.ok) {
        setVouchers(responseData.data || []);
        setLastRefresh(new Date());
      } else {
        setError(responseData.error || 'Error fetching errored vouchers');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchErroredVouchers();
  }, []);

  const handleRefresh = () => {
    fetchErroredVouchers();
  };

  const applyFilters = (items) => {
    if (!items || items.length === 0) return [];
    const fromDate = columnFilters.vch_vendorinvoicedate_from || null;
    const toDate = columnFilters.vch_vendorinvoicedate_to || null;

    return items.filter(item => {
        // Exclude Type 'U' by default if flag is set, but allow if the user has entered a Type filter
        const typeFilterVal = (columnFilters.vch_type || '').toString().trim();
        if (excludeTypeU && !typeFilterVal) {
          if (item && item.vch_type && item.vch_type.toString().toLowerCase() === 'u') return false;
        }
      // Date range filter
      if (fromDate || toDate) {
        const itemDateRaw = item.vch_vendorinvoicedate || item.vch_vendorinvoicedate;
        const itemDate = itemDateRaw ? new Date(itemDateRaw) : null;
        if (fromDate && (!itemDate || itemDate < fromDate)) return false;
        if (toDate && (!itemDate || itemDate > toDate)) return false;
      }

      for (const key of Object.keys(columnFilters)) {
        if (key === 'vch_vendorinvoicedate_from' || key === 'vch_vendorinvoicedate_to') continue;
        const filterVal = (columnFilters[key] || '').toString().trim().toLowerCase();
        if (!filterVal) continue;
        const fieldVal = (item[key] === null || item[key] === undefined) ? '' : item[key].toString().toLowerCase();
        if (!fieldVal.includes(filterVal)) return false;
      }

      return true;
    });
  };

  const displayedVouchers = applyFilters(vouchers);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(displayedVouchers.length / rowsPerPage));
  const paginatedVouchers = displayedVouchers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    // Reset to first page when filters or vouchers change
    setCurrentPage(1);
  }, [JSON.stringify(columnFilters), vouchers.length, excludeTypeU]);

  return (
    <div className="invoice-upload">
      <div className="upload-container">
        <h2>
          <FaExclamationTriangle style={{ marginRight: '10px', color: '#dc3545' }} />
          Errored Out Vouchers
        </h2>
        <p className="subtitle">View vouchers that failed to create in INVEX</p>

        <div className="upload-section">
          {/* Refresh Button */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <FaSpinner className="spinner" />
                  Loading...
                </>
              ) : (
                <>
                  <FaSync />
                  Refresh
                </>
              )}
            </button>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => setShowFilters(s => !s)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                title={showFilters ? 'Hide Filters' : 'Show Filters'}
                aria-label={showFilters ? 'Hide Filters' : 'Show Filters'}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>

              <button
                onClick={clearAllFilters}
                className="btn btn-light"
                title="Clear Filters"
                aria-label="Clear Filters"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px' }}
              >
                <FcClearFilters size={18} />
                Clear
              </button>

              {lastRefresh && (
                <span style={{ color: '#666', fontSize: '14px' }}>
                  Last refreshed: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {/* Summary */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: displayedVouchers.length > 0 ? '#f8d7da' : '#d1ecf1',
            border: `1px solid ${displayedVouchers.length > 0 ? '#f5c6cb' : '#bee5eb'}`,
            borderRadius: '4px',
            color: displayedVouchers.length > 0 ? '#721c24' : '#0c5460'
          }}>
            <strong>Total Errored Vouchers: {displayedVouchers.length}</strong>
          </div>

          {/* Table */}
          {vouchers.length > 0 && (
            <div className="preview-section">
              <div className="table-responsive" style={{ maxHeight: '800px', overflow: 'auto' }}>
                <table className="table table-bordered table-striped">
                  <thead>
                    {showFilters && (
                      <tr>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Key"
                            value={columnFilters.vch_key}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_key: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Type"
                            value={columnFilters.vch_type}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_type: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Company"
                            value={columnFilters.vch_companyid}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_companyid: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Entry Date"
                            value={columnFilters.vch_entrydate}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_entrydate: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Vendor ID"
                            value={columnFilters.vch_vendorid}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_vendorid: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Vendor Invoice #"
                            value={columnFilters.vch_vendorinvoicenumber}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_vendorinvoicenumber: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter External Ref"
                            value={columnFilters.vch_externalreference}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_externalreference: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <div style={{ display: 'flex', gap: 12, padding: 2, margin: 0 }}>
                              <div style={{ width: 180 }}>
                                <DatePicker
                                  selected={columnFilters.vch_vendorinvoicedate_from}
                                  onChange={(date) => setColumnFilters(cf => ({ ...cf, vch_vendorinvoicedate_from: date }))}
                                  selectsStart
                                  startDate={columnFilters.vch_vendorinvoicedate_from}
                                  endDate={columnFilters.vch_vendorinvoicedate_to}
                                  placeholderText="From"
                                  isClearable
                                  className="form-control"
                                  wrapperClassName=""
                                />
                              </div>
                              <div style={{ width: 180 }}>
                                <DatePicker
                                  selected={columnFilters.vch_vendorinvoicedate_to}
                                  onChange={(date) => setColumnFilters(cf => ({ ...cf, vch_vendorinvoicedate_to: date }))}
                                  selectsEnd
                                  startDate={columnFilters.vch_vendorinvoicedate_from}
                                  endDate={columnFilters.vch_vendorinvoicedate_to}
                                  minDate={columnFilters.vch_vendorinvoicedate_from}
                                  placeholderText="To"
                                  isClearable
                                  className="form-control"
                                  wrapperClassName=""
                                />
                              </div>
                          </div>
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter PO Prefix"
                            value={columnFilters.vch_purchaseorderprefix}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_purchaseorderprefix: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter PO Number"
                            value={columnFilters.vch_purchaseordernumber}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_purchaseordernumber: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter PO Item"
                            value={columnFilters.vch_purchaseorderitem}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_purchaseorderitem: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Amount"
                            value={columnFilters.vch_voucheramount}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_voucheramount: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Amount"
                            value={columnFilters.vch_discountableamount}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_discountableamount: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                        <th style={{ padding: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 6, border: '1px solid #ccc', borderBottom: 0, height: FILTER_ROW_HEIGHT }}>
                          <input
                            aria-label="Filter Error Message"
                            value={columnFilters.vch_err_msg}
                            onChange={(e) => setColumnFilters(cf => ({ ...cf, vch_err_msg: e.target.value }))}
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', padding: 8 }}
                          />
                        </th>
                      </tr>
                    )}

                    <tr style={{ background: '#f8f9fa', position: 'sticky', top: showFilters ? FILTER_ROW_HEIGHT : 0, zIndex: 5 }}>
                      <th>Key</th>
                      <th>Type</th>
                      <th>Company</th>
                      <th>Entry Date</th>
                      <th>Vendor ID</th>
                      <th>Vendor Invoice #</th>
                      <th>External Ref</th>
                      <th>Invoice Date</th>
                      <th>PO Prefix</th>
                      <th>PO Number</th>
                      <th>PO Item</th>
                      <th>Amount</th>
                      <th>Discountable Amount</th>
                      <th>Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVouchers.map((voucher, index) => (
                      <tr key={`${voucher.vch_key}-${index}`}>
                        <td>{voucher.vch_key}</td>
                        <td>{voucher.vch_type}</td>
                        <td>{voucher.vch_companyid}</td>
                        <td>{voucher.vch_entrydate}</td>
                        <td>{voucher.vch_vendorid}</td>
                        <td>{voucher.vch_vendorinvoicenumber}</td>
                        <td>{voucher.vch_externalreference}</td>
                        <td>{voucher.vch_vendorinvoicedate}</td>
                        <td>{voucher.vch_purchaseorderprefix}</td>
                        <td>{voucher.vch_purchaseordernumber}</td>
                        <td>{voucher.vch_purchaseorderitem}</td>
                        <td>${voucher.vch_voucheramount ? Number(voucher.vch_voucheramount).toFixed(2) : '0.00'}</td>
                        <td>${voucher.vch_discountableamount ? Number(voucher.vch_discountableamount).toFixed(2) : Number(voucher.vch_voucheramount).toFixed(2)}</td>
                        <td style={{ 
                          maxWidth: '300px', 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word',
                          color: '#dc3545',
                          fontWeight: '500'
                        }}>
                          {voucher.vch_err_msg || voucher.vch_transactionstatusremarks || 'No error message available'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ marginRight: 8 }}>Prev</button>
                <span style={{ margin: '0 12px' }}>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ marginLeft: 8 }}>Next</button>
              </div>
            </div>
          )}

          {!loading && vouchers.length === 0 && !error && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              color: '#155724'
            }}>
              <h4>✓ No Errored Vouchers Found</h4>
              <p>All vouchers have been successfully processed!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErroredOutInvoices;
