<template>
  <view class="config-page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view class="section" v-for="(group, gi) in groups" :key="gi">
        <view class="section-title">{{ group.title }}</view>
        <view class="card-item" v-for="f in group.fields" :key="f.key">
          <view class="field-head">
            <text class="field-label">{{ f.label }}</text>
            <text class="field-key">{{ f.key }}</text>
          </view>
          <switch
            v-if="f.type === 'boolean'"
            :checked="draft[f.key] === true"
            color="#037539"
            @change="draft[f.key] = $event.detail.value"
          />
          <picker
            v-else-if="f.type === 'select'"
            :range="f.options.map(o => o.label)"
            @change="draft[f.key] = f.options[$event.detail.value].value"
          >
            <view class="select-value">{{ selectLabel(f) }}</view>
          </picker>
          <input
            v-else
            v-model="draft[f.key]"
            class="form-input"
            :type="f.type === 'number' ? 'digit' : 'text'"
          />
          <view v-if="f.desc" class="field-desc">{{ f.desc }}</view>
        </view>
      </view>
    </view>

    <view class="save-btn" :class="{ disabled: saving }" @click="saveAll">{{ saving ? '保存中...' : '保存全部配置' }}</view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

const loading = ref(false);
const saving = ref(false);
const draft = ref({});
const groups = ref([]);

const PERCENT_KEYS = ['platform_commission_rate', 'invalid_threshold', 'invalid_penalty_rate', 'similarity_threshold'];

