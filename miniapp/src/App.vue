<script>
import { initAuthFromStorage } from '@/store/user';

export default {
  onLaunch: function () {
    // 启动时从本地存储恢复登录态（token/user/refreshToken）
    initAuthFromStorage();
  },
  onShow: function () {},
  onHide: function () {},
  // 全局错误兜底（对应 Web 端 ErrorBoundary）：记录日志，避免白屏无提示
  onError: function (err) {
    console.error('[App onError]', err);
    try {
      const logs = uni.getStorageSync('app_error_logs') || [];
      logs.unshift({ time: Date.now(), message: String(err).slice(0, 500) });
      uni.setStorageSync('app_error_logs', logs.slice(0, 20));
    } catch (e) {
      // 存储失败时忽略，不影响主流程
    }
  },
}
</script>

<style>
/* 每个页面公共css */
page {
  background: #F2F4F5;
  color: #1A1A1A;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 通用容器 */
.page {
  min-height: 100vh;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 卡片 */
.card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin: 16rpx 24rpx;
}

/* 按钮主色 */
.button-primary {
  background: #048C47 !important;
  color: #ffffff !important;
}

/* 文本色 */
.text-primary { color: #048C47; }
.text-secondary { color: #7A7A7A; }
.text-danger { color: #E54848; }

/* 空状态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

/* 底部导航栏文字放大 */
.uni-tabbar .uni-tabbar__label {
  font-size: 14px !important;
}
</style>