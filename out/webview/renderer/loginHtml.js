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
exports.renderLoginHtml = renderLoginHtml;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constant_1 = require("../../util/constant");
function renderLoginHtml(webview, extensionUri, nonce, csp, username, password, rememberMe) {
    const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'html', 'login.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/\{\{NONCE\}\}/g, nonce);
    html = html.replace(/\{\{CSP\}\}/g, csp);
    let url = new URL(constant_1.Constant.DEFAULT_BASE_URL);
    try {
        url = new URL(process.env.BASE_URL || '');
    }
    catch (e) {
        console.error('Invalid BASE_URL:', e);
    }
    html = html.replace(/\{\{connectedServer\}\}/g, url.hostname);
    html = html.replace(/\{\{username\}\}/g, username);
    html = html.replace(/\{\{password\}\}/g, password);
    html = html.replace(/\{\{checkStatus\}\}/g, rememberMe == 'true' ? 'checked' : '');
    return html;
}
//# sourceMappingURL=loginHtml.js.map