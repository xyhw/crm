<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">系统配置</h1>
        <p class="page-sub">支付密钥保存时勿把打码值 ****** 回写</p>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchList">刷新</button>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="askSave">{{ saving ? '保存中...' : '保存全部配置' }}</button>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <section v-for="(group, gi) in groups" :key="gi" class="card group">
        <h2>{{ group.title }}</h2>
        <div class="fields">
          <div v-for="f in group.fields" :key="f.key" class="cfg">
            <div class="cfg-head">
              <span class="field-label">{{ f.label }}</span>
              <span class="key">{{ f.key }}</span>
            </div>
            <label v-if="f.type === 'boolean'" class="switch">
              <input v-model="draft[f.key]" type="checkbox" />
              <span>{{ draft[f.key] ? '启用' : '关闭' }}</span>
            </label>
            <select v-else-if="f.type === 'select'" v-model="draft[f.key]" class="select">
              <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <input
              v-else
              v-model="draft[f.key]"
              class="input"
              :type="f.type === 'number' ? 'number' : 'text'"
              :placeholder="isSensitive(f.key) ? '留空或 ****** 表示不修改' : ''"
            />
            <p v-if="f.desc" class="field-help">{{ f.desc }}</p>
          </div>
        </div>
      </section>
    </template>
    <ConfirmDialog
      v-model="saveOpen"
      title="保存配置"
      content="将覆盖当前系统配置。支付密钥若仍为 ****** 则不会回写。"
      confirm-text="确认保存"
      tone="warning"
      @confirm="saveAll"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { useToastStore } from '../stores/toast';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const loading = ref(false);
const saving = ref(false);
const draft = ref({});
const original = ref({});
const groups = ref([]);
const saveOpen = ref(false);

const PERCENT_KEYS = ['platform_commission_rate', 'invalid_threshold', 'invalid_penalty_rate', 'similarity_threshold'];
const SENSITIVE_RE = /private_?key|secret_?key|webhook_?secret|api_?key|appkey|apiv3key|mch_?key|app_?secret/i;

function isSensitive(key) {
  return SENSITIVE_RE.test(key);
}

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
          { value: 'wechat', label: '微信虚拟支付' },
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
    title: '微信虚拟支付（个人主体道具直购）',
    fields: [
      { key: 'pay_wechat_enabled', label: '启用', type: 'boolean' },
      { key: 'pay_wechat_appid', label: 'AppID', type: 'text', desc: '小程序 AppID，与 WX_MINIAPP_APPID 一致' },
      { key: 'pay_wechat_offer_id', label: 'OfferID', type: 'text', desc: 'MP后台 虚拟支付 → 基本配置' },
      { key: 'pay_wechat_appkey', label: '现网AppKey', type: 'text', desc: 'MP后台 虚拟支付 → 基本配置；值为 ****** 时保存会跳过' },
      { key: 'pay_wechat_product_map', label: '道具映射JSON', type: 'text', desc: '如 {"50":"prod_50","100":"prod_100"}' },
      { key: 'pay_wechat_env', label: '环境(0现网/1沙箱)', type: 'number', desc: '缺省沙箱；切现网前确认 OfferID/AppKey/道具已发布' },
      { key: 'pay_wechat_push_token', label: '消息推送Token', type: 'text', desc: 'MP后台发货推送 URL 验证用' },
      { key: 'pay_wechat_notify_url', label: '发货推送URL', type: 'text', desc: 'https://域名/api/points/recharge/notify/wechat' },
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
      { key: 'pay_waffo_private_key', label: 'RSA私钥(PEM/Base64)', type: 'text' },
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
    const next = {};
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
        next[f.key] = v;
      }
    }
    draft.value = next;
    original.value = { ...next };
  } catch (e) {
    toast.error(e.message);
  } finally {
    loading.value = false;
  }
}

function askSave() {
  saveOpen.value = true;
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
          continue;
        }
        if (isSensitive(f.key) && (v === '******' || v === original.value[f.key] && original.value[f.key] === '******')) {
          continue;
        }
        if (isSensitive(f.key) && (!v || String(v).trim() === '')) continue;
        if (f.type === 'number') {
          let n = Number(v);
          if (PERCENT_KEYS.includes(f.key) && !Number.isNaN(n)) n = n / 100;
          payload[f.key] = Number.isNaN(n) ? 0 : n;
        } else {
          payload[f.key] = v === null || v === undefined ? '' : String(v);
        }
      }
    }
    await adminApi.updateConfig(payload);
    toast.success('保存成功');
    fetchList();
  } catch (e) {
    toast.error(e.message);
  } finally {
    saving.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.group { padding: 18px; margin-bottom: 16px; }
.group h2 { margin: 0 0 14px; font-size: 15px; }
.fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.cfg-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.key { font-size: 11px; color: var(--color-muted-fg); }
.switch { display: flex; align-items: center; gap: 8px; height: 36px; }
</style>
