// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { NavBar } from 'react-vant';
import { ArrowLeft } from '@react-vant/icons';

function collectErrors(fn) {
  const errors = [];
  const orig = console.error;
  console.error = (...a) => {
    const m = a.join(' ');
    if (m.includes('Element type is invalid') || m.includes('Uncaught')) errors.push(m);
    orig(...a);
  };
  try {
    fn();
  } catch (e) {
    errors.push('THREW: ' + e.message);
  } finally {
    console.error = orig;
  }
  return errors;
}

describe('NavBar 渲染', () => {
  it('元素形式的 leftArrow 渲染正常', () => {
    const errors = collectErrors(() => {
      render(<NavBar title="测试" leftArrow={<ArrowLeft width={20} height={20} />} onClickLeft={() => {}} safeAreaInsetTop />);
    });
    expect(errors).toEqual([]);
    expect(document.body.innerHTML).toContain('测试');
  });

  it('不传 leftArrow 则正常', () => {
    const errors = collectErrors(() => {
      render(<NavBar title="测试" />);
    });
    expect(errors).toEqual([]);
  });
});