const GROUP_DEF = [
  {
    title: '积分配置',
    fields: [
      { key: 'register_gift_points', label: '注册赠送积分', type: 'number' },
      { key: 'invite_reward_points', label: '邀请奖励积分', type: 'number' },
      { key: 'helpful_reward_points', label: '分享认可奖励积分', type: 'number' },
      { key: 'share_reward_points', label: '分享奖励积分', type: 'number' },
      { key: 'points_expire_days', label: '积分有效期(天)', type: 'number' },
      { key: 'points_recharge_limit', label: '单次充值上限', type: 'number' },
      { key: 'opportunity_price_min', label: '商机定价下限(积分)', type: 'number' },
      { key: 'opportunity_price_max', label: '商机定价上限(积分)', type: 'number' },
      { key: 'points_mall_enabled', label: '积分商城开关', type: 'boolean' },
    ],
  },
  {
    title: '分成与审核配置',
    fields: [
      { key: 'platform_commission_rate', label: '平台抽成比例(%)', type: 'number', desc: '0-100；每笔交易平台收取的分成比例' },
      { key: 'similarity_threshold', label: '相似度判定阈值(%)', type: 'number', desc: '0-100；超过该值视为重复商机' },
    ],
  },
  {
    title: '信用与无效配置',
    fields: [
      { key: 'invalid_threshold', label: '无效判定阈值(%)', type: 'number', desc: '0-100；超过该值被自动标记为无效' },
      { key: 'invalid_penalty_rate', label: '无效惩罚信用分', type: 'number', desc: '每次被判定无效扣除的信用分' },
      { key: 'invalid_ban_threshold', label: '无效累计封禁次数', type: 'number', desc: '累计无效次数达到该值自动封禁账号' },
      { key: 'credit_review_threshold', label: '投稿审核信用阈值', type: 'number', desc: '0-100；低于该值的投稿需人工审核' },
      { key: 'credit_ban_threshold', label: '封禁信用阈值', type: 'number', desc: '0-100；低于该值自动封禁账号' },
    ],
  },
  {
    title: '支付渠道配置',
    fields: [
      {
        key: 'pay_default_channel', label: '默认支付渠道', type: 'select',
        options: [
          { value: 'mock', label: '模拟支付(开发)' },
          { value: 'wechat', label: '微信支付' },
          { value: 'alipay', label: '支付宝' },
          { value: 'stripe', label: 'Stripe' },
          { value: 'waffo', label: 'Waffo Pancake' },
        ],
      },
      { key: 'pay_mock_autopay', label: 'mock自动完成', type: 'boolean' },
      { key: 'pay_points_to_yuan', label: '1积分=多少元', type: 'number', desc: '可填小数' },
      { key: 'pay_order_ttl', label: '订单过期(秒)', type: 'number' },
      { key: 'pay_site_base_url', label: '站点域名', type: 'text', desc: '支付成功跳转、回调通知基于此域名' },
    ],
  },
  {
    title: '微信支付',
    fields: [
      { key: 'pay_wechat_enabled', label: '启用', type: 'boolean' },
      { key: 'pay_wechat_appid', label: 'AppID', type: 'text' },
      { key: 'pay_wechat_mchid', label: '商户号', type: 'text' },
      { key: 'pay_wechat_apiv3key', label: 'APIv3密钥', type: 'text' },
      { key: 'pay_wechat_serialno', label: '证书序列号', type: 'text' },
      { key: 'pay_wechat_private_key_path', label: '私钥文件路径', type: 'text' },
      { key: 'pay_wechat_notify_url', label: '回调通知URL', type: 'text' },
    ],
  },
  {
    title: '支付宝',
    fields: [
      { key: 'pay_alipay_enabled', label: '启用', type: 'boolean' },
      { key: 'pay_alipay_appid', label: 'AppID', type: 'text' },
      { key: 'pay_alipay_notify_url', label: '回调通知URL', type: 'text' },
      { key: 'pay_alipay_private_key', label: '应用私钥', type: 'text' },
      { key: 'pay_alipay_public_key', label: '支付宝公钥', type: 'text' },
    ],
  },
  {
    title: 'Stripe',
    fields: [
      { key: 'pay_stripe_enabled', label: '启用', type: 'boolean' },
      { key: 'pay_stripe_secret_key', label: 'Secret Key', type: 'text' },
      { key: 'pay_stripe_webhook_secret', label: 'Webhook Secret', type: 'text' },
    ],
  },
  {
    title: 'Waffo Pancake',
    fields: [
      { key: 'pay_waffo_enabled', label: '启用', type: 'boolean' },
      { key: 'pay_waffo_merchant_id', label: 'Merchant ID', type: 'text', desc: 'MER_...' },
      { key: 'pay_waffo_store_id', label: 'Store ID', type: 'text', desc: 'STO_...' },
      { key: 'pay_waffo_private_key', label: 'RSA私钥(PEM/Base64)', type: 'text', desc: '-----BEGIN PRIVATE KEY-----' },
      { key: 'pay_waffo_product_id', label: '商品ID(留空自动创建)', type: 'text', desc: 'PROD_...' },
      { key: 'pay_waffo_currency', label: '币种', type: 'text', desc: '如 USD' },
      {
        key: 'pay_waffo_environment', label: '环境', type: 'select',
        options: [
          { value: 'test', label: 'test' },
          { value: 'prod', label: 'prod' },
        ],
      },
      { key: 'pay_waffo_success_url', label: '支付成功跳转URL', type: 'text' },
    ],
  },
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await adminApi.getConfigs();
    groups.value = GROUP_DEF;
    draft.value = {};
    for (const group of GROUP_DEF) {
      for (const f of group.fields) {
        let v = res[f.key];
        if (v === null || v === undefined) {
          v = f.type === 'boolean' ? false : '';
        } else if (f.type === 'boolean') {
          v = v === true || v === 1 || v === '1' || v === 'true';
        } else if (f.type === 'number') {
          let n = Number(v);
          if (PERCENT_KEYS.includes(f.key) && !Number.isNaN(n)) n = Math.round(n * 100);
          v = Number.isNaN(n) ? '' : String(n);
        } else {
          v = String(v);
        }
        draft.value[f.key] = v;
      }
    }
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(() => fetchList());

function selectLabel(f) {
  const opt = f.options.find((o) => o.value === draft.value[f.key]);
  return opt ? opt.label : '请选择';
}

async function saveAll() {
  saving.value = true;
  try {
    const payload = {};
    for (const group of GROUP_DEF) {
      for (const f of group.fields) {
        let v = draft.value[f.key];
        if (f.type === 'boolean') {
          payload[f.key] = !!v;
        } else if (f.type === 'number') {
          let n = Number(v);
          if (PERCENT_KEYS.includes(f.key) && !Number.isNaN(n)) n = n / 100;
          payload[f.key] = Number.isNaN(n) ? 0 : n;
        } else {
          payload[f.key] = v === null || v === undefined ? '' : String(v);
        }
      }
    }
    await adminApi.updateConfig(payload);
    uni.showToast({ title: '保存成功', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
.config-page { touch-action: manipulation;
  min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx; }
.section { margin-bottom: 8rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #1A1A1A; padding: 24rpx 0 16rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.field-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.field-label { font-size: 28rpx; font-weight: 600; color: #1A1A1A; }
.field-key { font-size: 22rpx; color: #666666; }
.field-desc { font-size: 22rpx; color: #666666; margin-top: 12rpx; }
.form-input { height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.form-input:focus { border-color: #037539; background: #fff; }
.select-value { height: 72rpx; line-height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #333; }
.save-btn { margin-top: 16rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #037539; color: #fff; border-radius: 12rpx; font-size: 30rpx; margin-bottom: 40rpx; }
.save-btn.disabled { opacity: 0.6; }
</style>