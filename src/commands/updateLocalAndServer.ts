import * as vscode from 'vscode';
import * as path from 'path';
import { checkExpire, saveWidgetType } from '../services/api';
import { Credentials } from '../services/credentials';

const REQUIRED_EXTENSIONS = {
  html: '.html',
  js: '.js',
  css: '.css'
};
/**
 * Saves the active editor document, reads the widget folder (JSON + HTML/JS/CSS),
 * injects latest sources into the widget JSON, and uploads to the server.
 */
export async function updateLocalAndServer(context: vscode.ExtensionContext, statusBarItem: vscode.StatusBarItem) {
  if(await checkExpire(context)){

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
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  /* ---------------- PARSE & INJECT ---------------- */
  let widget: any;
  try {
    widget = JSON.parse(widgetFiles.json);
  } catch {
    vscode.window.showErrorMessage("Invalid widget JSON.");
    return;
  }

  widget.descriptor ??= {};
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
    const response = await saveWidgetType(token, widget);
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(dirUri, 'raw.json'),
      Buffer.from(JSON.stringify(response.data, null, 2), 'utf8')
    );

    setStatusSuccess(statusBarItem);
    vscode.window.showInformationMessage("Widget updated locally and on server.");

  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? "Unknown error";
    vscode.window.showErrorMessage(`Server update failed: ${msg}`);
    showStatusError(statusBarItem, `Server update failed: ${msg}`);
  }
  }
}

/* ===================== HELPERS ===================== */

async function validateAndSaveWorkspaceFiles(widgetDir: string):Promise<any> {
  for (const doc of vscode.workspace.textDocuments) {
    if (path.dirname(doc.uri.fsPath) !== widgetDir) continue;
    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    const error = diagnostics.find(d => d.severity === vscode.DiagnosticSeverity.Error);
    if (error) return { ok: false, message: `${path.basename(doc.uri.fsPath)} → ${error.message} (Line ${error.range.start.line})`};
    if (doc.isDirty && path.basename(doc.uri.fsPath) !== 'raw.json') await doc.save();
  }
  return { ok: true };
}

async function loadWidgetFiles(dirUri: vscode.Uri) {
  const entries = await vscode.workspace.fs.readDirectory(dirUri);
  const names = entries.map(([n]) => n);

  const jsonName =
    names.find(n => n.toLowerCase() === 'raw.json') ??
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

async function readFile(dirUri: vscode.Uri, name: string): Promise<string> {
  const buf = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dirUri, name));
  return Buffer.from(buf).toString('utf8');
}

async function resolveAccessToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  if ((Credentials as any)?.getAccessToken) {
    return (Credentials as any).getAccessToken(context);
  }

  if (typeof Credentials === 'function') {
    try {
      return new (Credentials as any)(context).getAccessToken?.();
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/* ===================== STATUS BAR ===================== */

function setStatusLoading(item: vscode.StatusBarItem) {
  item.text = `$(sync~spin) Saving...`;
  item.command = undefined;
  item.show();
}

function setStatusSuccess(item: vscode.StatusBarItem) {
  item.text = `$(check) Saved successfully`;
  setTimeout(() => resetStatus(item), 2000);
}

function showStatusError(item: vscode.StatusBarItem, message: string) {
  item.text = `$(error) ${message}`;
  item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  item.show();

  setTimeout(() => {
    item.backgroundColor = undefined;
    resetStatus(item);
  }, 2500);
}

function resetStatus(item: vscode.StatusBarItem) {
  item.text = `$(cloud-upload) Save Code`;
  item.command = 'tb-studio.updateLocalAndServer';
}