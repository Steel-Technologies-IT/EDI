// Central registry to avoid require cycles and share mappings
// Exports:
//  - transformMap: transaction -> JSON builder
//  - translations: transaction -> translation function (to output tables)

// 856
const { getInvexRecords856 } = require('../transactions/856/I856_json_crt.js');
const { transformI856 } = require('../transactions/856/I856_transform.js');
const { SNFCreateO846 } = require('../transactions/846/O846_SNF_crt.js');
const { SNFCreateO856 } = require('../transactions/856/O856_SNF_crt.js');
const { SNFCreateO863 } = require('../transactions/863/O863_SNF_crt.js');
const { SNFCreateO861 } = require('../transactions/861/O861_SNF_crt.js');
const { SNFCreateO870 } = require('../transactions/870/O870_SNF_crt.js'); 
const { insert856InvexOutbound } = require('../transactions/856/O856_insert_Invex.js');
const { insert863InvexOutbound } = require('../transactions/863/O863_insert_invex.js');
const { insert861InvexOutbound } = require('../transactions/861/O861_insert_invex.js');
const { insert846InvexOutbound } = require('../transactions/846/O846_insert_Invex.js');
const { insert870InvexOutbound } = require('../transactions/870/O870_insert_Invex.js');
const { transformO856 } = require('../transactions/856/O856_transform.js');
const { transformO863 } = require('../transactions/863/O863_transform.js');
const { transformO861 } = require('../transactions/861/O861_transform.js');
const { transformO846 } = require('../transactions/846/O846_transform.js');
const { transformO870 } = require('../transactions/870/O870_transform.js');
// 863
const { getInvexRecords863 } = require('../transactions/863/I863_json_crt.js');
const { transformI863 } = require('../transactions/863/I863_transform.js');

// 861
const { getInvexRecords861 } = require('../transactions/861/I861_json_crt.js');
const { transformI861 } = require('../transactions/861/I861_transform.js');
// 870
const { transformToStructuredJSON870 } = require('../transactions/870/I870_json_crt.js');

// 846
const { transformToStructuredJSON846 } = require('../transactions/846/I846_json_crt.js');

// 830
const { transformToStructuredJSON830 } = require('../transactions/830/I830_json_crt.js');

// 862
const { transformToStructuredJSON862 } = require('../transactions/862/I862_json_crt.js');

// 850
const { transformToStructuredJSON850 } = require('../transactions/850/I850_json_crt.js');

// 867
const { transformToStructuredJSON867 } = require('../transactions/867/I867_json_crt.js');

// 824
const { transformToStructuredJSON824 } = require('../transactions/824/I824_json_crt.js');

// 860
const { transformToStructuredJSON860 } = require('../transactions/860/I860_json_crt.js');

// 210
const { transformToStructuredJSON210 } = require('../transactions/210/I210_json_crt.js');

const { processInvoiceToVoucher } = require('../transactions/810/I810_crt_vch.js');
const { transformI810 } = require('../transactions/810/I810_transform.js');

const transformMap = {
  '856': getInvexRecords856,
  '863': getInvexRecords863,
  '861': getInvexRecords861,
  '870': transformToStructuredJSON870,
  '846': transformToStructuredJSON846,
  '830': transformToStructuredJSON830,
  '862': transformToStructuredJSON862,
  '850': transformToStructuredJSON850,
  '867': transformToStructuredJSON867,
  '824': transformToStructuredJSON824,
  '860': transformToStructuredJSON860,
  '210': transformToStructuredJSON210,
  '810': processInvoiceToVoucher
};

const translations = {
  '856': transformI856,
  '863': transformI863,
  '810': transformI810,
  '861': transformI861
};


const createSNF = {
  '846': SNFCreateO846,
  '856': SNFCreateO856,
  '863': SNFCreateO863,
  '861': SNFCreateO861,
  '870': SNFCreateO870
}


const OutBoundInvexTables = {
  '846': insert846InvexOutbound,
  '856': insert856InvexOutbound,
  '863': insert863InvexOutbound,
  '861': insert861InvexOutbound,
  '870': insert870InvexOutbound
};

const outboundtranslations = {
  '846': transformO846,
  '856': transformO856,
  '863': transformO863,
  '861': transformO861,
  '870': transformO870
}

module.exports = { transformMap, translations, outboundtranslations, createSNF, OutBoundInvexTables };
