import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Constant } from '../../util/constant';
export function renderLoginHtml(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string, csp: string, username: string, password: string, rememberMe:string) {
  const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'html', 'login.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/\{\{NONCE\}\}/g, nonce);
  html = html.replace(/\{\{CSP\}\}/g, csp);
  let url=new URL(Constant.DEFAULT_BASE_URL);
  try{
    url = new URL(process.env.BASE_URL || '');
  }catch(e){ console.error('Invalid BASE_URL:', e); }
  html= html.replace(/\{\{connectedServer\}\}/g, url.hostname);
  html= html.replace(/\{\{username\}\}/g, username);
  html= html.replace(/\{\{password\}\}/g, password);
  html= html.replace(/\{\{checkStatus\}\}/g, rememberMe=='true'?'checked':'');
  return html;
}
 
 