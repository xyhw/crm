export const SUPPLIER_CATEGORIES = [
  { value: 1, label: '装修总包', icon: 'home-o' },
  { value: 2, label: '弱电总包', icon: 'tv-o' },
  { value: 3, label: '软装总包', icon: 'hotel-o' },
  { value: 4, label: '酒店家具', icon: 'shop-o' },
  { value: 5, label: '酒店运营物资', icon: 'bag-o' },
  { value: 6, label: '厨房设备', icon: 'shopping-cart-o' },
  { value: 7, label: '照明灯具', icon: 'bulb-o' },
  { value: 8, label: '布草布艺', icon: 'flower-o' },
  { value: 9, label: '家电设备', icon: 'desktop-o' },
  { value: 10, label: '其他', icon: 'apps-o' },
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
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  INVALID: 'invalid',
};

export const ORDER_STATUS_META = {
  active: { label: '进行中', color: '#048C47', bg: '#E4F7EC' },
  inactive: { label: '已下架', color: '#7A7A7A', bg: '#F2F4F5' },
  invalid: { label: '已失效', color: '#E54848', bg: '#FDECEC' },
};

export const FOLLOW_UP_STATUS = [
  { value: 'call_no_answer', label: '电话未接通' },
  { value: 'added_wechat', label: '已加微信' },
  { value: 'interested', label: '意向明确' },
  { value: 'quoting', label: '报价中' },
  { value: 'negotiating', label: '谈判中' },
  { value: 'closed', label: '已成交' },
  { value: 'abandoned', label: '已放弃' },
];

export const FOLLOW_UP_STATUS_META = {
  call_no_answer: { label: '电话未接通', color: '#7A7A7A', bg: '#F2F4F5' },
  added_wechat: { label: '已加微信', color: '#048C47', bg: '#E4F7EC' },
  interested: { label: '意向明确', color: '#048C47', bg: '#E4F7EC' },
  quoting: { label: '报价中', color: '#E8920A', bg: '#FFF4E0' },
  negotiating: { label: '谈判中', color: '#E54848', bg: '#FDECEC' },
  closed: { label: '成交', color: '#048C47', bg: '#E4F7EC' },
  abandoned: { label: '已放弃', color: '#7A7A7A', bg: '#F2F4F5' },
};

export const CRM_STATUS_META = {
  pending: { label: '待跟进', color: '#E8920A', bg: '#FFF4E0' },
  following: { label: '跟进中', color: '#048C47', bg: '#E4F7EC' },
  closed: { label: '已成交', color: '#048C47', bg: '#E4F7EC' },
  abandoned: { label: '已放弃', color: '#7A7A7A', bg: '#F2F4F5' },
};

export const INVALID_REASONS = [
  { value: 'contact_invalid', label: '联系方式无效' },
  { value: 'info_fake', label: '信息虚假' },
  { value: 'duplicate', label: '重复商机' },
  { value: 'other', label: '其他' },
];

export const SHARE_INVALID_REASONS = [
  { value: 'info_fake', label: '信息虚假' },
  { value: 'misleading', label: '夸大误导' },
  { value: 'duplicate', label: '重复情报' },
  { value: 'other', label: '其他' },
];

export const LEVEL_META = {
  normal: { label: '普通会员', color: '#7A7A7A', discount: '无折扣' },
  silver: { label: '银牌会员', color: '#048C47', discount: '9折' },
  gold: { label: '金牌会员', color: '#E8920A', discount: '8折' },
  expert: { label: '认证达人', color: '#E54848', discount: '7折' },
};

export function categoryLabel(value) {
  return SUPPLIER_CATEGORIES.find((c) => c.value === value || c.value === Number(value))?.label || '未知';
}

export function categoryIcon(value) {
  return SUPPLIER_CATEGORIES.find((c) => c.value === value || c.value === Number(value))?.icon || 'apps-o';
}

export function categoryIconName(value) {
  return categoryIcon(value);
}

export function stageLabel(value) {
  return ORDER_STAGES.find((s) => s.value === value)?.label || value || '未填写';
}

export function maskName(name) {
  if (!name) return '匿名用户';
  if (name.length <= 1) return name[0] + '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

export function statusMeta(value) {
  return ORDER_STATUS_META[value] || ORDER_STATUS_META.active;
}

export function followUpStatusLabel(value) {
  return FOLLOW_UP_STATUS_META[value]?.label || value;
}

export function followUpStatusMeta(value) {
  return FOLLOW_UP_STATUS_META[value] || FOLLOW_UP_STATUS_META.call_no_answer;
}

export function crmStatusLabel(value) {
  return CRM_STATUS_META[value]?.label || CRM_STATUS_META.pending.label;
}

export function crmStatusMeta(value) {
  return CRM_STATUS_META[value] || CRM_STATUS_META.pending;
}

export function levelMeta(value) {
  return LEVEL_META[value] || LEVEL_META.normal;
}

export function timeAgo(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDate(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return `${formatDate(ts)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export const OPPORTUNITY_STATUS_META = {
  active: { label: '销售中', color: '#048C47', bg: '#E4F7EC' },
  inactive: { label: '已下架', color: '#7A7A7A', bg: '#F2F4F5' },
  invalid: { label: '已失效', color: '#E54848', bg: '#FDECEC' },
};

export const ORDER_STATUS_META_ADMIN = {
  paid: { label: '已支付', color: '#048C47', bg: '#E4F7EC' },
  refunded: { label: '已退款', color: '#E54848', bg: '#FDECEC' },
};

export const POINTS_SOURCE_TYPES = {
  register_gift: '注册赠送',
  invite_gift: '邀请奖励',
  purchase_income: '分佣收入',
  commission: '分佣奖励',
  reward: '奖励',
  consume: '消费',
  expire: '过期',
  recharge: '充值',
  admin_adjust: '管理员调整',
};

export function opportunityStatusLabel(value) {
  return OPPORTUNITY_STATUS_META[value]?.label || value;
}

export function orderStatusLabel(value) {
  return ORDER_STATUS_META_ADMIN[value]?.label || value;
}

export function pointsSourceTypeLabel(value) {
  return POINTS_SOURCE_TYPES[value] || value;
}

export function levelName(levelId) {
  const names = { 1: '普通会员', 2: '银牌会员', 3: '金牌会员', 4: '认证达人' };
  return names[levelId] || '普通会员';
}
