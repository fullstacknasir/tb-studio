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
exports.createEnvFromHost = createEnvFromHost;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constant_1 = require("../util/constant");
async function createEnvFromHost() {
    const hostsFilePath = os.platform() === 'win32' ? constant_1.Constant.WIN_HOSTS_PATH : constant_1.Constant.UNIX_HOSTS_PATH;
    // Read the hosts file
    try {
        const hostsFile = fs.readFileSync(hostsFilePath, 'utf-8');
        const hostEntries = parseHostsFile(hostsFile);
        if (hostEntries.length === 0) {
            vscode.window.showInformationMessage('No host entries found.');
            return;
        }
        // Show a quick pick list of host entries
        let selectedHost = await vscode.window.showQuickPick(hostEntries, {
            placeHolder: 'Select a host entry',
        });
        if (selectedHost) {
            // Get current workspace directory
            const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (['localhost', '127.0.0.1', '0.0.0.0'].includes(selectedHost)) {
                selectedHost = 'http://' + selectedHost + ':8080';
            }
            else if (selectedHost.startsWith('dev-')) {
                selectedHost = 'https://' + selectedHost + ':448';
            }
            else {
                selectedHost = 'https://' + selectedHost;
            }
            if (workspaceDir) {
                // Create a .env file with BASE_URL
                const envFilePath = path.join(workspaceDir, '.env');
                const envContent = `BASE_URL=${selectedHost}\n`;
                fs.writeFileSync(envFilePath, envContent, 'utf-8');
                vscode.window.showInformationMessage(`.env file created with BASE_URL=${selectedHost}`);
            }
            else {
                vscode.window.showErrorMessage('No workspace folder is open.');
            }
        }
    }
    catch (err) {
        vscode.window.showErrorMessage('Error reading hosts file: ' + err.message);
    }
}
function parseHostsFile(hostsFile) {
    // Parse the hosts file to extract host entries
    const lines = hostsFile.split('\n');
    const hostEntries = [];
    for (const line of lines) {
        const cleanLine = line.trim();
        // Only consider lines with an IP and a hostname (ignore comments)
        if (cleanLine && !cleanLine.startsWith('#')) {
            const parts = cleanLine.split(/\s+/);
            if (parts.length >= 2)
                hostEntries.push(parts[1]); // Just grab the hostname
        }
    }
    return hostEntries;
}
//# sourceMappingURL=createEnvFromHost.js.map