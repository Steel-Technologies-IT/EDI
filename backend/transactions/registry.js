// Central registry to avoid require cycles and share mappings
// Exports:
//  - transformMap: transaction -> JSON builder
//  - translations: transaction -> translation function (to output tables)

// 856
const { getInvexRecords856 } = require('../transactions/856/I856_json_crt.js');
const { transformI856 } = require('../transactions/856/I856_transform.js');

// 863
const { getInvexRecords863 } = require('../transactions/863/I863_json_crt.js');
const { transformI863 } = require('../transactions/863/I863_transform.js');

// 861
const { transformToStructuredJSON861 } = require('../transactions/861/I861_json_crt.js');

// 870
const { transformToStructuredJSON870 } = require('../transactions/870/I870_json_crt.js');

// 846
const { transformToStructuredJSON846 } = require('../transactions/846/I846_json_crt.js');

// 810
const { transformToStructuredJSON810 } = require('../transactions/810/I810_json_crt.js');

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

const transformMap = {
  '856': getInvexRecords856,
  '863': getInvexRecords863,
  '861': transformToStructuredJSON861,
  '870': transformToStructuredJSON870,
  '846': transformToStructuredJSON846,
  '810': transformToStructuredJSON810,
  '830': transformToStructuredJSON830,
  '862': transformToStructuredJSON862,
  '850': transformToStructuredJSON850,
  '867': transformToStructuredJSON867,
  '824': transformToStructuredJSON824,
  '860': transformToStructuredJSON860,
  '210': transformToStructuredJSON210
};

const translations = {
  '856': transformI856,
  '863': transformI863,
};


// // MARK: Outbound Functions
// const createSNF = {
//   '856': SNFCreateO856
// }

// const inputTablesOutbound = {
//   '856': LoadO856SNF
// }
// const OutBoundInvexTables = {
//   '856': insert856InvexOutbound
// };

// const outboundtranslations = {
//   '856': transformO856
// }  

module.exports = { transformMap, translations };
