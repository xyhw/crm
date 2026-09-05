import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toSnakeCase, bodyField, pickBodyFields } from '../utils/body-fields.js';

describe('请求体字段命名归一化', () => {
  test('toSnakeCase 转换驼峰键名', () => {
    assert.equal(toSnakeCase('imageUrl'), 'image_url');
    assert.equal(toSnakeCase('sortOrder'), 'sort_order');
    assert.equal(toSnakeCase('purchaseRateThreshold'), 'purchase_rate_threshold');
    assert.equal(toSnakeCase('title'), 'title');
    assert.equal(toSnakeCase('isTop'), 'is_top');
  });

  test('bodyField 优先取 camelCase', () => {
    const body = { imageUrl: 'camel.png', image_url: 'snake.png' };
    assert.equal(bodyField(body, 'imageUrl'), 'camel.png');
  });

  test('bodyField 回退到 snake_case', () => {
    const body = { image_url: 'snake.png', sort_order: 7 };
    assert.equal(bodyField(body, 'imageUrl'), 'snake.png');
    assert.equal(bodyField(body, 'sortOrder'), 7);
  });

  test('bodyField 两种命名都缺省时返回 undefined', () => {
    assert.equal(bodyField({ title: 'x' }, 'imageUrl'), undefined);
    assert.equal(bodyField(null, 'imageUrl'), undefined);
    assert.equal(bodyField(undefined, 'imageUrl'), undefined);
  });

  test('bodyField 保留 0 与 null 等假值', () => {
    assert.equal(bodyField({ sort_order: 0 }, 'sortOrder'), 0);
    assert.equal(bodyField({ start_at: null }, 'startAt'), null);
    assert.equal(bodyField({ is_top: false }, 'isTop'), false);
    assert.equal(bodyField({ link_url: '' }, 'linkUrl'), '');
  });

  test('pickBodyFields 混合命名的请求体', () => {
    const body = { title: 'Banner', image_url: 'a.png', sortOrder: 3, link_url: null };
    const picked = pickBodyFields(body, ['title', 'imageUrl', 'linkUrl', 'sortOrder', 'endAt']);
    assert.deepEqual(picked, { title: 'Banner', imageUrl: 'a.png', linkUrl: null, sortOrder: 3 });
  });

  test('pickBodyFields 不引入缺省键，保住 PUT 的缺省不更新语义', () => {
    const picked = pickBodyFields({ title: '仅改标题' }, ['title', 'content', 'sortOrder', 'status']);
    assert.deepEqual(Object.keys(picked), ['title']);
    assert.equal('sortOrder' in picked, false);
    assert.equal('status' in picked, false);
  });

  test('pickBodyFields 处理空请求体', () => {
    assert.deepEqual(pickBodyFields({}, ['title', 'imageUrl']), {});
    assert.deepEqual(pickBodyFields(null, ['title']), {});
  });

  test('等级配置 snake_case 请求体可被完整读取', () => {
    const body = {
      purchase_discount: 0.85,
      commission_bonus: 0.1,
      purchase_rate_threshold: 60,
      invalid_rate_threshold: 5,
      helpful_rate_threshold: 70,
      activity_threshold: 30,
      mark_weight: 2,
      free_audit: 1,
    };
    const picked = pickBodyFields(body, [
      'purchaseDiscount', 'commissionBonus', 'purchaseRateThreshold', 'invalidRateThreshold',
      'helpfulRateThreshold', 'activityThreshold', 'markWeight', 'freeAudit',
    ]);
    assert.equal(picked.purchaseDiscount, 0.85);
    assert.equal(picked.purchaseRateThreshold, 60);
    assert.equal(picked.markWeight, 2);
    assert.equal(picked.freeAudit, 1);
  });
});
