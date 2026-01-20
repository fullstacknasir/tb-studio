import * as crypto from "crypto";
import * as vscode from "vscode";


export function createNonce() {
return crypto.randomBytes(16).toString("base64");
}


export function getCsp(webview: vscode.Webview, nonce: string) {
// Tight CSP: scripts only with our nonce; allow images from webview source and data URIs
return [
"default-src 'none'",
`img-src ${webview.cspSource} data:`,
`style-src ${webview.cspSource} 'unsafe-inline'`,
`font-src ${webview.cspSource}`,
`script-src 'nonce-${nonce}'`,
"form-action 'none'"
].join("; ");
}