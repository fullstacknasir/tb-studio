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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLocalAndServer = updateLocalAndServer;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const api_1 = require("../services/api");
const credentials_1 = require("../services/credentials");
const REQUIRED_EXTENSIONS = {
    html: '.html',
    js: '.js',
    css: '.css'
};
/**
 * Saves the active editor document, reads the widget folder (JSON + HTML/JS/CSS),
 * injects latest sources into the widget JSON, and uploads to the server.
 */
async function updateLocalAndServer(context, statusBarItem) {
    if (await (0, api_1.checkExpire)(context)) {
        // Checking if there is any active text editor pointed to any file or not
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("Open a widget HTML/JS/CSS file first.");
            return;
        }
        const folderPath = path.dirname(editor.document.uri.fsPath);
        const dirUri = vscode.Uri.file(folderPath);
        /* ---------------- VALIDATION & SAVE ---------------- */
        const validation = await validateAndSaveWorkspaceFiles(folderPath);
        if (!validation.ok) {
            showStatusError(statusBarItem, validation.message);
            vscode.window.showErrorMessage(validation.message);
            return;
        }
        /* ---------------- LOAD FILES ---------------- */
        let widgetFiles;
        try {
            widgetFiles = await loadWidgetFiles(dirUri);
        }
        catch (err) {
            vscode.window.showErrorMessage(err.message);
            return;
        }
        /* ---------------- PARSE & INJECT ---------------- */
        let widget;
        try {
            widget = JSON.parse(widgetFiles.json);
        }
        catch {
            vscode.window.showErrorMessage("Invalid widget JSON.");
            return;
        }
        widget.descriptor ?? (widget.descriptor = {});
        widget.descriptor.templateHtml = widgetFiles.html;
        widget.descriptor.controllerScript = widgetFiles.js;
        widget.descriptor.templateCss = widgetFiles.css;
        /* ---------------- AUTH ---------------- */
        const token = await resolveAccessToken(context);
        if (!token) {
            vscode.window.showErrorMessage("Not logged in! Please log in first.");
            return;
        }
        /* ---------------- UPLOAD ---------------- */
        try {
            setStatusLoading(statusBarItem);
            const response = await (0, api_1.saveWidgetType)(token, widget);
            await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dirUri, 'raw.json'), Buffer.from(JSON.stringify(response.data, null, 2), 'utf8'));
            setStatusSuccess(statusBarItem);
            vscode.window.showInformationMessage("Widget updated locally and on server.");
        }
        catch (e) {
            const msg = e?.response?.data?.message ?? e?.message ?? "Unknown error";
            vscode.window.showErrorMessage(`Server update failed: ${msg}`);
            showStatusError(statusBarItem, `Server update failed: ${msg}`);
        }
    }
}
/* ===================== HELPERS ===================== */
async function validateAndSaveWorkspaceFiles(widgetDir) {
    for (const doc of vscode.workspace.textDocuments) {
        if (path.dirname(doc.uri.fsPath) !== widgetDir)
            continue;
        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const error = diagnostics.find(d => d.severity === vscode.DiagnosticSeverity.Error);
        if (error)
            return { ok: false, message: `${path.basename(doc.uri.fsPath)} → ${error.message} (Line ${error.range.start.line})` };
        if (doc.isDirty && path.basename(doc.uri.fsPath) !== 'raw.json')
            await doc.save();
    }
    return { ok: true };
}
async function loadWidgetFiles(dirUri) {
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    const names = entries.map(([n]) => n);
    const jsonName = names.find(n => n.toLowerCase() === 'raw.json') ??
        names.find(n => n.toLowerCase().endsWith('.json'));
    const htmlName = names.find(n => n.endsWith(REQUIRED_EXTENSIONS.html));
    const jsName = names.find(n => n.endsWith(REQUIRED_EXTENSIONS.js));
    const cssName = names.find(n => n.endsWith(REQUIRED_EXTENSIONS.css));
    if (!jsonName || !htmlName || !jsName || !cssName) {
        throw new Error("Expected JSON + .html + .js + .css in the widget folder.");
    }
    const [json, html, js, css] = await Promise.all([
        readFile(dirUri, jsonName),
        readFile(dirUri, htmlName),
        readFile(dirUri, jsName),
        readFile(dirUri, cssName),
    ]);
    return { json, html, js, css };
}
async function readFile(dirUri, name) {
    const buf = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dirUri, name));
    return Buffer.from(buf).toString('utf8');
}
async function resolveAccessToken(context) {
    if (credentials_1.Credentials?.getAccessToken) {
        return credentials_1.Credentials.getAccessToken(context);
    }
    if (typeof credentials_1.Credentials === 'function') {
        try {
            return new credentials_1.Credentials(context).getAccessToken?.();
        }
        catch {
            return undefined;
        }
    }
    return undefined;
}
/* ===================== STATUS BAR ===================== */
function setStatusLoading(item) {
    item.text = `$(sync~spin) Saving...`;
    item.command = undefined;
    item.show();
}
function setStatusSuccess(item) {
    item.text = `$(check) Saved successfully`;
    setTimeout(() => resetStatus(item), 2000);
}
function showStatusError(item, message) {
    item.text = `$(error) ${message}`;
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    item.show();
    setTimeout(() => {
        item.backgroundColor = undefined;
        resetStatus(item);
    }, 2500);
}
function resetStatus(item) {
    item.text = `$(cloud-upload) Save Code`;
    item.command = 'tb-studio.updateLocalAndServer';
}
//# sourceMappingURL=updateLocalAndServer.js.map