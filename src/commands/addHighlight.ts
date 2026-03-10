import * as vscode from 'vscode';
import { HighlightStorage, Highlight } from '../storage';
import { applyDecorations } from '../decorations';
import { PRESET_COLORS } from '../colors';

export function registerAddHighlight(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'code-marker.addHighlight',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Please open a file first');
        return;
      }

      const { document, selection } = editor;

      if (selection.isEmpty) {
        vscode.window.showInformationMessage('Please select some text to highlight');
        return;
      }

      const selectedText = document.getText(selection);

      const wf = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!wf) {
        vscode.window.showInformationMessage('File must be inside a workspace folder');
        return;
      }

      // Build quick-pick list: presets + custom option.
      const pickItems = [
        ...Object.keys(PRESET_COLORS).map(name => ({ label: name })),
        { label: 'Custom...' },
      ];

      const choice = await vscode.window.showQuickPick(pickItems, {
        placeHolder: 'Select a highlight colour',
      });
      if (!choice) return;

      let color: string;
      if (choice.label === 'Custom...') {
        const hex = await vscode.window.showInputBox({
          prompt: 'Enter a background colour in hex (e.g. #FF0000 or #FF000088)',
          placeHolder: '#FF000088',
          validateInput: v =>
            /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(v)
              ? null
              : 'Enter a valid 6- or 8-digit hex colour starting with #',
        });
        if (!hex) return;
        color = hex;
      } else {
        color = PRESET_COLORS[choice.label];
      }

      const comment = await vscode.window.showInputBox({
        prompt: 'Enter an optional comment for this highlight (optional)',
        placeHolder: 'Enter comment (press Enter to skip)',
        validateInput: v => v.length > 100 ? 'Comment must be 100 characters or less' : null,
      });

      const startOffset = document.offsetAt(selection.start);
      const endOffset   = document.offsetAt(selection.end);

      const highlights = await HighlightStorage.readFileHighlights(wf, document.uri.toString());
      const newHighlight: Highlight = {
        id:    HighlightStorage.generateId(highlights),
        text:  selectedText,
        color,
        comment: comment?.trim() || undefined,
        position: { start: startOffset, end: endOffset },
      };
      highlights.push(newHighlight);

      await HighlightStorage.saveFileHighlights(wf, document.uri.toString(), highlights);
      applyDecorations(editor, highlights);
      vscode.window.showInformationMessage('Highlight added');
    }
  );

  context.subscriptions.push(disposable);
}
