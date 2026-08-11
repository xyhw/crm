// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import Hall from '../src/pages/Hall';

// mock API 模块
vi.mock('../src/api', () => ({
  api: {
    opportunities: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  },
}));

describe('Hall 页面渲染', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染 Hall 不崩溃', async () => {
    let failed = null;
    const origError = console.error;
    console.error = (...args) => {
      const msg = args.join(' ');
      if (msg.includes('Element type is invalid') || msg.includes('Uncaught')) {
        failed = msg;
      }
      origError(...args);
    };
    try {
      render(
        <MemoryRouter>
          <Hall />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(document.body.innerHTML).toBeTruthy();
      });
      console.log('=== HALL HTML LEN:', document.body.innerHTML.length);
    } finally {
      console.error = origError;
    }
    expect(failed).toBeNull();
  });
});
