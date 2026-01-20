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
exports.provider2 = exports.selector = exports.triggers = void 0;
exports.loadSuggestions = loadSuggestions;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let suggestions = [];
exports.triggers = [':', '.', '-', '_', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
exports.selector = [
    { language: 'javascript', scheme: 'file' },
    { language: 'javascriptreact', scheme: 'file' },
    { language: 'html', scheme: 'file' },
    { scheme: 'file', pattern: '**/*.html' },
    { scheme: 'file', pattern: '**/*.htm' }
];
function loadSuggestions(context) {
    try {
        const filePath = path.join(context.extensionPath, 'snippets', 'ace_auto_completion_suggestion.merged.json');
        const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
        const arr = JSON.parse(raw);
        suggestions = Array.isArray(arr) ? arr : [];
    }
    catch (e) {
        console.error('Failed to load suggestions', e);
        suggestions = [];
    }
}
exports.provider2 = {
    provideCompletionItems(document, position) {
        // capture the token/fragment at cursor (letters, numbers, underscore, colon, dot, dash)
        const wordRange = document.getWordRangeAtPosition(position, /[\w:\.\-]+/);
        const fragment = wordRange ? document.getText(wordRange) : '';
        if (!fragment || fragment.length < 1) {
            return null;
        }
        const lowerFrag = fragment.toLowerCase();
        const items = [];
        for (const s of suggestions) {
            const caption = (s.caption ?? s.value ?? '').toString();
            const snippetText = (s.snippet ?? s.value ?? '').toString();
            // searchable string includes caption and snippet
            const searchable = (caption + ' ' + snippetText).toLowerCase();
            if (!searchable.includes(lowerFrag))
                continue;
            // Display label: strip leading "sc:" if present to make the list cleaner
            const displayLabel = caption.replace(/^sc:/i, '') || caption || snippetText;
            const ci = new vscode.CompletionItem(displayLabel, vscode.CompletionItemKind.Snippet);
            // IMPORTANT: set insertText as a SnippetString (so ${1} placeholders work)
            ci.insertText = new vscode.SnippetString(snippetText);
            // Set documentation / detail
            ci.detail = s.meta ?? 'TB-Studio snippet';
            if (s.docHTML) {
                const md = new vscode.MarkdownString(s.docHTML.replace(/<hr>/g, '\n---\n'));
                md.isTrusted = true;
                ci.documentation = md;
            }
            // Make sure accepting the item replaces the whole fragment (so "sc:token" is removed)
            // VS Code supports CompletionItem.range (either a Range or {insert:start,end})
            // We'll replace the exact wordRange we found (start..position)
            if (wordRange) {
                // ensure range extends to the current cursor position (position may be inside wordRange)
                const replaceRange = new vscode.Range(wordRange.start, position);
                // `range` property can be set to a Range or CompletionItemInsertReplaceRange for newer APIs,
                // but Range is widely supported in current VS Code API for simple replace use-case.
                // This ensures the typed 'sc:token' will be replaced by the snippet when accepted.
                ci.range = replaceRange;
            }
            // To help filtering/sorting (so typing sc:token still matches even though label doesn't contain sc:)
            // we set filterText to the original caption (so filter uses caption for matches)
            ci.filterText = caption;
            // Optionally set sortText to push suggestions that start with fragment to top
            const starts = caption.toLowerCase().startsWith(lowerFrag) ? '0' : '1';
            ci.sortText = starts + displayLabel;
            items.push(ci);
        }
        // Optional final sort by sortText already set — but ensure deterministic order
        items.sort((a, b) => (a.sortText ?? '').localeCompare(b.sortText ?? ''));
        return items;
    },
    resolveCompletionItem(item) {
        return item;
    }
};
//# sourceMappingURL=autoCompletion.js.map