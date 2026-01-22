import * as vscode from "vscode";
import { InboundMessage, OutboundError, OutboundWidgets, OutboundWidgetBundleTypes, OutboundWidgetBundles, Type, WidgetBundleListItem, WidgetListItem } from "../types/message";
import { Credentials } from "../services/credentials";
import { createNonce, getCsp } from "../util/csp";
import { renderLoginHtml } from "./renderer/loginHtml";
import { renderAppHtml } from "./renderer/appHtml";
import { getWidgetBundleTypes, getWidgetBundles, login, getSingleWidget, checkExpire, WidgetBundle, WidgetTypeInfo } from "../services/api";
import { log } from "../util/logger";
import { reloadEnv } from '../env';
import { createEnvFromHost } from "../commands/createEnvFromHost";
import {updateSetting} from "../util/settings";
import { updateApiBaseURL } from "../services/api";
import { Constant } from "../util/constant";
const FILE_EXTENSION: {html: string, css: string, js:string, json: string}={
  html: '.html',
  css: '.css',
  js: '.js',
  json: '.json'
};
export class TbStudioWebviewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "tbStudioView";

  constructor(private readonly context: vscode.ExtensionContext) {}

  #view?: vscode.WebviewView;
  #bundleCache?: { raw: WidgetBundle[]; list: WidgetBundleListItem[]; fetchedAt: number };
  #bundleTypesCache = new Map<string, { widgets: WidgetListItem[]; fetchedAt: number }>();

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.#view = webviewView;
    const { webview } = webviewView;
    webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri]};
    webview.onDidReceiveMessage((msg: InboundMessage) => this.onMessage(msg));
    this.refresh();
  }

  private async onMessage(msg: InboundMessage) {
    switch (msg.type) {
      case Type.UPDATE_SETTINGS:
        await updateSetting();
        break;
      case Type.HOST:
        await createEnvFromHost();
        break;
      case Type.HOME:
        await this.fetchAndPostWidgets();
        break;
      case Type.WIDGET_BUNDLES:
        await this.fetchAndPostWidgetBundles();
        break;

      case Type.RELOAD:
        reloadEnv();  // Reload .env file
        updateApiBaseURL(); // Update API base URL
        await this.refresh();
        break;

      case Type.SUBMIT:
        const { username, password, rememberMe } = msg.payload;
        if (!username || !password) return this.post({ type: Type.ERROR, message: "Please enter both fields." });
        try {
          const { token, refreshToken } = await login(username, password);
          await Credentials.setRememberMe(this.context, rememberMe, rememberMe ? password : "");
          await Credentials.setLogin(this.context, username, token, refreshToken);
          vscode.window.showInformationMessage("Logged in successfully. Fetching widgets…");
          await this.refresh();
          await this.fetchAndPostWidgets();
        } catch (e: any) {
          vscode.window.showErrorMessage(`Login failed: ${e?.message ?? "Unknown error"}`);
          this.post({ type: "error", message: "Invalid credentials or server unreachable." });
        }
        break;
      case Type.LOGOUT:
        await Credentials.clear(this.context);
        vscode.window.showInformationMessage("Logged out.");
        await this.refresh();
        break;

      case Type.WIDGET_BUNDLE:
        this.fetchWidgetBundleType(msg.payload?.widget);
        break;

      case Type.WIDGET_BUNDLE_TYPE:
        if (msg.payload && 'widget' in msg.payload) {
          this.fetchSingleWidget(msg.payload.widget);
        }
        break;
      
      case Type.FILE:
        const folder = vscode.workspace.workspaceFolders?.[0];
        if(!folder) {return vscode.window.showErrorMessage("Please open a folder first to save the widget files.");}
        const uri = vscode.Uri.joinPath(folder.uri, msg.payload.name);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(msg.payload.content, 'utf8'));
        await vscode.window.showTextDocument(uri);
        // await vscode.workspace.openTextDocument({ content: msg.payload.content, language: msg.payload.name.endsWith('.js') ? 'javascript' : msg.payload.name.endsWith('.css') ? 'css' : 'html' });
        break;

      default:
        log.warn("Unknown message", msg);
    }
  }

  private async fetchAndPostWidgets() {
    if(await checkExpire(this.context)){
      const token = await Credentials.getAccessToken(this.context);
      if (!token) return;
      try {
        const bundles = await this.getCachedBundles(token);
        const bundleIds = bundles.map((bundle) => normalizeId(bundle.id)).filter((id): id is string => Boolean(id));
        const widgetTypeLists = await Promise.all(
          bundleIds.map((bundleId) => this.getCachedWidgetTypes(token, bundleId))
        );
        const widgets = widgetTypeLists.flat();
        const unique = new Map<string, WidgetListItem>();
        widgets.forEach((w) => unique.set(w.id, w));
        this.post<OutboundWidgets>({ type: Type.WIDGETS, widgets: Array.from(unique.values()) });
      } catch (e: any) {
        this.post<OutboundError>({ type: Type.ERROR, message: e?.message ?? "Failed to fetch widgets." });
      }
    }else{
      this.refresh();
    }
  }
  private async fetchAndPostWidgetBundles() {
    if(await checkExpire(this.context)){
      const token = await Credentials.getAccessToken(this.context);
      if (!token) return;
      try {
        const bundles = await this.getCachedBundleList(token);
        this.post<OutboundWidgetBundles>({ type: Type.WIDGET_BUNDLES, bundles });
      } catch (e: any) {
        this.post<OutboundError>({ type: Type.ERROR, message: e?.message ?? "Failed to fetch widget bundles." });
      }
    }else{
      this.refresh();
    }
  }
  private async fetchWidgetBundleType(widgetBundle: WidgetBundleListItem) {
    if(await checkExpire(this.context)){
      const token = await Credentials.getAccessToken(this.context);
      if (!token) return;
      try {
        const widgetBundleId = normalizeId(widgetBundle.id);
        if (!widgetBundleId) return;
        const widgets = await this.getCachedWidgetTypes(token, widgetBundleId);
        this.post<OutboundWidgetBundleTypes>({ type: Type.WIDGET_BUNDLE_TYPE, payload: { widgets, displayName: widgetBundle.name } });
      } catch (e: any) {
        this.post<OutboundError>({ type: Type.ERROR, message: e?.message ?? "Failed to fetch widget bundles." });
      }
    }else{
      this.refresh();
    }
  }
  private async fetchSingleWidget(widget: WidgetListItem) {
    if(await checkExpire(this.context)){
      const token = await Credentials.getAccessToken(this.context);
      if (!token) return;
      try {
        const widgetId = normalizeId(widget.id);
        if (!widgetId) return;
        const singleWidget = await getSingleWidget(token, widgetId);
        let files=[];
        files.push({name: singleWidget.name+FILE_EXTENSION.html, content: singleWidget.descriptor.templateHtml});
        files.push({name: singleWidget.name+FILE_EXTENSION.js, content: singleWidget.descriptor.controllerScript});
        files.push({name: singleWidget.name+FILE_EXTENSION.css, content: singleWidget.descriptor.templateCss});
        // Save files to workspace
        const folder = vscode.workspace.workspaceFolders?.[0];
        if(!folder) {return vscode.window.showErrorMessage("Please open a folder first to save the widget files.");}
        const newFolderUri = vscode.Uri.joinPath(folder.uri, singleWidget.name);
        await vscode.workspace.fs.createDirectory(newFolderUri);
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(newFolderUri, 'raw.json'), Buffer.from(JSON.stringify(singleWidget, null, 2), 'utf8'));
        for (const file of files) {
          const uri = vscode.Uri.joinPath(newFolderUri, file.name);
          await vscode.workspace.fs.writeFile(uri, Buffer.from(file.content, 'utf8'));
          await vscode.window.showTextDocument(uri);
        }
      } catch (e: any) {
        this.post<OutboundError>({ type: Type.ERROR, message: e?.message ?? "Failed to fetch widget." });
      }
    }else{
      this.refresh();
    }
  }

  private post<T>(message: T) {
    this.#view?.webview.postMessage(message);
  }

  private isCacheFresh(fetchedAt: number) {
    return Date.now() - fetchedAt < 60_000;
  }

  private async getCachedBundles(token: string): Promise<WidgetBundle[]> {
    if (this.#bundleCache && this.isCacheFresh(this.#bundleCache.fetchedAt)) {
      return this.#bundleCache.raw;
    }
    const raw = (await getWidgetBundles(token))
      .filter((w: WidgetBundle) => w.tenantId?.id !== Constant.DEFAULT_TENANT_ID);
    const list: WidgetBundleListItem[] = raw.map((w) => ({
      id: normalizeId(w.id) ?? cryptoRandomId(),
      name: w.name ?? w.title ?? "Untitled bundle"
    }));
    this.#bundleCache = { raw, list, fetchedAt: Date.now() };
    return raw;
  }

  private async getCachedBundleList(token: string): Promise<WidgetBundleListItem[]> {
    if (this.#bundleCache && this.isCacheFresh(this.#bundleCache.fetchedAt)) {
      return this.#bundleCache.list;
    }
    await this.getCachedBundles(token);
    return this.#bundleCache?.list ?? [];
  }

  private async getCachedWidgetTypes(token: string, bundleId: string): Promise<WidgetListItem[]> {
    const cached = this.#bundleTypesCache.get(bundleId);
    if (cached && this.isCacheFresh(cached.fetchedAt)) {
      return cached.widgets;
    }
    const widgetBundleTypes = await getWidgetBundleTypes(token, bundleId);
    const widgets: WidgetListItem[] = widgetBundleTypes.map((w: WidgetTypeInfo) => ({
      id: normalizeId(w.id) ?? cryptoRandomId(),
      name: w.name
    }));
    this.#bundleTypesCache.set(bundleId, { widgets, fetchedAt: Date.now() });
    return widgets;
  }

  async refresh() {
    if (!this.#view) return;
    const username = await Credentials.getUsername(this.context);
    const password=await Credentials.getPassword(this.context);
    const token = await Credentials.getAccessToken(this.context);
    const refresh = await Credentials.getRefreshToken(this.context);
    const rememberMe=await Credentials.getRememberMe(this.context);
    const nonce = createNonce();
    const csp = getCsp(this.#view.webview, nonce);

    this.#view.webview.html = token && refresh ? renderAppHtml(this.#view.webview, this.context.extensionUri, nonce, csp, username) : renderLoginHtml(this.#view.webview, this.context.extensionUri, nonce, csp, username, password, rememberMe);
      
    if (token && refresh) {
      await this.fetchAndPostWidgets();    // Fetch widgets if logged in
    }
  }
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const nested = (value as { id?: unknown }).id;
    return typeof nested === "string" ? nested : undefined;
  }
  return undefined;
}

function cryptoRandomId() {
  const buf = new Uint32Array(2);
  // eslint-disable-next-line no-undef
  return (globalThis.crypto?.getRandomValues?.(buf) && Array.from(buf).map((n) => n.toString(16)).join("")) || `${Date.now()}`;
}
