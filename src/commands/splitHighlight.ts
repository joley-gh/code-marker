import * as vscode from 'vscode';
import { HighlightStorage, Highlight } from '../storage';
import { applyDecorations } from '../decorations';

export function registerSplitHighlight(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'code-marker.splitHighlight',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Please open a file first');
        return;
      }

      const { document, selection } = editor;
      const wf = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!wf) return;

      const cursorOffset = document.offsetAt(selection.active);
      const highlights   = await HighlightStorage.readFileHighlights(wf, document.uri.toString());

      // Find the highlight strictly containing the cursor (boundary exclusion
      // prevents an ambiguous split at exactly start or end).
      const target = highlights.find(
        h => h.position.start < cursorOffset && cursorOffset < h.position.end
      );

      if (!target) {
        vscode.window.showInformationMessage(
          'Place the cursor inside a highlight (not at its boundary) to split it'
        );
        return;
      }

      const leftHighlight: Highlight = {
        id:    target.id,
        text:  document.getText(new vscode.Range(
          document.positionAt(target.position.start),
          document.positionAt(cursorOffset)
        )),
        color: target.color,
        position: { start: target.position.start, end: cursorOffset },
      };

      const rightHighlight: Highlight = {
        id:    HighlightStorage.generateId(highlights),
        text:  document.getText(new vscode.Range(
          document.positionAt(cursorOffset),
          document.positionAt(target.position.end)
        )),
        color: target.color,
        position: { start: cursorOffset, end: target.position.end },
      };

      // Persist before the text edit so onChange reads correct boundaries.
      const updated = highlights
        .filter(h => h.id !== target.id)
        .concat([leftHighlight, rightHighlight])
        .sort((a, b) => a.position.start - b.position.start);

      await HighlightStorage.saveFileHighlights(wf, document.uri.toString(), updated);
      applyDecorations(editor, updated);

      // Insert two spaces; onChange will shift the right half +2 automatically.
      await editor.edit(eb => eb.insert(selection.active, '  '));

      // Park the cursor between the two spaces.
      const gapPos = document.positionAt(cursorOffset + 1);
      editor.selection = new vscode.Selection(gapPos, gapPos);
    }
  );

  context.subscriptions.push(disposable);
}
