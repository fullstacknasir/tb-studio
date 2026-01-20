# TB-Studio

**TB-Studio** powered VS Code extension to log in, fetch widgets, and sync local widget sources (HTML/JS/CSS) with the server.

## Features

- **TB Studio View**: Side bar view for login/logout (`tbStudioView`).
- **One-key Sync**: `tb-studio: Update Local & Server` command updates:
  - Saves the active editor file
  - Reads the widget folder (JSON + HTML + JS + CSS)
  - Injects latest sources into the widget JSON
  - Uploads to server and writes back `raw.json`

## How it works (flow)

1. Open a widget file inside its folder (which contains `raw.json` or another `.json`, plus `.html`, `.js`, `.css`).
2. Open **TB-Studio** view from the Activity Bar and log in.
3. Run the command **TB-Studio: Update Local & Server”**.
4. The command:
   - Saves current document
   - Reads files in the same folder
   - Updates JSON descriptor with latest HTML/JS/CSS
   - Calls server API to save the widget
   - Writes server response to `raw.json`

## Activation

This extension activates on:
- Opening the view: `onView:tbStudioView`
- Running the command: `onCommand:tbStudioView.updateLocalAndServer`

## Commands

- `TB-Studio: Update Local & Server` — updates local widget files and pushes to server.

## View

- **Container**: `TB-Studio` (Activity Bar)
- **View ID**: `tbStudioView`

## Requirements

- VS Code `^1.104.0`
- Network access to Thingsboard backend
- Valid credentials (login via sidebar)

## Extension Settings

_No custom settings yet._

## Keybindings

Default:
- Windows/Linux: `Ctrl+U`
- macOS: `Cmd+U`

> If you prefer another keybinding, change it from **File → Preferences → Keyboard Shortcuts**.

## Known Issues

- If the widget folder does not have all required files (JSON/HTML/JS/CSS), the update will fail with an error message.
- If not logged in, the command will prompt you to open the synCross view and log in first.

## Troubleshooting

- **Extension not activating**: Ensure the view id `tbStudioView` matches in both code and `package.json`.
- **'Cannot find module' at runtime**: Make sure `node_modules/` is included in the .vsix (don’t exclude it in `.vscodeignore` if you’re not bundling).
- **`vsce package` failing**: Ensure `publisher` is set
