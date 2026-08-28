<template>
  <view class="invite-page">
    <view v-if="loading" class="empty">加载中...</view>
    <template v-else>
      <!-- 页签切换 -->
      <view class="invite-tabs">
        <view class="invite-tab" :class="{ active: activeTab === 'code' }" @click="switchTab('code')">邀请码</view>
        <view class="invite-tab" :class="{ active: activeTab === 'poster' }" @click="switchTab('poster')">邀请海报</view>
      </view>

      <!-- 邀请码 -->
      <block v-if="activeTab === 'code'">
        <view class="invite-card">
          <view class="invite-card__label">我的邀请码</view>
          <view class="invite-card__code">{{ data?.inviteCode || '暂无' }}</view>
          <button class="invite-btn" size="small" round @click="handleCopy">复制邀请码</button>
        </view>

        <!-- 邀请奖励说明 -->
        <view class="section-card">
          <view class="reward-row"><text class="reward-text">邀请奖励</text><text class="reward-desc">邀请人和被邀请人各得 5 积分</text></view>
          <view class="reward-row"><text class="reward-text">已邀请人数</text><text class="reward-num">{{ data?.stats?.totalInvited || 0 }}</text></view>
          <view class="reward-row"><text class="reward-text">累计奖励</text><text class="reward-num">{{ data?.stats?.totalReward || 0 }} 积分</text></view>
        </view>

        <!-- 分享小程序给好友 -->
        <view class="section-card share-card">
          <view class="share-tip">邀请好友注册，双方各得 5 积分</view>
          <button class="invite-btn invite-btn--primary" size="small" round open-type="share">
            分享给微信好友
          </button>
        </view>
      </block>

      <!-- 邀请海报 -->
      <!-- #ifdef MP-WEIXIN -->
      <block v-else>
        <view class="section-card poster-card">
          <canvas canvas-id="posterCanvas" id="posterCanvas" class="poster-canvas"></canvas>
          <image v-if="posterImg" :src="posterImg" class="poster-preview" mode="widthFix" />
          <view v-if="!posterImg" class="poster-loading">海报生成中...</view>
          <button class="invite-btn invite-btn--primary" size="small" round :disabled="!posterImg" @click="savePoster">
            保存到相册
          </button>
          <view class="poster-tip">长按保存图片分享给好友，扫码即可注册</view>
        </view>
      </block>
      <!-- #endif -->

      <!-- 邀请记录 -->
      <view class="section-title">邀请记录</view>
      <view class="section-card">
        <view v-if="!data?.records?.length" class="empty">暂无邀请记录</view>
        <view v-else class="record-list">
          <view v-for="record in visibleRecords" :key="record.id" class="record-item">
            <view class="record-info">
              <view class="record-user">{{ record.invitee_nickname || '新用户' }}</view>
              <view class="record-time">{{ timeAgo(record.created_at) }}</view>
            </view>
            <text class="record-reward">+{{ record.inviter_reward }} 积分</text>
          </view>
        </view>
        <view v-if="totalPages > 1" class="pager">
          <view class="pager-btn" :class="{ disabled: page <= 1 }" @click="changePage(page - 1)">上一页</view>
          <view class="pager-info">{{ page }} / {{ totalPages }}</view>
          <view class="pager-btn" :class="{ disabled: page >= totalPages }" @click="changePage(page + 1)">下一页</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { timeAgo } from '@/common/constants';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

const loading = ref(true);
const data = ref(null);
const page = ref(1);
const pageSize = 6;
const activeTab = ref('code');
const posterImg = ref('');
const posterDrawing = ref(false);

onLoad(() => {
  api.invitationMe()
    .then((res) => {
      data.value = res || null;
    })
    .catch((e) => {
      uni.showToast({ title: e.message || '获取邀请信息失败', icon: 'none' });
    })
    .finally(() => {
      loading.value = false;
    });
});

onShareAppMessage(() => {
  const code = data.value?.inviteCode || '';
  return {
    title: '商机互助：邀请你来一起赚积分',
    path: `/pages/login/index?inviteCode=${code}`,
  };
});

function switchTab(tab) {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  if (tab === 'poster') {
    uni.nextTick(() => drawPoster());
  }
}

