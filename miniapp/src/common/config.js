/**
 * 全局配置
 * 生产环境通过 #ifdef MP-WEIXIN 编译注入或直接修改此文件
 * API 基址支持 VITE_API_BASE / VITE_DEV_API_BASE 环境变量注入（vite 构建时静态替换），
 * 避免上线前手改源码；未注入时使用默认值
 */
const PROD_API_BASE = import.meta.env.VITE_API_BASE || 'https://api.example.com/api';
const DEV_API_BASE = import.meta.env.VITE_DEV_API_BASE || 'http://127.0.0.1:3001/api';

// 单声明 + 条件编译裁剪：
// - H5：浏览器端走同源相对路径，由 vite devServer 代理转发到后端，避免跨域与 mixed content
// - 小程序：使用 DEV_API_BASE（本地联调）或 VITE_API_BASE 注入的正式域名
// ⅠIFE 结构在未处理条件编译的纯 vite/jsdom 环境下也是合法 JS（首个 return 生效，即 H5 语义）
export const API_BASE = (() => {
  // #ifdef H5
  return '/api';
  // #endif
  // #ifndef H5
  return DEV_API_BASE;
  // #endif
})();

export const UPLOAD_BASE = API_BASE.replace(/\/api$/, '');

export const REQUEST_TIMEOUT = 15000;

export const APP_NAME = '商机互助';