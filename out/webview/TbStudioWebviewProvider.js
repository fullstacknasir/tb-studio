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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TbStudioWebviewProvider_view;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TbStudioWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const message_1 = require("../types/message");
const credentials_1 = require("../services/credentials");
const csp_1 = require("../util/csp");
const loginHtml_1 = require("./renderer/loginHtml");
const appHtml_1 = require("./renderer/appHtml");
const api_1 = require("../services/api");
const logger_1 = require("../util/logger");
const env_1 = require("../env");
const createEnvFromHost_1 = require("../commands/createEnvFromHost");
const settings_1 = require("../util/settings");
const api_2 = require("../services/api");
const constant_1 = require("../util/constant");
const FILE_EXTENSION = {
    html: '.html',
    css: '.css',
    js: '.js',
    json: '.json'
};
class TbStudioWebviewProvider {
    constructor(context) {
        this.context = context;
        _TbStudioWebviewProvider_view.set(this, void 0);
    }
    resolveWebviewView(webviewView) {
        __classPrivateFieldSet(this, _TbStudioWebviewProvider_view, webviewView, "f");
        const { webview } = webviewView;
        webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };
        webview.onDidReceiveMessage((msg) => this.onMessage(msg));
        this.refresh();
    }
    async onMessage(msg) {
        switch (msg.type) {
            case message_1.Type.UPDATE_SETTINGS:
                await (0, settings_1.updateSetting)();
                break;
            case message_1.Type.HOST:
                await (0, createEnvFromHost_1.createEnvFromHost)();
                break;
            case message_1.Type.HOME:
                await this.fetchAndPostWidgets();
                break;
            case message_1.Type.RELOAD:
                (0, env_1.reloadEnv)(); // Reload .env file
                (0, api_2.updateApiBaseURL)(); // Update API base URL
                await this.refresh();
                break;
            case message_1.Type.SUBMIT:
                const { username, password, rememberMe } = msg.payload;
                if (!username || !password)
                    return this.post({ type: message_1.Type.ERROR, message: "Please enter both fields." });
                try {
                    const { token, refreshToken } = await (0, api_1.login)(username, password);
                    await credentials_1.Credentials.setRememberMe(this.context, rememberMe, rememberMe ? password : "");
                    await credentials_1.Credentials.setLogin(this.context, username, token, refreshToken);
                    vscode.window.showInformationMessage("Logged in successfully. Fetching widgets…");
                    await this.refresh();
                    await this.fetchAndPostWidgets();
                }
                catch (e) {
                    vscode.window.showErrorMessage(`Login failed: ${e?.message ?? "Unknown error"}`);
                    this.post({ type: "error", message: "Invalid credentials or server unreachable." });
                }
                break;
            case message_1.Type.LOGOUT:
                await credentials_1.Credentials.clear(this.context);
                vscode.window.showInformationMessage("Logged out.");
                await this.refresh();
                break;
            case message_1.Type.WIDGET_BUNDLE:
                this.fetchWidgetBundleType(msg.payload?.widget);
                break;
            case message_1.Type.WIDGET_BUNDLE_TYPE:
                if (msg.payload && 'widget' in msg.payload) {
                    this.fetchSingleWidget(msg.payload.widget);
                }
                break;
            case message_1.Type.FILE:
                const folder = vscode.workspace.workspaceFolders?.[0];
                if (!folder) {
                    return vscode.window.showErrorMessage("Please open a folder first to save the widget files.");
                }
                const uri = vscode.Uri.joinPath(folder.uri, msg.payload.name);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(msg.payload.content, 'utf8'));
                await vscode.window.showTextDocument(uri);
                // await vscode.workspace.openTextDocument({ content: msg.payload.content, language: msg.payload.name.endsWith('.js') ? 'javascript' : msg.payload.name.endsWith('.css') ? 'css' : 'html' });
                break;
            default:
                logger_1.log.warn("Unknown message", msg);
        }
    }
    async fetchAndPostWidgets() {
        if (await (0, api_1.checkExpire)(this.context)) {
            const token = await credentials_1.Credentials.getAccessToken(this.context);
            if (!token)
                return;
            try {
                const widgets = (await (0, api_1.getWidgets)(token)).filter((w) => w.tenantId?.id !== constant_1.Constant.DEFAULT_TENANT_ID).map((w) => ({ id: w.id ?? cryptoRandomId(), name: w.name }));
                this.post({ type: message_1.Type.WIDGETS, widgets });
            }
            catch (e) {
                this.post({ type: message_1.Type.ERROR, message: e?.message ?? "Failed to fetch widgets." });
            }
        }
        else {
            this.refresh();
        }
    }
    async fetchWidgetBundleType(widgetBundle) {
        if (await (0, api_1.checkExpire)(this.context)) {
            const token = await credentials_1.Credentials.getAccessToken(this.context);
            if (!token)
                return;
            try {
                const widgetBundleTypes = await (0, api_1.getWidgetBundleTypes)(token, widgetBundle.id.id);
                this.post({ type: message_1.Type.WIDGET_BUNDLE_TYPE, payload: { widgets: widgetBundleTypes, displayName: widgetBundle.name } });
            }
            catch (e) {
                this.post({ type: message_1.Type.ERROR, message: e?.message ?? "Failed to fetch widget bundles." });
            }
        }
        else {
            this.refresh();
        }
    }
    async fetchSingleWidget(widget) {
        if (await (0, api_1.checkExpire)(this.context)) {
            const token = await credentials_1.Credentials.getAccessToken(this.context);
            if (!token)
                return;
            try {
                const singleWidget = await (0, api_1.getSingleWidget)(token, widget.id.id);
                let files = [];
                files.push({ name: singleWidget.name + FILE_EXTENSION.html, content: singleWidget.descriptor.templateHtml });
                files.push({ name: singleWidget.name + FILE_EXTENSION.js, content: singleWidget.descriptor.controllerScript });
                files.push({ name: singleWidget.name + FILE_EXTENSION.css, content: singleWidget.descriptor.templateCss });
                // Save files to workspace
                const folder = vscode.workspace.workspaceFolders?.[0];
                if (!folder) {
                    return vscode.window.showErrorMessage("Please open a folder first to save the widget files.");
                }
                const newFolderUri = vscode.Uri.joinPath(folder.uri, singleWidget.name);
                await vscode.workspace.fs.createDirectory(newFolderUri);
                await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(newFolderUri, 'raw.json'), Buffer.from(JSON.stringify(singleWidget, null, 2), 'utf8'));
                for (const file of files) {
                    const uri = vscode.Uri.joinPath(newFolderUri, file.name);
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(file.content, 'utf8'));
                    await vscode.window.showTextDocument(uri);
                }
            }
            catch (e) {
                this.post({ type: message_1.Type.ERROR, message: e?.message ?? "Failed to fetch widget." });
            }
        }
        else {
            this.refresh();
        }
    }
    post(message) {
        __classPrivateFieldGet(this, _TbStudioWebviewProvider_view, "f")?.webview.postMessage(message);
    }
    async refresh() {
        if (!__classPrivateFieldGet(this, _TbStudioWebviewProvider_view, "f"))
            return;
        const username = await credentials_1.Credentials.getUsername(this.context);
        const password = await credentials_1.Credentials.getPassword(this.context);
        const token = await credentials_1.Credentials.getAccessToken(this.context);
        const refresh = await credentials_1.Credentials.getRefreshToken(this.context);
        const rememberMe = await credentials_1.Credentials.getRememberMe(this.context);
        const nonce = (0, csp_1.createNonce)();
        const csp = (0, csp_1.getCsp)(__classPrivateFieldGet(this, _TbStudioWebviewProvider_view, "f").webview, nonce);
        __classPrivateFieldGet(this, _TbStudioWebviewProvider_view, "f").webview.html = token && refresh ? (0, appHtml_1.renderAppHtml)(__classPrivateFieldGet(this, _TbStudioWebviewProvider_view, "f").webview, this.context.extensionUri, nonce, csp, username) : (0, loginHtml_1.renderLoginHtml)(__classPrivateFieldGet(this, _TbStudioWebviewProvider_view, "f").webview, this.context.extensionUri, nonce, csp, username, password, rememberMe);
        if (token && refresh) {
            await this.fetchAndPostWidgets(); // Fetch widgets if logged in
        }
    }
}
exports.TbStudioWebviewProvider = TbStudioWebviewProvider;
_TbStudioWebviewProvider_view = new WeakMap();
TbStudioWebviewProvider.viewType = "tbStudioView";
function cryptoRandomId() {
    const buf = new Uint32Array(2);
    // eslint-disable-next-line no-undef
    return (globalThis.crypto?.getRandomValues?.(buf) && Array.from(buf).map((n) => n.toString(16)).join("")) || `${Date.now()}`;
}
//# sourceMappingURL=TbStudioWebviewProvider.js.map