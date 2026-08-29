<script>
import { initAuthFromStorage } from '@/store/user';

export default {
  onLaunch: function () {
    // 启动时从本地存储恢复登录态（token/user/refreshToken）
    initAuthFromStorage();
  },
  onShow: function () {},
  onHide: function () {},
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
  font-size: 12px !important;
}
</style>