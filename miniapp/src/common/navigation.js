/**
 * tabBar 页导航辅助
 *
 * 微信小程序限制：uni.navigateTo 不能跳 tabBar 页（can not navigateTo a tabbar page），
 * 必须用 uni.switchTab；而 switchTab 不支持 query 参数，编辑参数会丢。
 *
 * 发布页（/pages/opportunity/publish）是 tabBar 页，从我的/CRM 页跳转需经存储中转：
 * - goPublish()：写入 'new' 指令（新建模式，重置表单）
 * - goPublishEdit(id)：写入商机 id 指令（编辑模式）
 * - publish 页 onShow 里 consumePublishEdit() 一次性消费指令；无指令（用户直接点 tab）保留现场
 */

const PUBLISH_EDIT_KEY = 'publish_edit_id';

export function goPublish() {
  try {
    uni.setStorageSync(PUBLISH_EDIT_KEY, 'new');
  } catch (e) {
    // 存储失败时仍跳转（退化为无指令）
  }
  uni.switchTab({ url: '/pages/opportunity/publish' });
}

export function goPublishEdit(id) {
  try {
    uni.setStorageSync(PUBLISH_EDIT_KEY, String(id));
  } catch (e) {
    // 同上
  }
  uni.switchTab({ url: '/pages/opportunity/publish' });
}

export function consumePublishEdit() {
  try {
    const v = uni.getStorageSync(PUBLISH_EDIT_KEY);
    if (v === '' || v === null || v === undefined) return null;
    uni.removeStorageSync(PUBLISH_EDIT_KEY);
    return String(v);
  } catch (e) {
    return null;
  }
}
