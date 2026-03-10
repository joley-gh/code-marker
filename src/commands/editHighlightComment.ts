import * as vscode from 'vscode';
import { HighlightStorage } from '../storage';
import { applyDecorations } from '../decorations';
import { getHighlightInfo } from '../highlightManager';

export function registerEditHighlightComment(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'code-marker.editHighlightComment',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Please open a file first');
        return;
      }

      const wf = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (!wf) {
        vscode.window.showInformationMessage('File must be inside a workspace folder');
        return;
      }

      const highlights = await HighlightStorage.readFileHighlights(wf, editor.document.uri.toString());
      
      const position = editor.selection.active;
      const offset = editor.document.offsetAt(position);
      
      const highlightInfo = getHighlightInfo(editor.document.getText(), offset, highlights.map(h => ({
        id: h.id,
        start: h.position.start,
        end: h.position.end,
        text: h.text
      })));
      
      if (!highlightInfo) {
        vscode.window.showInformationMessage('Cursor is not on a highlight');
        return;
      }

      const highlight = highlights.find(h => h.id === highlightInfo.highlightId);
      if (!highlight) return;

      const comment = await vscode.window.showInputBox({
        prompt: 'Edit comment for this highlight',
        placeHolder: 'Enter comment (press Enter to remove)',
        value: highlight.comment || '',
        validateInput: v => v.length > 100 ? 'Comment must be 100 characters or less' : null,
      });

      if (comment === undefined) return;

      const updatedHighlight = {
        ...highlight,
        comment: comment.trim() || undefined
      };

      const updatedHighlights = highlights.map(h => 
        h.id === highlight.id ? updatedHighlight : h
      );

      await HighlightStorage.saveFileHighlights(wf, editor.document.uri.toString(), updatedHighlights);
      applyDecorations(editor, updatedHighlights);
      vscode.window.showInformationMessage('Comment updated');
    }
  );

  context.subscriptions.push(disposable);
}
