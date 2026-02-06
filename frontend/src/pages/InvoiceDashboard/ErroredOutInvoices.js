import React, { useState, useEffect } from 'react';
import { FaSync, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import './InvoiceUpload.css';

function ErroredOutInvoices() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

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
            
            {lastRefresh && (
              <span style={{ color: '#666', fontSize: '14px' }}>
                Last refreshed: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
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
            backgroundColor: vouchers.length > 0 ? '#f8d7da' : '#d1ecf1',
            border: `1px solid ${vouchers.length > 0 ? '#f5c6cb' : '#bee5eb'}`,
            borderRadius: '4px',
            color: vouchers.length > 0 ? '#721c24' : '#0c5460'
          }}>
            <strong>Total Errored Vouchers: {vouchers.length}</strong>
          </div>

          {/* Table */}
          {vouchers.length > 0 && (
            <div className="preview-section">
              <div className="table-responsive" style={{ maxHeight: '600px', overflow: 'auto' }}>
                <table className="table table-bordered table-striped">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                    <tr>
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
                      <th>Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((voucher, index) => (
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