export const INSPECTION_TYPE = {
  1: { label: '来料检验', color: 'blue' },
  2: { label: '过程检验', color: 'cyan' },
  3: { label: '成品检验', color: 'geekblue' },
};

export const INSPECTION_RESULT = {
  0: { label: '未判定', color: 'default' },
  1: { label: '合格', color: 'success' },
  2: { label: '不合格', color: 'error' },
  3: { label: '让步接收', color: 'warning' },
};

export const DEFECT_TYPE = {
  1: { label: '来料不良', color: 'blue' },
  2: { label: '过程不良', color: 'orange' },
  3: { label: '成品不良', color: 'red' },
};

export const DEFECT_SEVERITY = {
  1: { label: '轻微', color: 'default' },
  2: { label: '一般', color: 'warning' },
  3: { label: '严重', color: 'orange' },
  4: { label: '致命', color: 'error' },
};

export const DEFECT_STATUS = {
  1: { label: '待处理', color: 'warning' },
  2: { label: '处理中', color: 'processing' },
  3: { label: '已处理', color: 'success' },
  4: { label: '已关闭', color: 'default' },
};

export const DISPOSITION_TYPE = {
  1: '返工',
  2: '返修',
  3: '报废',
  4: '让步接收',
  5: '退换货',
};

export const APPROVE_STATUS = {
  0: { label: '待审批', color: 'warning' },
  1: { label: '已批准', color: 'success' },
  2: { label: '已驳回', color: 'error' },
};

export const PRODUCTION_STATUS = {
  1: { label: '生产中', color: 'processing' },
  2: { label: '待检', color: 'warning' },
  3: { label: '合格入库', color: 'success' },
  4: { label: '待处理', color: 'orange' },
  5: { label: '返工中', color: 'processing' },
  6: { label: '已报废', color: 'error' },
};

export const MATERIAL_BATCH_STATUS = {
  1: { label: '待检', color: 'warning' },
  2: { label: '合格', color: 'success' },
  3: { label: '不合格', color: 'error' },
  4: { label: '让步接收', color: 'orange' },
};