// #ifdef MP-WEIXIN
function drawPoster() {
  const code = data.value?.inviteCode;
  if (!code || posterDrawing.value) return;
  const nickname = userStore.user?.nickname || '酒店商机伙伴';
  posterDrawing.value = true;
  posterImg.value = '';

  const W = 375;
  const H = 600;
  const ctx = uni.createCanvasContext('posterCanvas');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#048C47');
  bg.addColorStop(1, '#036B38');
  ctx.setFillStyle(bg);
  ctx.fillRect(0, 0, W, H);

  ctx.setFillStyle('rgba(255,255,255,0.12)');
  ctx.beginPath();
  ctx.arc(310, 100, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(40, 490, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.setTextAlign('center');
  ctx.setFillStyle('#ffffff');
  ctx.setFontSize(36);
  ctx.fillText('酒店商机互助平台', W / 2, 130);
  ctx.setFontSize(16);
  ctx.fillText('真实商机信息 · 分享赚积分', W / 2, 165);
  ctx.setFontSize(20);
  ctx.fillText(`邀请人：${nickname}`, W / 2, 240);
  ctx.setFontSize(14);
  ctx.setFillStyle('rgba(255,255,255,0.85)');
  ctx.fillText('扫码或复制邀请码，一起加入', W / 2, 270);

  ctx.setFillStyle('#ffffff');
  ctx.fillRect(97.5, 300, 180, 180);

  const drawQrcode = require('weapp-qrcode');
  drawQrcode({
    ctx,
    x: 97.5,
    y: 300,
    width: 180,
    height: 180,
    text: code,
    background: '#ffffff',
    foreground: '#000000',
  });

  ctx.setFillStyle('#ffffff');
  ctx.setFontSize(22);
  ctx.fillText(code, W / 2, 545);
  ctx.setFontSize(13);
  ctx.setFillStyle('rgba(255,255,255,0.8)');
  ctx.fillText('长按保存图片分享给好友', W / 2, 572);

  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'posterCanvas',
        success: (res) => {
          posterImg.value = res.tempFilePath;
          posterDrawing.value = false;
        },
        fail: () => {
          posterDrawing.value = false;
          uni.showToast({ title: '海报生成失败', icon: 'none' });
        },
      });
    }, 300);
  });
}

function savePoster() {
  if (!posterImg.value) return;
  uni.saveImageToPhotosAlbum({
    filePath: posterImg.value,
    success: () => {
      uni.showToast({ title: '已保存到相册', icon: 'success' });
    },
    fail: (err) => {
      const msg = err?.errMsg || '';
      if (msg.includes('auth')) {
        uni.showModal({
          title: '提示',
          content: '需要相册权限才能保存海报，请在设置中开启',
          showCancel: false,
        });
      } else {
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
    },
  });
}
// #endif

const totalPages = computed(() =>
  Math.ceil((data.value?.records || []).length / pageSize)
);

const visibleRecords = computed(() => {
  const records = data.value?.records || [];
  const start = (page.value - 1) * pageSize;
  return records.slice(start, start + pageSize);
});

function handleCopy() {
  const code = data.value?.inviteCode;
  if (!code) {
    uni.showToast({ title: '暂无邀请码', icon: 'none' });
    return;
  }
  uni.setClipboardData({
    data: code,
    success: () => {
      uni.showToast({ title: '邀请码已复制', icon: 'success' });
    },
  });
}

function changePage(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
}
</script>

<style lang="scss" scoped>
.invite-page {
  min-height: 100vh;
}

.invite-tabs {
  display: flex;
  margin: 24rpx 24rpx 0;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx;
}

.invite-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #7A7A7A;
}

.invite-tab.active {
  color: #ffffff;
  background: #048C47;
  font-weight: 600;
}

.poster-card {
  text-align: center;
}

.poster-canvas {
  width: 375px;
  height: 600px;
}

.poster-preview {
  width: 100%;
  border-radius: 16rpx;
}

.poster-loading {
  padding: 160rpx 0;
  color: #B0B0B0;
  font-size: 26rpx;
}

.poster-tip {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #B0B0B0;
}

.empty {
  text-align: center;
  padding: 80rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.invite-card {
  margin: 24rpx;
  background: linear-gradient(135deg, #048C47 0%, #036B38 100%);
  border-radius: 16rpx;
  padding: 48rpx 40rpx;
  text-align: center;
  color: #ffffff;
}

.invite-card__label {
  font-size: 26rpx;
  opacity: 0.9;
}

.invite-card__code {
  margin-top: 16rpx;
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
}

.invite-btn {
  margin-top: 32rpx;
  padding: 0 48rpx;
  background: #ffffff;
  color: #048C47;
  border: none;
  font-size: 26rpx;
}

.invite-btn--primary {
  background: #048C47;
  color: #ffffff;
}

.section-card {
  margin: 0 24rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  margin: 8rpx 32rpx 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.reward-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
}

.reward-text {
  font-size: 26rpx;
  color: #4A4A4A;
}

.reward-desc {
  font-size: 26rpx;
  color: #1A1A1A;
}

.reward-num {
  font-size: 26rpx;
  color: #048C47;
  font-weight: 600;
}

.share-card {
  text-align: center;
}

.share-tip {
  font-size: 26rpx;
  color: #4A4A4A;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.record-item:last-child {
  border-bottom: none;
}

.record-user {
  font-size: 26rpx;
  color: #1A1A1A;
}

.record-time {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #B0B0B0;
}

.record-reward {
  font-size: 28rpx;
  color: #048C47;
  font-weight: 600;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0 8rpx;
}

.pager-btn {
  padding: 10rpx 32rpx;
  border-radius: 8rpx;
  border: 1px solid #048C47;
  color: #048C47;
  font-size: 24rpx;
}

.pager-btn.disabled {
  opacity: 0.4;
}

.pager-info {
  margin: 0 24rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}
</style>