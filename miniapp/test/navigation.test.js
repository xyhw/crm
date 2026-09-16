import { describe, it, expect, vi, beforeEach } from 'vitest';

// 状态化 uni mock：内存 storage + switchTab
const storageMap = new Map();

global.uni = {
  switchTab: vi.fn(),
  navigateTo: vi.fn(),
  getStorageSync: vi.fn((k) => storageMap.get(k) ?? ''),
  setStorageSync: vi.fn((k, v) => storageMap.set(k, v)),
  removeStorageSync: vi.fn((k) => storageMap.delete(k)),
};

import { goPublish, goPublishEdit, consumePublishEdit } from '@/common/navigation';

describe('publish tabBar 导航中转', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
  });

  it('goPublish：写入 new 指令并 switchTab 到发布页', () => {
    goPublish();
    expect(storageMap.get('publish_edit_id')).toBe('new');
    expect(uni.switchTab).toHaveBeenCalledWith({ url: '/pages/opportunity/publish' });
    expect(uni.navigateTo).not.toHaveBeenCalled();
  });

  it('goPublishEdit：写入商机 id 指令并 switchTab', () => {
    goPublishEdit(13);
    expect(storageMap.get('publish_edit_id')).toBe('13');
    expect(uni.switchTab).toHaveBeenCalledWith({ url: '/pages/opportunity/publish' });
  });

  it('consumePublishEdit：无指令返回 null 且不清存储', () => {
    expect(consumePublishEdit()).toBeNull();
    expect(uni.removeStorageSync).not.toHaveBeenCalled();
  });

  it('consumePublishEdit：edit 指令返回 id 并清除（一次性消费）', () => {
    goPublishEdit(7);
    expect(consumePublishEdit()).toBe('7');
    expect(storageMap.has('publish_edit_id')).toBe(false);
    // 二次消费为空
    expect(consumePublishEdit()).toBeNull();
  });

  it('consumePublishEdit：new 指令返回 new 并清除', () => {
    goPublish();
    expect(consumePublishEdit()).toBe('new');
    expect(storageMap.has('publish_edit_id')).toBe(false);
  });
});
