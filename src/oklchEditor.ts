/* eslint-disable unicorn/require-post-message-target-origin -- VS Code's webview messaging is not Window.postMessage. */
import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { buildOklchEdit, findOklchAtOffset, isPickerColor } from './picker';
import { getConfig } from './config';
import { pickerHtml } from './pickerHtml';

export const registerOklchEditor = (context: vscode.ExtensionContext): vscode.Disposable => {
  let panel: vscode.WebviewPanel | undefined;
  const command = vscode.commands.registerCommand('visualiseOklch.editColor', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !getConfig().enabled) { return; }
    const document = editor.document;
    const position = editor.selection.active;
    // Bound work by characters, including in minified single-line documents.
    const cursorOffset = document.offsetAt(position);
    const start = document.positionAt(Math.max(0, cursorOffset - 4096));
    const windowRange = new vscode.Range(start, document.positionAt(cursorOffset + 4096));
    const base = document.offsetAt(start);
    const match = findOklchAtOffset(document.getText(windowRange), cursorOffset - base);
    if (!match) {
      void vscode.window.showInformationMessage('Place the cursor inside an OKLCH color, then run Edit Color in OKLCH.');
      return;
    }
    panel?.dispose();
    const currentPanel = vscode.window.createWebviewPanel('visualiseOklch.picker', 'OKLCH Color', vscode.ViewColumn.Beside, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
    });
    panel = currentPanel;
    let version = document.version;
    let source = match.source;
    let range = new vscode.Range(document.positionAt(base + match.start), document.positionAt(base + match.end));
    let busy = false;
    let closed = false;
    const id = randomBytes(16).toString('hex');
    const scriptUri = currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'picker.js'));
    currentPanel.webview.html = pickerHtml(currentPanel.webview.cspSource, scriptUri.toString(), id);
    const listener = currentPanel.webview.onDidReceiveMessage(async (message: unknown) => {
      if (!message || typeof message !== 'object') { return; }
      const data = message as { type?: string; color?: unknown };
      if (data.type === 'ready') {
        await currentPanel.webview.postMessage({ type: 'init', id, source });
      } else if (data.type === 'apply' && !busy && isPickerColor(data.color)) {
        if (document.isClosed || document.version !== version || document.getText(range) !== source) {
          await currentPanel.webview.postMessage({ type: 'error', text: 'The document changed. Reopen the picker at this color before applying.' });
          return;
        }
        busy = true;
        try {
          const text = buildOklchEdit(source, data.color);
          const offset = document.offsetAt(range.start);
          const applied = text === source || await editor.edit((builder) => builder.replace(range, text), {
            undoStopBefore: true, undoStopAfter: true,
          });
          if (!closed) {
            if (applied) {
              source = text;
              version = document.version;
              range = new vscode.Range(document.positionAt(offset), document.positionAt(offset + text.length));
              await currentPanel.webview.postMessage({ type: 'applied', source });
            } else {
              await currentPanel.webview.postMessage({ type: 'error', text: 'The edit could not be applied. Check whether the file is read-only, then reopen the picker.' });
            }
          }
        } catch {
          if (!closed) {
            await currentPanel.webview.postMessage({ type: 'error', text: 'The edit failed. Reopen the picker and try again.' });
          }
        } finally { busy = false; }
      }
    });
    currentPanel.onDidDispose(() => {
      closed = true;
      listener.dispose();
      if (panel === currentPanel) { panel = undefined; }
    });
  });
  return new vscode.Disposable(() => { command.dispose(); panel?.dispose(); });
};
