
const queryInvexDatabase = require('../../Invex/InvexConnection.js');
 

async function insert810InvexInbound(pool, Header, Details, Mea, Names, Tags, AllowancesCharges) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 

    const getVendorInfo = async (ven_id) => {
        try {
          const sql = `SELECT ven_pmt_typ FROM APRVEN_REC WHERE ven_ven_id = '${ven_id}'`;
          const result = await queryInvexDatabase(sql);

          
          return result.Data[0] || null;
        } catch (error) {
          console.error('Error querying Invex database', error);
          return null;
        }
      };

      const getVendor = async (isa_id, isa_qual) => {
        try {
            console.log("Fetching Vendor with ISA ID:", isa_id, "and ISA Qual:", isa_qual);
          const sql = `select eii_ichg_acct_id from edreii_rec where eii_ichg_acct_typ = 'VN' and eii_edix_iiq = '${isa_qual}' and eii_edix_ichid = '${isa_id}'`;
          const result = await queryInvexDatabase(sql);

          
          return result.Data[0] || null;
        } catch (error) {
          console.error('Error querying Invex database', error);
          return null;
        }
      };

      const validatePO = async (purchaseOrderNumber) => {
        try {
            
          const sql = `SELECT COUNT(*) as count FROM potpoh_rec WHERE poh_po_no = ${purchaseOrderNumber}`;
          const result = await queryInvexDatabase(sql);

          
          return result.Data[0] || null;
        } catch (error) {
          console.error('Error querying Invex database', error);
          return null;
        }
      };

      const validateInvoiceNo = async (invoiceNumber, vendorId) => {
        try {
          const sql = `SELECT vch_vchr_pfx, vch_vchr_no FROM aptvch_rec WHERE vch_ven_inv_no = '${invoiceNumber}' AND vch_ven_id = '${vendorId}'`;
          const result = await queryInvexDatabase(sql);
          return result.Data[0] || null;
        } catch (error) {
          console.error('Error querying Invex database', error);
          return null;
        }
      };

      // Format date from YYYYMMDD to YYYY-MM-DD
      const formatDate = (dateString) => {
        if (!dateString) return null;
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        // If in YYYYMMDD format, convert to YYYY-MM-DD
        if (/^\d{8}$/.test(dateString)) {
            return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
        }
        // Try parsing as date
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.error('Error parsing date:', dateString, e);
        }
        return null;
      };


    const flow = "I"
    let msg = null;
    try {
      
        const vdid = await getVendor(Header.hdr_isnd_id, Header.hdr_isa_qual);
        console.log("Vendor ID Info:", vdid);
        
        if (!vdid) {
            msg = `No Vendor Found for ISA ID: ${Header.hdr_isnd_id} and ISA Qual: ${Header.hdr_isa_qual}`;
        }

        const vendorInfo = await getVendorInfo(vdid.eii_ichg_acct_id);
        const vendor = vdid ? vdid.eii_ichg_acct_id : null; 
        
        const count2 = await pool.query(`SELECT vch_key FROM public."810_Invex_VoucherHeader" WHERE vch_vendorinvoicenumber = $1 and vch_vendorid = $2 and vch_vouchernumber IS NULL`, [Header.hdr_inv_no, vendor]);

        if (count2.rows.length > 0) {
            await pool.query(`DELETE FROM public."810_SNF_Header" WHERE hdr_key = $1`, [count2.rows[0].vch_key]);
            await pool.query(`DELETE FROM public."810_Invex_VoucherHeader" WHERE vch_key = $1`, [count2.rows[0].vch_key]);
        }

        // Extract middle portion of PO number (format: xxxxx-xxxxx-xxxx)
        const extractMiddlePO = (poNumber) => {
            if (!poNumber) return null;
            const parts = poNumber.split('-');
            return parts.length >= 2 ? parts[1] : poNumber;
        };
        
        const purchaseOrderNumber = extractMiddlePO(Header.hdr_po_no);
        const validPo = await validatePO(purchaseOrderNumber);
        const validInvoiceCusCombo = await validateInvoiceNo(Header.hdr_inv_no, vendor);
        if (validPo.count == 0) {
            msg = "Invalid PO Number";
        }
        if (!vdid) {
            msg = msg ? msg + "; No Vendor Found" : "No Vendor Found";
        }
        if (validInvoiceCusCombo["vch_vchr_no"] != '') {
            msg = msg ? msg + `; Duplicate Invoice Number for Vendor, Check Voucher ${validInvoiceCusCombo["vch_vchr_pfx"]}-${validInvoiceCusCombo["vch_vchr_no"]}` : "Duplicate Invoice Number for Vendor, Check Voucher " + validInvoiceCusCombo["vch_vchr_pfx"] + "-" + validInvoiceCusCombo["vch_vchr_no"];
        }

        console.log("Valid Invoice Check:", validInvoiceCusCombo);
        console.log("Validation Message:", msg)
        // MARK: Interchange Control Table
        //Invex Interchange Control Table

        await pool.query(`INSERT INTO public."810_Invex_VoucherHeader"(
vch_key, vch_type, vch_companyid, vch_voucherprefix, vch_vouchernumber, vch_sessionid, vch_entrydate, vch_vendorid, vch_vendorinvoicenumber, vch_externalreference, vch_materialtransfernumber, vch_voyagenumber, vch_vendorinvoicedate, vch_purchaseorderprefix, vch_purchaseordernumber, vch_purchaseorderitem, vch_voucherbranch, vch_pretaxvoucheramount, vch_voucheramount, vch_discountableamount, vch_voucherdescription, vch_vouchercurrency, vch_exchangerate, vch_paymentterm, vch_discountterm, vch_duedate, vch_discountdate, vch_discountamount, vch_checkitemremarks, vch_paymenttype, vch_vouchercrossrefno, vch_authorizationreference, vch_vouchercategory, vch_servicefulfillmentdate, vch_prepaymenteligibility, vch_transactionstatusaction, vch_transactionreason, vch_transactionstatus, vch_transactionstatusremarks, vch_paymentstatusaction, vch_paymentreason, vch_paymentstatus, vch_paymentstatusremarks, vch_err_msg)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44);`, 
        [
            Header.hdr_key, //vch_key
            Header.hdr_type,
               'STX',
               'VR', //voucher prefix
               null, //voucher number output
               null, //session id output
               null, //entry date
               vendor, //vendor id   
               Header.hdr_inv_no, //vendor invoice number
               Header.hdr_bol_no, //external reference
                null, //material transfer number
                null, //voyage number
                formatDate(Header.hdr_inv_dte), //vendor invoice date - NOW FORMATTED
                purchaseOrderNumber ? 'PO' : null, //purchase order prefix
                purchaseOrderNumber, //purchase order number (middle portion only)
                null, //purchase order item needs mapping
                null, //voucher branch invex populates it
                null, //pretax voucher amount 
                Header.hdr_inv_amt, //voucher amount
                Header.hdr_disc_amount && Number(Header.hdr_disc_amount) != 0 ? Number(Header.hdr_disc_amount) / (Number(Header.hdr_term_disc_pct) / 100) : null, //discountable amount
                null, //voucher description
                Header.hdr_cur_cd, //voucher currency
                null, //exchange rate
                null, //payment term
                null, //discount term
                null, //.hdr_disc_amount && Number(Header.hdr_disc_amount) != 0 ? formatDate(Header.hdr_term_net_due_dte) : null, //due date - NOW FORMATTED
                null, //Header.hdr_disc_amount && Number(Header.hdr_disc_amount) != 0 ? formatDate(Header.hdr_disc_due_dte) : null, //discount date - NOW FORMATTED
                null, //Header.hdr_disc_amount && Number(Header.hdr_disc_amount) != 0 ? Header.hdr_disc_amount : null, //discount amount
                null, //check item remarks
                vendorInfo ? vendorInfo.ven_pmt_typ : null, //payment type
                null, //voucher cross ref no
                null, //authorization reference
                null, //voucher category
                null, //service fulfillment date
                null, //prepayment eligibility
                null, //transaction status action
                null, //transaction reason
                null, //transaction status
                null, //transaction status remarks
                null, //payment status action
                null, //payment reason
                null, //payment status
                null,  //payment status remarks
                msg //error message
        ]);
        if (msg) {
         throw new Error('Insert failed validation checks.');
        }
    } catch (error) {
        console.error('Error inserting into 810_Invex_VoucherHeader:', error);
        throw error;
    }
    
}
module.exports = {
    insert810InvexInbound
};