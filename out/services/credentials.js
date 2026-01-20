"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Credentials = void 0;
const env_1 = require("../env");
const constant_1 = require("../util/constant");
let url = new URL(constant_1.Constant.DEFAULT_BASE_URL);
try {
    url = new URL((0, env_1.env)().BASE_URL || "");
}
catch (e) {
    console.error('Invalid BASE_URL:', e);
}
const KEYS = {
    USERNAME: url.hostname + ".username",
    PASSWORD: url.hostname + ".password",
    ACCESS_TOKEN: url.hostname + ".token",
    REFRESH_TOKEN: url.hostname + ".refreshToken",
    EXPIRE_AT: url.hostname + ".expireAt",
    REMEMBER_ME: url.hostname + ".rememberMe"
};
exports.Credentials = {
    keys: KEYS,
    async getUsername(ctx) {
        return (await ctx.secrets.get(KEYS.USERNAME)) ?? "";
    },
    async getPassword(ctx) {
        return (await ctx.secrets.get(KEYS.PASSWORD)) ?? "";
    },
    async getRememberMe(ctx) {
        return (await ctx.secrets.get(KEYS.REMEMBER_ME)) ?? 'false';
    },
    async getAccessToken(ctx) {
        return (await ctx.secrets.get(KEYS.ACCESS_TOKEN)) ?? "";
    },
    async getRefreshToken(ctx) {
        return (await ctx.secrets.get(KEYS.REFRESH_TOKEN)) ?? "";
    },
    async getExpireAt(ctx) {
        return (await ctx.secrets.get(KEYS.EXPIRE_AT)) ?? "";
    },
    async setRememberMe(ctx, remember, password) {
        await ctx.secrets.store(KEYS.REMEMBER_ME, remember ? "true" : "false");
        await ctx.secrets.store(KEYS.PASSWORD, password);
    },
    async setLogin(ctx, username, accessToken, refreshToken) {
        await ctx.secrets.store(KEYS.USERNAME, username);
        await ctx.secrets.store(KEYS.ACCESS_TOKEN, accessToken);
        await ctx.secrets.store(KEYS.REFRESH_TOKEN, refreshToken);
        await ctx.secrets.store(KEYS.EXPIRE_AT, (decodeJwt(accessToken).exp * 1000).toString());
    },
    async clear(ctx) {
        await ctx.secrets.delete(KEYS.ACCESS_TOKEN);
        await ctx.secrets.delete(KEYS.REFRESH_TOKEN);
        await ctx.secrets.delete(KEYS.EXPIRE_AT);
    }
};
function decodeJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
}
//# sourceMappingURL=credentials.js.map