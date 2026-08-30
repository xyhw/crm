import { describe, it, expect } from 'vitest';
import {
  SUPPLIER_CATEGORIES,
  LEVEL_META,
  ORDER_STATUS_META,
  categoryLabel,
  stageLabel,
  stageTone,
  maskName,
  levelMeta,
  levelName,
  orderStatusLabel,
  formatDate,
  formatDateTime,
  timeAgo,
} from '../src/common/constants.js';

describe('categoryLabel', () => {
  it('返回已知分类标签', () => {
    expect(categoryLabel(1)).toBe('装修总包');
    expect(categoryLabel('7')).toBe('照明灯具');
  });

  it('未知分类返回兜底文案', () => {
    expect(categoryLabel(999)).toBe('未知');
    expect(categoryLabel(undefined)).toBe('未知');
  });

  it('分类表包含全部10个供应商类型', () => {
    expect(SUPPLIER_CATEGORIES).toHaveLength(10);
    expect(new Set(SUPPLIER_CATEGORIES.map((c) => c.value)).size).toBe(10);
  });
});

describe('stageLabel / stageTone', () => {
  it('返回阶段标签', () => {
    expect(stageLabel('bidding')).toBe('招投标');
  });

  it('未知阶段返回原值', () => {
    expect(stageLabel('unknown_stage')).toBe('unknown_stage');
    expect(stageLabel('')).toBe('未填写');
  });

  it('热阶段/暖阶段标记正确', () => {
    expect(stageTone('bidding')).toBe('hot');
    expect(stageTone('negotiation')).toBe('hot');
    expect(stageTone('contract')).toBe('hot');
    expect(stageTone('design')).toBe('warm');
    expect(stageTone('info')).toBe('');
  });
});

describe('maskName（保留字段，前台已改用后端匿名）', () => {
  it('空名返回匿名用户', () => {
    expect(maskName('')).toBe('匿名用户');
  });

  it('短名保留首字加星', () => {
    expect(maskName('甲')).toBe('甲*');
    expect(maskName('张三')).toBe('张*');
  });

  it('长名保留首尾中间加星', () => {
    expect(maskName('验证号')).toBe('验*号');
    expect(maskName('弱电智能化范先锋')).toBe('弱******锋');
  });
});

describe('levelMeta / levelName', () => {
  it('返回对应等级元数据', () => {
    expect(levelMeta('gold').label).toBe('金牌会员');
    expect(levelMeta('gold').discount).toBe('8折');
  });

  it('未知等级回退普通会员', () => {
    expect(levelMeta('diamond')).toBe(LEVEL_META.normal);
    expect(levelMeta(undefined).label).toBe('普通会员');
  });

  it('levelName 数字映射', () => {
    expect(levelName(3)).toBe('金牌会员');
    expect(levelName(99)).toBe('普通会员');
  });

  it('四档等级元数据完整', () => {
    for (const key of ['normal', 'silver', 'gold', 'expert']) {
      expect(LEVEL_META[key].label).toBeTruthy();
      expect(LEVEL_META[key].color).toMatch(/^#/);
      expect(LEVEL_META[key].discount).toBeTruthy();
    }
  });
});

describe('orderStatusLabel', () => {
  it('支付状态映射', () => {
    expect(orderStatusLabel('paid')).toBe('已支付');
    expect(orderStatusLabel('refunded')).toBe('已退款');
  });

  it('未知状态返回原值', () => {
    expect(orderStatusLabel('pending')).toBe('pending');
  });

  it('商机状态元数据覆盖全部枚举', () => {
    expect(Object.keys(ORDER_STATUS_META).sort()).toEqual(['active', 'inactive', 'invalid']);
  });
});

describe('formatDate / formatDateTime', () => {
  it('空值返回空串', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });

  it('格式化为 YYYY-MM-DD', () => {
    expect(formatDate('2026-08-30T10:20:30')).toBe('2026-08-30');
  });

  it('formatDateTime 含时分', () => {
    expect(formatDateTime('2026-08-30T09:05:08')).toMatch(/^2026-08-30 09:05$/);
  });
});

describe('timeAgo', () => {
  it('空值返回空串', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(0)).toBe('');
  });

  it('1分钟内返回刚刚', () => {
    expect(timeAgo(Date.now() - 30 * 1000)).toBe('刚刚');
  });

  it('1小时内返回分钟', () => {
    expect(timeAgo(Date.now() - 5 * 60000)).toBe('5 分钟前');
  });

  it('24小时内返回小时', () => {
    expect(timeAgo(Date.now() - 3 * 3600000)).toBe('3 小时前');
  });

  it('30天内返回天数', () => {
    expect(timeAgo(Date.now() - 10 * 86400000)).toBe('10 天前');
  });

  it('超过30天返回日期', () => {
    const ts = Date.now() - 45 * 86400000;
    expect(timeAgo(ts)).toBe(formatDate(ts));
  });
});
