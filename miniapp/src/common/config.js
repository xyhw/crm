/**
 * 全局配置
 * 生产环境通过 #ifdef MP-WEIXIN 编译注入或直接修改此文件
 */
// 后端 API 基址：微信小程序合法域名下使用 HTTPS 正式域名；本地联调可指向局域网 IP
// TODO 上线前替换为正式域名（需同时在小程序后台配置 request 合法域名），见 miniapp/DEPLOY-CHECKLIST.md
const PROD_API_BASE = 'https://api.example.com/api';
const DEV_API_BASE = 'http://127.0.0.1:3001/api';

// #ifdef H5
// 浏览器端走同源相对路径，由 vite devServer 代理转发到后端，避免跨域与 mixed content
export const API_BASE = '/api';
// #endif

// #ifndef H5
export const API_BASE = DEV_API_BASE;
// #endif

export const UPLOAD_BASE = API_BASE.replace(/\/api$/, '');

export const REQUEST_TIMEOUT = 15000;

export const APP_NAME = '商机互助';