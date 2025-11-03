async function getPrioritySettings(tp_account_id, branch, transaction, pool) {
  let priority_1_results, priority_2_results, priority_3_results;
    // Fetch data from the database or other sources
    priority_1_results = await pool.query(
  'SELECT * FROM public."EDI_Account_Config" WHERE ediac_edi_account_id = $1 AND ediac_branch = $2 AND ediac_trans = $3',
  [tp_account_id, branch, transaction]
    );

    const priority_1 = priority_1_results.rows[0] ? priority_1_results.rows[0].ediac_data : null;
    const priority_1_config = priority_1_results.rows[0] ? priority_1_results.rows[0].ediac_trans_cfg_settings : null;

    priority_2_results = await pool.query(
    'SELECT * FROM public."EDI_Account_Config" WHERE ediac_edi_account_id = $1 AND ediac_branch IS NULL AND ediac_trans = $2',
  [tp_account_id, transaction]
    );
    const priority_2 = priority_2_results.rows[0] ? priority_2_results.rows[0].ediac_data : null;
    const priority_2_config = priority_2_results.rows[0] ? priority_2_results.rows[0].ediac_trans_cfg_settings : null;
    
    priority_3_results = await pool.query(
    'SELECT * FROM public."EDI_Account_Config" WHERE ediac_edi_account_id = $1 AND ediac_branch IS NULL AND ediac_trans IS NULL',
  [tp_account_id]
    );
    const priority_3_config = priority_3_results.rows[0] ? priority_3_results.rows[0].ediac_trans_cfg_settings : null;

    return { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config };

  
}

async function getAddressPriority(tp_account_id, branch, transaction, pool) {
  let priority_1_results, priority_2_results, priority_3_results, priority_4_results;
 priority_1_results = await pool.query(
    'SELECT * FROM public."EDI_Account_Address_Types" WHERE ediaat_edi_account_id = $1 AND ediaat_branch = $2 AND ediaat_edi_trans_tpe = $3',
    [tp_account_id, branch, transaction]
  );

  priority_2_results = await pool.query(
    'SELECT * FROM public."EDI_Account_Address_Types" WHERE ediaat_edi_account_id = $1 AND ediaat_branch = $2 AND ediaat_edi_trans_tpe IS NULL',
    [tp_account_id, branch]
  );

  priority_3_results = await pool.query(
    'SELECT * FROM public."EDI_Account_Address_Types" WHERE ediaat_edi_account_id = $1 AND ediaat_edi_trans_tpe = $2 AND ediaat_branch IS NULL',
    [tp_account_id, transaction]
  );

  priority_4_results = await pool.query(
    'SELECT * FROM public."EDI_Account_Address_Types" WHERE ediaat_edi_account_id = $1 AND ediaat_edi_trans_tpe IS NULL AND ediaat_branch IS NULL',
    [tp_account_id]
  );

  const address_priority_1 = priority_1_results.rows ? priority_1_results.rows : null;
  const address_priority_2 = priority_2_results.rows ? priority_2_results.rows : null;
  const address_priority_3 = priority_3_results.rows ? priority_3_results.rows : null;
  const address_priority_4 = priority_4_results.rows ? priority_4_results.rows : null;

  return { address_priority_1, address_priority_2, address_priority_3, address_priority_4 };
}




async function evaluatePriority(priority_1, priority_2, jsonData, field_name, record_type) {
    // Check priority_1 override
    if (priority_1 && priority_1[record_type]) {
        const found1 = priority_1[record_type].find(item => item.snfDescription === field_name);
        if (found1 && found1.overrideValue !== undefined && found1.overrideValue !== null && found1.overrideValue !== '') {
            return found1.overrideValue;
        }
    }
    // Check priority_2 override
    if (priority_2 && priority_2[record_type]) {
        const found2 = priority_2[record_type].find(item => item.snfDescription === field_name);
        if (found2 && found2.overrideValue !== undefined && found2.overrideValue !== null && found2.overrideValue !== '') {
            return found2.overrideValue;
        }
    }
    // Check jsonData
    if (jsonData !== undefined && jsonData !== null && jsonData !== '') {
        return jsonData;
    }
    // Check priority_1 default
    if (priority_1 && priority_1[record_type]) {
        const found1 = priority_1[record_type].find(item => item.snfDescription === field_name);
        if (found1 && found1.defaultValue !== undefined && found1.defaultValue !== null) {
            return found1.defaultValue;
        }
    }
    // Check priority_2 default
    if (priority_2 && priority_2[record_type]) {
        const found2 = priority_2[record_type].find(item => item.snfDescription === field_name);
        if (found2 && found2.defaultValue !== undefined && found2.defaultValue !== null) {
            return found2.defaultValue;
        }
    }
    return null;
}

module.exports = {
  evaluatePriority,
  getPrioritySettings,
  getAddressPriority
};