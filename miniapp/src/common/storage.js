/**
 * 本地存储封装：映射 H5 的 localStorage 语义（client/src/api/index.js）
 */
const TOKEN_KEY = 'hof_token';
const USER_KEY = 'hof_user';
const REFRESH_KEY = 'hof_refresh_token';

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

export function getRefreshToken() {
  return uni.getStorageSync(REFRESH_KEY) || '';
}

export function setAuth(token, user, refreshToken) {
  uni.setStorageSync(TOKEN_KEY, token);
  if (user !== undefined && user !== null) {
    uni.setStorageSync(USER_KEY, JSON.stringify(user));
  }
  if (refreshToken) {
    uni.setStorageSync(REFRESH_KEY, refreshToken);
  }
}

export function setTokenAndRefresh(token, refreshToken) {
  uni.setStorageSync(TOKEN_KEY, token);
  if (refreshToken) uni.setStorageSync(REFRESH_KEY, refreshToken);
}

export function getCachedUser() {
  try {
    const raw = uni.getStorageSync(USER_KEY);
    if (!raw) return null;
    return typeof raw === 'object' ? raw : JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearAuth() {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
  uni.removeStorageSync(REFRESH_KEY);
}