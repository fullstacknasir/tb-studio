"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.API_BASE_URL = void 0;
exports.updateApiBaseURL = updateApiBaseURL;
exports.login = login;
exports.getWidgets = getWidgets;
exports.getWidgetBundleTypes = getWidgetBundleTypes;
exports.getSingleWidget = getSingleWidget;
exports.saveWidgetType = saveWidgetType;
exports.checkExpire = checkExpire;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../env");
const credentials_1 = require("./credentials");
const vscode = __importStar(require("vscode"));
const constant_1 = require("../util/constant");
// Prefer env-var / setting for baseURL. Fallback to localhost for dev.
exports.API_BASE_URL = (0, env_1.env)().BASE_URL || constant_1.Constant.DEFAULT_BASE_URL; // Use HTTPS in prod
exports.api = axios_1.default.create({ baseURL: exports.API_BASE_URL, timeout: 15000 });
// Function to update the baseURL of the axios instance
function updateApiBaseURL() {
    const next = (0, env_1.env)().BASE_URL || constant_1.Constant.DEFAULT_BASE_URL;
    exports.api.defaults.baseURL = next;
}
async function login(username, password) {
    const res = await exports.api.post("/api/auth/login", { username, password });
    return res.data;
}
async function getWidgets(token) {
    const res = await exports.api.get("/api/widgetsBundles", {
        params: { pageSize: 500, page: 0, sortProperty: "createdTime", sortOrder: "DESC", tenantOnly: false, fullSearch: false, scadaFirst: false },
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.data;
}
async function getWidgetBundleTypes(token, id) {
    const res = await exports.api.get("/api/widgetTypesInfos", {
        params: { pageSize: 100, page: 0, widgetsBundleId: id, fullSearch: false, deprecatedFilter: "ALL" },
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.data;
}
async function getSingleWidget(token, id) {
    const res = await exports.api.get(`/api/widgetType/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
}
async function saveWidgetType(token, widget) {
    return await exports.api.post("/api/widgetType", widget, { headers: { Authorization: `Bearer ${token}` } });
}
async function checkExpire(context) {
    let token = await credentials_1.Credentials.getAccessToken(context);
    let authUser = decodeJwt(token);
    if (new Date().getTime() <= authUser.exp * 1000 - 6000)
        return true;
    let refreshToken = await credentials_1.Credentials.getRefreshToken(context);
    const res = await exports.api.post(`/api/auth/token`, { "refreshToken": refreshToken });
    if (res.status == 200) {
        authUser = decodeJwt(res.data.token);
        credentials_1.Credentials.setLogin(context, authUser.sub, res.data.token, res.data.refreshToken);
        return true;
    }
    else {
        await credentials_1.Credentials.clear(context);
        vscode.window.showInformationMessage("Unable to refresh token, please login again.");
        return false;
    }
}
function decodeJwt(token) {
    if (!token)
        throw new Error("Missing token");
    const parts = token.split('.');
    if (parts.length !== 3)
        throw new Error("Invalid JWT");
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
}
//# sourceMappingURL=api.js.map