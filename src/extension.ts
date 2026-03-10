import * as vscode from 'vscode';
import { registerAddHighlight }     from './commands/addHighlight';
import { registerRemoveHighlight }  from './commands/removeHighlight';
import { registerSplitHighlight }   from './commands/splitHighlight';
import { registerRefreshHighlights } from './commands/refreshHighlights';
import { registerEvents }           from './events';
import { refreshDecorationsForEditor, disposeDecorations } from './decorations';

export function activate(context: vscode.ExtensionContext): void {
  console.log('Code Marker Extensions is now active!');

  // Register commands.
  registerAddHighlight(context);
  registerRemoveHighlight(context);
  registerSplitHighlight(context);
  registerRefreshHighlights(context);

  // Register workspace / editor event listeners.
  registerEvents(context);

  // Restore decorations for every editor already visible at startup.
  // (Covers window reload where editors are open before activation.)
  for (const editor of vscode.window.visibleTextEditors) {
    refreshDecorationsForEditor(editor).catch(console.error);
  }

  // Ensure decoration types are disposed on deactivation.
  context.subscriptions.push({ dispose: disposeDecorations });
}

export function deactivate(): void {
  disposeDecorations();
}