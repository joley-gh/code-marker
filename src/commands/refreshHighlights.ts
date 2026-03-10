import * as vscode from 'vscode';
import { refreshDecorationsForEditor } from '../decorations';

export function registerRefreshHighlights(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'code-marker.refreshHighlights',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Please open a file first');
        return;
      }
      await refreshDecorationsForEditor(editor);
      vscode.window.showInformationMessage('Highlights refreshed');
    }
  );

  context.subscriptions.push(disposable);
}
