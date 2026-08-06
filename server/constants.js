export const SUPPLIER_CATEGORIES = [
  { value: 'zhuangxiu', label: '装修总包' },
  { value: 'ruoduan', label: '弱电总包' },
  { value: 'ruanzhuang', label: '软装总包' },
  { value: 'furniture', label: '酒店家具' },
  { value: 'ops', label: '酒店运营物资' },
  { value: 'kitchen', label: '厨房设备' },
  { value: 'lighting', label: '照明灯具' },
  { value: 'textile', label: '布草布艺' },
  { value: 'appliance', label: '家电设备' },
  { value: 'other', label: '其他' },
];

export const ORDER_STAGES = [
  { value: 'info', label: '信息获取' },
  { value: 'design', label: '设计阶段' },
  { value: 'bidding', label: '招投标' },
  { value: 'negotiation', label: '商务洽谈' },
  { value: 'contract', label: '合同签订' },
  { value: 'inprogress', label: '施工/供货中' },
  { value: 'acceptance', label: '验收结算' },
];

export const ORDER_STATUS = {
  OPEN: 'open',
  HELPING: 'helping',
  DONE: 'done',
  CLOSED: 'closed',
};

export const HELP_STATUS = {
  ACTIVE: 'active',
  REPORTED: 'reported',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
};

export const POINTS_RULES = {
  PUBLISH_ORDER: 5,
  HELP_ACCEPT: 2,
  HELP_CONFIRM: 20,
};

export function categoryLabel(value) {
  return SUPPLIER_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function stageLabel(value) {
  return ORDER_STAGES.find((s) => s.value === value)?.label || value;
}

export function orderStatusLabel(value) {
  const map = {
    open: '待认领',
    helping: '互助中',
    done: '已完成',
    closed: '已关闭',
  };
  return map[value] || value;
}
