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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const TbStudioWebviewProvider_1 = require("./webview/TbStudioWebviewProvider");
const updateLocalAndServer_1 = require("./commands/updateLocalAndServer");
const createEnvFromHost_1 = require("./commands/createEnvFromHost");
const autoCompletion_1 = require("./commands/autoCompletion");
let providerRegistered = false;
function activate(context) {
    if (!providerRegistered) {
        const provider = new TbStudioWebviewProvider_1.TbStudioWebviewProvider(context);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(TbStudioWebviewProvider_1.TbStudioWebviewProvider.viewType, provider, { webviewOptions: { retainContextWhenHidden: true } }));
        providerRegistered = true;
    }
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'tb-studio.updateLocalAndServer'; // triggers the same function
    statusBarItem.text = `$(cloud-upload) Save Code`;
    statusBarItem.tooltip = "Save code to server (Ctrl+U)";
    statusBarItem.show();
    // Register command to create environment from host
    context.subscriptions.push(vscode.commands.registerCommand('tb-studio.createEnvFromHost', async () => {
        (0, createEnvFromHost_1.createEnvFromHost)();
    }));
    // Register Ctrl+U command to update local and server widget
    context.subscriptions.push(vscode.commands.registerCommand("tb-studio.updateLocalAndServer", async () => {
        await (0, updateLocalAndServer_1.updateLocalAndServer)(context, statusBarItem);
    }));
    // Register auto-completion provider
    (0, autoCompletion_1.loadSuggestions)(context);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(autoCompletion_1.selector, autoCompletion_1.provider2, ...autoCompletion_1.triggers));
    // watch JSON file for changes and reload
    const jsonPath = path.join(context.extensionPath, 'snippets', 'ace_auto_completion_suggestion.merged.json');
    try {
        const watcher = fs.watch(jsonPath, () => {
            (0, autoCompletion_1.loadSuggestions)(context);
        });
        context.subscriptions.push({ dispose: () => watcher.close() });
    }
    catch (e) { }
    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.isDirty) {
            statusBarItem.text = `$(cloud-upload) * Save Code`; // indicate change
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        else {
            statusBarItem.text = `$(cloud-upload) Save Code`;
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.foreground');
            statusBarItem.backgroundColor = undefined;
        }
    });
    context.subscriptions.push(statusBarItem);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map