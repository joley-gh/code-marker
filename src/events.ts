import * as vscode from 'vscode';
import { HighlightStorage } from './storage';
import { adjustHighlightsForChanges, HighlightItem } from './highlightManager';
import { applyDecorations, refreshDecorationsForEditor } from './decorations';

/**
 * Document text snapshot taken just before each edit.
 * Keyed by URI string. Used to supply the "old" text to the highlight
 * adjustment logic.
 */
const documentTextCache = new Map<string, string>();

/** Seeds the cache for a document that is already open. */
function seedCache(doc: vscode.TextDocument): void {
  documentTextCache.set(doc.uri.toString(), doc.getText());
}

/**
 * Registers all workspace / editor event listeners and pushes them onto
 * context.subscriptions so they are disposed when the extension deactivates.
 */
export function registerEvents(context: vscode.ExtensionContext): void {

  // Seed the cache for every document that is already open at activation time.
  vscode.workspace.textDocuments.forEach(seedCache);

  // ── New document opened ──────────────────────────────────────────────────
  const onOpen = vscode.workspace.onDidOpenTextDocument(seedCache);

  // ── Active editor switched ───────────────────────────────────────────────
  const onEditorChange = vscode.window.onDidChangeActiveTextEditor(async editor => {
    if (!editor) return;
    seedCache(editor.document);
    await refreshDecorationsForEditor(editor);
  });

  // ── Visible editors changed (e.g. split pane, window reload) ────────────
  const onVisibleChange = vscode.window.onDidChangeVisibleTextEditors(async editors => {
    for (const editor of editors) {
      seedCache(editor.document);
      await refreshDecorationsForEditor(editor);
    }
  });

  // ── Text changed — delta-based highlight position update ─────────────────
  //
  // onDidChangeTextDocument fires after the edit; event.document already
  // contains the new text. The old text is retrieved from documentTextCache
  // (seeded at open / editor-switch time).
  const onChange = vscode.workspace.onDidChangeTextDocument(event => {
    if (event.contentChanges.length === 0) return;

    const uri = event.document.uri.toString();
    documentTextCache.set(uri, event.document.getText());

    const wf = vscode.workspace.getWorkspaceFolder(event.document.uri);
    if (!wf) return;

    HighlightStorage.readFileHighlights(wf, uri)
      .then(highlights => {
        const items: HighlightItem[] = highlights.map(h => ({
          id:    h.id,
          start: h.position.start,
          end:   h.position.end,
          text:  h.text,
        }));

        const updatedItems = adjustHighlightsForChanges(items, event.contentChanges);

        const updatedHighlights = updatedItems.map(item => {
          const original = highlights.find(h => h.id === item.id)!;
          return { ...original, position: { start: item.start, end: item.end } };
        });

        return HighlightStorage.saveFileHighlights(wf, uri, updatedHighlights)
          .then(() => {
            for (const editor of vscode.window.visibleTextEditors) {
              if (editor.document.uri.toString() === uri) {
                applyDecorations(editor, updatedHighlights);
              }
            }
          });
      })
      .catch(err => console.error('Code Marker: error updating highlights on change', err));
  });

  // ── Document saved ───────────────────────────────────────────────────────
  const onSave = vscode.workspace.onDidSaveTextDocument(doc => {
    const editor = vscode.window.visibleTextEditors.find(
      e => e.document.uri.toString() === doc.uri.toString()
    );
    if (editor) {
      refreshDecorationsForEditor(editor).catch(console.error);
    }
  });

  context.subscriptions.push(onOpen, onEditorChange, onVisibleChange, onChange, onSave);
}
