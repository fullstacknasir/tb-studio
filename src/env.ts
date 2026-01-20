import * as vscode from "vscode";
import * as dotenv from 'dotenv';
import * as path from 'path';

export function env(){
    const folder = vscode.workspace.workspaceFolders?.[0];
    if(!folder) {
        vscode.window.showErrorMessage("Please open a folder first to save the widget files.");
    }else{
        dotenv.config({ path: path.join(folder.uri.fsPath, '.env') });
    }
    return process.env;
}
export function reloadEnv(){  //new function to reload .env file  
    const folder = vscode.workspace.workspaceFolders?.[0];
    if(!folder) {
        vscode.window.showErrorMessage("Please open a folder first to save the widget files.");
    }else{
        dotenv.config({ path: path.join(folder.uri.fsPath, '.env'), override: true });
        vscode.window.showInformationMessage(".env file reloaded.");
    }
}