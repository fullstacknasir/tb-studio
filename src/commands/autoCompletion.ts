import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Suggestion } from '../types/message';

let suggestions: Suggestion[] = [];
export const triggers = [':','.','-','_','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

export const selector: vscode.DocumentSelector = [
    { language: 'javascript', scheme: 'file' },
    { language: 'javascriptreact', scheme: 'file' },
    { language: 'html', scheme: 'file' },
    { scheme: 'file', pattern: '**/*.html' },
    { scheme: 'file', pattern: '**/*.htm' }
];

export function loadSuggestions(context: vscode.ExtensionContext) {
  try {
    const filePath = path.join(context.extensionPath, 'snippets', 'ace_auto_completion_suggestion.merged.json');
    const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
    const arr = JSON.parse(raw);
    suggestions = Array.isArray(arr) ? (arr as Suggestion[]) : [];
  } catch (e) {
    console.error('Failed to load suggestions', e);
    suggestions = [];
  }
}
export const provider2: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
      // capture the token/fragment at cursor (letters, numbers, underscore, colon, dot, dash)
      const wordRange = document.getWordRangeAtPosition(position, /[\w:\.\-]+/);
      const fragment = wordRange ? document.getText(wordRange) : '';

      if (!fragment || fragment.length < 1) {
        return null;
      }
      const lowerFrag = fragment.toLowerCase();

      const items: vscode.CompletionItem[] = [];
      for (const s of suggestions) {
        const caption = (s.caption ?? s.value ?? '').toString();
        const snippetText = (s.snippet ?? s.value ?? '').toString();

        // searchable string includes caption and snippet
        const searchable = (caption + ' ' + snippetText).toLowerCase();

        if (!searchable.includes(lowerFrag)) continue;

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
          (ci as any).range = replaceRange;
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

    resolveCompletionItem(item: vscode.CompletionItem) {
      return item;
    }
  };