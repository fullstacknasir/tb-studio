import * as vscode from "vscode";
import { env } from "../env";
import { Constant } from "../util/constant";

let url = new URL(Constant.DEFAULT_BASE_URL);
try{
  url=new URL(env().BASE_URL || "");
} catch (e) {
  console.error('Invalid BASE_URL:', e);
}
const KEYS = {
  USERNAME: url.hostname+".username",
  PASSWORD: url.hostname+".password",
  ACCESS_TOKEN: url.hostname+".token",
  REFRESH_TOKEN: url.hostname+".refreshToken",
  EXPIRE_AT: url.hostname+".expireAt",
  REMEMBER_ME: url.hostname+".rememberMe"
} as const;

export const Credentials = {
  keys: KEYS,
  async getUsername(ctx: vscode.ExtensionContext) {
    return (await ctx.secrets.get(KEYS.USERNAME)) ?? "";
  },
  async getPassword(ctx: vscode.ExtensionContext){
    return (await ctx.secrets.get(KEYS.PASSWORD))??"";
  },
  async getRememberMe(ctx: vscode.ExtensionContext){
    return (await ctx.secrets.get(KEYS.REMEMBER_ME))??'false';
  },
  async getAccessToken(ctx: vscode.ExtensionContext) {
    return (await ctx.secrets.get(KEYS.ACCESS_TOKEN)) ?? "";
  },
  async getRefreshToken(ctx: vscode.ExtensionContext) {
    return (await ctx.secrets.get(KEYS.REFRESH_TOKEN)) ?? "";
  },
  async getExpireAt(ctx: vscode.ExtensionContext) {
    return (await ctx.secrets.get(KEYS.EXPIRE_AT))??"";
  },
  async setRememberMe(ctx: vscode.ExtensionContext, remember: boolean, password: string) {
    await ctx.secrets.store(KEYS.REMEMBER_ME, remember ? "true" : "false");
    await ctx.secrets.store(KEYS.PASSWORD, password);
  },
  async setLogin(ctx: vscode.ExtensionContext, username: string, accessToken: string, refreshToken: string) {
    await ctx.secrets.store(KEYS.USERNAME, username);
    await ctx.secrets.store(KEYS.ACCESS_TOKEN, accessToken);
    await ctx.secrets.store(KEYS.REFRESH_TOKEN, refreshToken);
    await ctx.secrets.store(KEYS.EXPIRE_AT, (decodeJwt(accessToken).exp * 1000).toString());
  },
  async clear(ctx: vscode.ExtensionContext) {
    await ctx.secrets.delete(KEYS.ACCESS_TOKEN);
    await ctx.secrets.delete(KEYS.REFRESH_TOKEN);
    await ctx.secrets.delete(KEYS.EXPIRE_AT);
  }
};

function decodeJwt(token: string): any {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonPayload);
}
 