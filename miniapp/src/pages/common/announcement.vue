<template>
  <view class="announcement-page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!detail" class="empty">公告不存在或已下架</view>
    <view v-else class="content">
      <view class="title">{{ detail.title }}</view>
      <view class="time">{{ formatDateTime(detail.created_at) }}</view>

      <image
        v-if="isImage && detail.media_url"
        class="media"
        :src="detail.media_url"
        mode="widthFix"
        @click="previewMedia"
      />
      <video
        v-if="isVideo && detail.media_url"
        class="media"
        :src="detail.media_url"
        controls
      ></video>

      <view class="content-text">{{ detail.content }}</view>

      <view v-if="detail.link_url" class="link" @click="openLink">
        查看相关链接 ›
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { formatDateTime } from '@/common/constants';

const loading = ref(true);
const detail = ref(null);

onLoad((options) => {
  const id = options?.id;
  if (id) {
    api.announcementDetail(id)
      .then((res) => {
        detail.value = res || null;
      })
      .catch((e) => {
        uni.showToast({ title: e.message || '获取公告失败', icon: 'none' });
      })
      .finally(() => {
        loading.value = false;
      });
  } else {
    loading.value = false;
  }
});

const isVideo = computed(() => detail.value?.media_type === 'video');
const isImage = computed(
  () => detail.value?.media_type === 'image' || detail.value?.media_type === 'mixed'
);

function previewMedia() {
  if (detail.value?.media_url) {
    uni.previewImage({ urls: [detail.value.media_url] });
  }
}

function openLink() {
  // #ifdef MP-WEIXIN
  uni.setClipboardData({
    data: detail.value.link_url,
    success: () => uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' }),
  });
  // #endif
  // #ifndef MP-WEIXIN
  window.location.href = detail.value.link_url;
  // #endif
}
</script>

<style lang="scss" scoped>
.announcement-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.content {
  padding: 32rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.4;
}

.time {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #B0B0B0;
}

.media {
  width: 100%;
  margin-top: 24rpx;
  border-radius: 12rpx;
}

.content-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #4A4A4A;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
}

.link {
  margin-top: 32rpx;
  font-size: 28rpx;
  color: #048C47;
  text-decoration: underline;
}
</style>