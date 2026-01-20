import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Constant } from '../../util/constant';
export function renderAppHtml(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string, csp: string, username: string) {
    const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'html', 'app.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace placeholders if you added {{nonce}} in the file
  html = html.replace(/\{\{nonce\}\}/g, nonce);
  html = html.replace(/\{\{CSP\}\}/g, webview.cspSource);
  html = html.replace(/\{\{username\}\}/g, username);
  let url = new URL(Constant.DEFAULT_BASE_URL);
  try{
    url=new URL(process.env.BASE_URL||'');
  }catch(e){ console.error('Invalid BASE_URL:', e); }
  html= html.replace(/\{\{connectedServer\}\}/g, url.hostname);
  return html;
}

 
 