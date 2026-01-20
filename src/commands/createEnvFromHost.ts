import * as vscode from "vscode";
import * as os from 'os';
import * as fs from 'fs';
import * as path from "path";
import { Constant } from "../util/constant";
export async function createEnvFromHost(){
    const hostsFilePath = os.platform() === 'win32' ? Constant.WIN_HOSTS_PATH : Constant.UNIX_HOSTS_PATH;
    
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
            if(['localhost', '127.0.0.1', '0.0.0.0'].includes(selectedHost)){
                selectedHost='http://'+selectedHost+':8080';
            }else if(selectedHost.startsWith('dev-')) {
                selectedHost='https://'+selectedHost+':448';
            }else{
                selectedHost='https://'+selectedHost;
            }
            if (workspaceDir) {
                // Create a .env file with BASE_URL
                const envFilePath = path.join(workspaceDir, '.env');
                const envContent = `BASE_URL=${selectedHost}\n`;

                fs.writeFileSync(envFilePath, envContent, 'utf-8');
                vscode.window.showInformationMessage(`.env file created with BASE_URL=${selectedHost}`);
            } else {
                vscode.window.showErrorMessage('No workspace folder is open.');
            }
        }
    } catch (err:any) {
        vscode.window.showErrorMessage('Error reading hosts file: ' + err.message);
    }
}

function parseHostsFile(hostsFile: string): string[] {
    // Parse the hosts file to extract host entries
    const lines = hostsFile.split('\n');
    const hostEntries: string[] = [];

    for (const line of lines) {
        const cleanLine = line.trim();
        // Only consider lines with an IP and a hostname (ignore comments)
        if (cleanLine && !cleanLine.startsWith('#')) {
            const parts = cleanLine.split(/\s+/);
            if (parts.length >= 2) hostEntries.push(parts[1]); // Just grab the hostname
        }
    }
    return hostEntries;
}