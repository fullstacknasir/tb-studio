import axios from "axios";
import { env } from "../env";
import { Credentials } from "./credentials";
import { decodeJwt, safeDecodeJwt } from "../util/jwt";
import * as vscode from 'vscode';
import { Constant } from "../util/constant";

// Prefer env-var / setting for baseURL. Fallback to localhost for dev.
export const API_BASE_URL = env().BASE_URL || Constant.DEFAULT_BASE_URL; // Use HTTPS in prod

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15_000 });

// Function to update the baseURL of the axios instance
export function updateApiBaseURL() {
  const next = env().BASE_URL || Constant.DEFAULT_BASE_URL;
  api.defaults.baseURL = next;
}

export type LoginResponse = { token: string; refreshToken: string };
export type WidgetBundle = { id: string | { id: string }; name?: string; title?: string; alias?: string; tenantId?: { id: string } };
export type WidgetTypeInfo = { id: string | { id: string }; name: string };


export async function login(username: string, password: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>("/api/auth/login", { username, password });
    return res.data;
}


export async function getWidgetBundles(token: string): Promise<WidgetBundle[]> {
    const res = await api.get<{ data: WidgetBundle[] }>(
        "/api/widgetsBundles",{ 
            params: { pageSize: 500, page: 0,sortProperty: "createdTime",sortOrder: "DESC", tenantOnly: false, fullSearch: false, scadaFirst: false }, 
            headers: { Authorization: `Bearer ${token}` } 
        });
    return res.data.data;
}
export async function getWidgetBundleTypes(token: string, id: string): Promise<WidgetTypeInfo[]> {
    const res = await api.get<{ data: WidgetTypeInfo[] }>(
        "/api/widgetTypesInfos", 
        { 
            params: { pageSize: 100, page: 0, widgetsBundleId: id, fullSearch: false, deprecatedFilter: "ALL" },
            headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
}
export async function getSingleWidget(token: string, id: string): Promise<any> {
    const res = await api.get<any>(
        `/api/widgetType/${id}`, 
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}
export async function saveWidgetType(token: string, widget: any): Promise<any> {   
  return await api.post("/api/widgetType",widget, { headers: { Authorization: `Bearer ${token}` } });
}
export async function checkExpire(context: vscode.ExtensionContext):Promise<boolean>{
    const token = await Credentials.getAccessToken(context);
    if (!token) return false;
    const existingUser = safeDecodeJwt(token);
    if (!existingUser) {
        await Credentials.clear(context);
        return false;
    }
    let authUser = existingUser;
    if (new Date().getTime() <= authUser.exp * 1000 - 6000) return true;
    const refreshToken = await Credentials.getRefreshToken(context);
    if (!refreshToken) {
        await Credentials.clear(context);
        return false;
    }
    try {
        const res = await api.post(`/api/auth/token`, {"refreshToken":refreshToken});
        if (res.status === 200) {
            authUser = decodeJwt(res.data.token);
            Credentials.setLogin(context, authUser.sub ?? "", res.data.token, res.data.refreshToken);
            return true;
        }
    } catch (e) {
        // Fall through to clear credentials.
    }
    await Credentials.clear(context);
    vscode.window.showInformationMessage("Unable to refresh token, please login again.");
    return false;
}
