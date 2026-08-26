/**
 * 全局配置
 * 生产环境通过 #ifdef MP-WEIXIN 编译注入或直接修改此文件
 */
// 后端 API 基址：微信小程序合法域名下使用 HTTPS 正式域名；本地联调可指向局域网 IP
const PROD_API_BASE = 'https://api.example.com/api';
const DEV_API_BASE = 'http://127.0.0.1:3001/api';

// #ifdef MP-WEIXIN
export const API_BASE = DEV_API_BASE;
// #endif

// #ifndef MP-WEIXIN
export const API_BASE = DEV_API_BASE;
// #endif

export const UPLOAD_BASE = API_BASE.replace(/\/api$/, '');

export const REQUEST_TIMEOUT = 15000;

export const APP_NAME = '商机互助';