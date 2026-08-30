import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StateView from '../src/components/StateView.vue';

describe('StateView 组件', () => {
  it('loading 时渲染骨架屏', () => {
    const wrapper = mount(StateView, {
      props: { loading: true, skeletonCount: 3 },
    });
    expect(wrapper.findAll('.state-loading__card')).toHaveLength(3);
    expect(wrapper.find('.state-view').exists()).toBe(false);
  });

  it('loading 骨架数量可配置', () => {
    const wrapper = mount(StateView, {
      props: { loading: true, skeletonCount: 5 },
    });
    expect(wrapper.findAll('.state-loading__card')).toHaveLength(5);
  });

  it('error 时渲染错误态并支持重试', async () => {
    const wrapper = mount(StateView, {
      props: { error: '网络连接失败', errorTitle: '加载失败' },
    });
    expect(wrapper.find('.state-view--error').exists()).toBe(true);
    expect(wrapper.text()).toContain('网络连接失败');
    expect(wrapper.text()).toContain('重试');

    await wrapper.find('.state-view__btn').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('error 且 retryable=false 时不显示重试按钮', () => {
    const wrapper = mount(StateView, {
      props: { error: '加载失败', retryable: false },
    });
    expect(wrapper.find('.state-view__btn').exists()).toBe(false);
  });

  it('empty 时渲染空态并触发 action', async () => {
    const wrapper = mount(StateView, {
      props: {
        empty: true,
        emptyTitle: '暂无相关商机',
        emptyDesc: '发布你的第一条商机，互助从你开始',
        emptyAction: '立即发布',
      },
    });
    expect(wrapper.find('.state-view--empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('暂无相关商机');
    expect(wrapper.text()).toContain('立即发布');

    await wrapper.find('.state-view__btn').trigger('click');
    expect(wrapper.emitted('action')).toHaveLength(1);
  });

  it('empty 且无 emptyAction 时按钮隐藏', () => {
    const wrapper = mount(StateView, {
      props: { empty: true, emptyTitle: '暂无数据' },
    });
    expect(wrapper.find('.state-view__btn').exists()).toBe(false);
  });

  it('正常态渲染默认插槽', () => {
    const wrapper = mount(StateView, {
      slots: { default: '<view class="content">业务内容</view>' },
    });
    expect(wrapper.find('.state-view').exists()).toBe(false);
    expect(wrapper.find('.state-loading').exists()).toBe(false);
    expect(wrapper.find('.content').text()).toBe('业务内容');
  });

  it('状态优先级：loading > error > empty > slot', () => {
    const wrapper = mount(StateView, {
      props: { loading: true, error: 'x', empty: true },
      slots: { default: '<view class="content">不应显示</view>' },
    });
    expect(wrapper.find('.state-loading').exists()).toBe(true);
    expect(wrapper.find('.state-view--error').exists()).toBe(false);
  });
});
