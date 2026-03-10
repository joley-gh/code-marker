import * as vscode from 'vscode';
import { HighlightStorage, Highlight } from './storage';

/**
 * One TextEditorDecorationType per unique colour, lazily created and reused
 * across all editors to avoid leaking resources.
 */
export const decorationCache = new Map<string, vscode.TextEditorDecorationType>();

/** Returns (or lazily creates) a TextEditorDecorationType for a given colour. */
export function getDecorationType(color: string): vscode.TextEditorDecorationType {
  let type = decorationCache.get(color);
  if (!type) {
    type = vscode.window.createTextEditorDecorationType({
      backgroundColor: color,
      borderRadius: '2px',
    });
    decorationCache.set(color, type);
  }
  return type;
}

/**
 * Applies all highlights to an editor, grouped by colour.
 * Colours no longer present in the list are cleared.
 */
export function applyDecorations(editor: vscode.TextEditor, highlights: Highlight[]): void {
  const byColor = new Map<string, vscode.Range[]>();

  for (const h of highlights) {
    const start  = editor.document.positionAt(h.position.start);
    const end    = editor.document.positionAt(h.position.end);
    const ranges = byColor.get(h.color) ?? [];
    ranges.push(new vscode.Range(start, end));
    byColor.set(h.color, ranges);
  }

  // Clear decoration types that have no ranges in this pass.
  for (const [color, type] of decorationCache) {
    if (!byColor.has(color)) {
      editor.setDecorations(type, []);
    }
  }

  for (const [color, ranges] of byColor) {
    editor.setDecorations(getDecorationType(color), ranges);
  }
}

/** Reads highlights from disk and re-applies decorations for an editor. */
export async function refreshDecorationsForEditor(editor: vscode.TextEditor): Promise<void> {
  const wf = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  if (!wf) return;
  const highlights = await HighlightStorage.readFileHighlights(wf, editor.document.uri.toString());
  applyDecorations(editor, highlights);
}

/** Disposes all cached decoration types (call on deactivate). */
export function disposeDecorations(): void {
  decorationCache.forEach(t => t.dispose());
  decorationCache.clear();
}
