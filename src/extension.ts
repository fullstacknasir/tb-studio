
import * as vscode from "vscode";
import * as path from "path";
import * as fs from 'fs';
import { TbStudioWebviewProvider } from "./webview/TbStudioWebviewProvider";
import { updateLocalAndServer } from "./commands/updateLocalAndServer";
import { createEnvFromHost } from "./commands/createEnvFromHost";
import { loadSuggestions, provider2, selector, triggers } from "./commands/autoCompletion";

let providerRegistered = false;

export function activate(context: vscode.ExtensionContext) {
   if (!providerRegistered) {
    const provider = new TbStudioWebviewProvider(context);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(TbStudioWebviewProvider.viewType, provider, { webviewOptions: { retainContextWhenHidden: true } })
    );
    providerRegistered = true;
  }
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  
  statusBarItem.command = 'tb-studio.updateLocalAndServer'; // triggers the same function
  statusBarItem.text = `$(cloud-upload) Save Code`;
  statusBarItem.tooltip = "Save code to server (Ctrl+U)";
  statusBarItem.show();
  // Register command to create environment from host
  context.subscriptions.push(vscode.commands.registerCommand('tb-studio.createEnvFromHost', async () => {
    createEnvFromHost();
  }));
  // Register Ctrl+U command to update local and server widget
  context.subscriptions.push(
    vscode.commands.registerCommand("tb-studio.updateLocalAndServer", async () => {
      await updateLocalAndServer(context, statusBarItem);
    })
  );
  // Register auto-completion provider
  loadSuggestions(context);
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(selector, provider2, ...triggers)
  );

  // watch JSON file for changes and reload
  const jsonPath = path.join(context.extensionPath, 'snippets', 'ace_auto_completion_suggestion.merged.json');
  try {
    const watcher = fs.watch(jsonPath, () => { 
      loadSuggestions(context);
    });
    context.subscriptions.push({ dispose: () => watcher.close() });
  } catch (e) { }

  vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.isDirty) {
          statusBarItem.text = `$(cloud-upload) * Save Code`; // indicate change
          statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
          statusBarItem.backgroundColor=new vscode.ThemeColor( 'statusBarItem.warningBackground' );
      } else {
          statusBarItem.text = `$(cloud-upload) Save Code`;
          statusBarItem.color = new vscode.ThemeColor('statusBarItem.foreground');
          statusBarItem.backgroundColor=undefined;
      }
  });

  context.subscriptions.push(statusBarItem);
}

export function deactivate() {}