export const LEVEL_NAMES = { 1: '普通会员', 2: '银牌会员', 3: '金牌会员', 4: '认证达人' };

export const OPPORTUNITY_STATUS = {
  active: '销售中',
  inactive: '已下架',
  invalid: '已失效',
};

export const ORDER_STATUS = {
  pending: '待支付',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
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
  refund: '退款扣回',
  penalty: '惩罚扣回',
};

export const FOLLOW_UP_STATUS = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export const RECHARGE_STATUS = {
  pending: '待支付',
  paid: '已支付',
  failed: '失败',
  expired: '已过期',
  refunded: '已退款',
};

export const CHANNEL_LABEL = {
  wechat: '虚拟支付',
  waffo: 'Waffo',
  mock: 'Mock',
  alipay: '支付宝',
  stripe: 'Stripe',
};

export const ACTION_LABELS = {
  view: '查看',
  edit: '编辑',
  delete: '删除',
  create: '创建',
  approved: '审核通过',
  rejected: '审核驳回',
  ban: '封禁',
  unban: '解封',
  import: '批量导入',
  adjust_points: '调整积分',
  adjust_credits: '调整信用分',
  recharge_sync: '充值查单补账',
  recharge_refund: '充值退款登记',
};

export function levelName(levelId) {
  return LEVEL_NAMES[levelId] || '普通会员';
}

export function opportunityStatusLabel(v) {
  return OPPORTUNITY_STATUS[v] || v || '-';
}

export function orderStatusLabel(v) {
  return ORDER_STATUS[v] || v || '-';
}

export function pointsSourceTypeLabel(v) {
  return POINTS_SOURCE_TYPES[v] || v || '-';
}

export function followUpStatusLabel(v) {
  return FOLLOW_UP_STATUS[v] || v || '-';
}

export function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return `${formatDate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fen(v) {
  return `¥${((Number(v) || 0) / 100).toFixed(2)}`;
}

export function badgeTone(kind) {
  if (kind === 'ok' || kind === 'active' || kind === 'paid' || kind === 'completed' || kind === 'approved') return 'badge-ok';
  if (kind === 'warn' || kind === 'pending' || kind === 'refunding') return 'badge-warn';
  if (kind === 'fail' || kind === 'banned' || kind === 'inactive' || kind === 'invalid' || kind === 'refunded' || kind === 'rejected' || kind === 'failed' || kind === 'expired' || kind === 'cancelled') {
    return 'badge-fail';
  }
  return 'badge-muted';
}
