import * as vscode from 'vscode';
import { HighlightStorage, Highlight } from '../storage';
import { applyDecorations } from '../decorations';

export function registerRemoveHighlight(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'code-marker.removeHighlight',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Please open a file first');
        return;
      }

      const { document, selection } = editor;
      const wf = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!wf) return;

      const highlights = await HighlightStorage.readFileHighlights(wf, document.uri.toString());

      // ── No selection: cursor-based removal ───────────────────────────────
      if (selection.isEmpty) {
        const cursorOffset = document.offsetAt(selection.active);
        const filtered = highlights.filter(
          h => !(h.position.start <= cursorOffset && cursorOffset <= h.position.end)
        );
        if (filtered.length === highlights.length) {
          vscode.window.showInformationMessage('No highlight found at cursor position');
          return;
        }
        await HighlightStorage.saveFileHighlights(wf, document.uri.toString(), filtered);
        applyDecorations(editor, filtered);
        vscode.window.showInformationMessage('Highlight removed');
        return;
      }

      // ── With selection: trim / split overlapping highlights ───────────────
      // Rules:
      //  - Selection fully covers a highlight  → remove entirely
      //  - Selection overlaps left side        → trim start to selEnd
      //  - Selection overlaps right side       → trim end to selStart
      //  - Selection entirely inside           → split into two halves
      const selStart = document.offsetAt(selection.start);
      const selEnd   = document.offsetAt(selection.end);

      let changed = false;
      const result: Highlight[] = [];

      for (const h of highlights) {
        const hStart = h.position.start;
        const hEnd   = h.position.end;

        // No overlap → keep untouched.
        if (selEnd <= hStart || selStart >= hEnd) {
          result.push(h);
          continue;
        }

        changed = true;

        // Fully covered → drop.
        if (selStart <= hStart && selEnd >= hEnd) {
          continue;
        }

        // Left overlap → trim start.
        if (selStart <= hStart && selEnd < hEnd) {
          result.push({
            ...h,
            text:     document.getText(new vscode.Range(
              document.positionAt(selEnd), document.positionAt(hEnd)
            )),
            position: { start: selEnd, end: hEnd },
          });
          continue;
        }

        // Right overlap → trim end.
        if (selStart > hStart && selEnd >= hEnd) {
          result.push({
            ...h,
            text:     document.getText(new vscode.Range(
              document.positionAt(hStart), document.positionAt(selStart)
            )),
            position: { start: hStart, end: selStart },
          });
          continue;
        }

        // Selection entirely inside → split.
        result.push({
          ...h,
          text:     document.getText(new vscode.Range(
            document.positionAt(hStart), document.positionAt(selStart)
          )),
          position: { start: hStart, end: selStart },
        });
        result.push({
          id:       HighlightStorage.generateId([...highlights, ...result]),
          color:    h.color,
          text:     document.getText(new vscode.Range(
            document.positionAt(selEnd), document.positionAt(hEnd)
          )),
          position: { start: selEnd, end: hEnd },
        });
      }

      if (!changed) {
        vscode.window.showInformationMessage('No highlight found in selection');
        return;
      }

      result.sort((a, b) => a.position.start - b.position.start);
      await HighlightStorage.saveFileHighlights(wf, document.uri.toString(), result);
      applyDecorations(editor, result);
      vscode.window.showInformationMessage('Highlight updated');
    }
  );

  context.subscriptions.push(disposable);
}
