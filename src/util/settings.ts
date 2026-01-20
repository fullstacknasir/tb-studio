import * as vscode from 'vscode';
export async function updateSetting() {
    const config = vscode.workspace.getConfiguration();
    const existing = config.get<Record<string, boolean>>("files.readonlyInclude") || {};

    // merge your new rule
    const updated = {
        ...existing,
        "**/raw.json": true
    };

    await config.update(
        "files.readonlyInclude",
        updated,
        vscode.ConfigurationTarget.Workspace // writes to .vscode/settings.json
    );
}