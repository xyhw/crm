// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import AnnouncementDetail from '../src/pages/AnnouncementDetail';

vi.mock('../src/api', () => ({
  api: {
    announcementDetail: vi.fn(),
    me: vi.fn().mockResolvedValue({ nickname: '测试' }),
  },
}));

describe('公告详情 AnnouncementDetail（公告栏需求）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染文本公告标题与正文', async () => {
    const { api } = await import('../src/api');
    api.announcementDetail.mockResolvedValue({
      id: 1,
      title: '平台维护通知',
      content: '系统将于本周六维护',
      media_type: 'text',
      created_at: '2026-08-13T10:00:00.000Z',
    });
    render(
      <MemoryRouter initialEntries={['/announcement/1']}>
        <Routes>
          <Route path="/announcement/:id" element={<AnnouncementDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('平台维护通知')).toBeTruthy());
    expect(screen.getByText('系统将于本周六维护')).toBeTruthy();
  });

  it('图片公告渲染配图', async () => {
    const { api } = await import('../src/api');
    api.announcementDetail.mockResolvedValue({
      id: 2,
      title: '活动公告',
      content: '欢迎参加活动',
      media_type: 'image',
      media_url: 'https://example.com/banner.png',
      created_at: '2026-08-13T10:00:00.000Z',
    });
    render(
      <MemoryRouter initialEntries={['/announcement/2']}>
        <Routes>
          <Route path="/announcement/:id" element={<AnnouncementDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('活动公告')).toBeTruthy());
    expect(screen.getByAltText('公告配图')).toBeTruthy();
  });

  it('公告不存在时展示空态', async () => {
    const { api } = await import('../src/api');
    api.announcementDetail.mockRejectedValue(new Error('公告不存在'));
    render(
      <MemoryRouter initialEntries={['/announcement/999']}>
        <Routes>
          <Route path="/announcement/:id" element={<AnnouncementDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getAllByText('公告不存在').length).toBeGreaterThan(0));
  });
});
