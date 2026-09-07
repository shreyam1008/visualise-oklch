import { beforeEach, expect, mock, test } from 'bun:test';
import type * as vscode from 'vscode';

class Position {
  constructor(readonly line: number, readonly character: number) {}
}
class Range {
  constructor(readonly start: Position, readonly end: Position) {}
}
class Disposable {
  constructor(readonly dispose: () => void) {}
}
let invoke: () => void;
let receive: (message: unknown) => Promise<void>;
let source = '';
let disposed: () => void;
let editCount = 0;
let editOptions: unknown;
let rejectEdit = false;
const messages: { type: string; source?: string; text?: string }[] = [];
const document = {
  version: 1, lineCount: 1, isClosed: false,
  offsetAt: (position: Position) => position.character,
  positionAt: (offset: number) => new Position(0, offset),
  lineAt: () => ({ range: new Range(new Position(0, 0), new Position(0, source.length)) }),
  getText: (range?: Range) => range ? source.slice(range.start.character, range.end.character) : source,
};
const editor = {
  document, selection: { active: new Position(0, 18) },
  edit: (callback: (builder: { replace: (range: Range, text: string) => void }) => void, options: unknown) => {
    editCount += 1; editOptions = options;
    if (rejectEdit) { return Promise.resolve(false); }
    callback({ replace: (range, text) => { source = source.slice(0, range.start.character) + text + source.slice(range.end.character); } });
    document.version += 1;
    return Promise.resolve(true);
  },
};
mock.module('vscode', () => ({
  Position, Range, Disposable,
  ViewColumn: { Beside: 2 }, Uri: { joinPath: (_uri: unknown, ...paths: string[]) => paths.join('/') },
  workspace: { getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }) },
  commands: { registerCommand: (_id: string, callback: () => void) => { invoke = callback; return new Disposable(() => {}); } },
  window: {
    activeTextEditor: editor,
    showInformationMessage: () => {},
    createWebviewPanel: () => ({
      dispose: () => disposed?.(), onDidDispose: (callback: () => void) => { disposed = callback; },
      webview: {
        cspSource: 'test:', asWebviewUri: (uri: string) => uri, html: '',
        onDidReceiveMessage: (callback: typeof receive) => { receive = callback; return new Disposable(() => {}); },
        postMessage: (message: typeof messages[number]) => { messages.push(message); return Promise.resolve(true); },
      },
    }),
  },
}));
const { registerOklchEditor } = await import('../src/oklchEditor');
beforeEach(() => {
  source = '--brand: oklch(62% 0.35 260 / 80%);';
  document.version = 1; document.isClosed = false;
  editCount = 0; rejectEdit = false; messages.length = 0;
  registerOklchEditor({ extensionUri: {} } as vscode.ExtensionContext);
  invoke();
});
const color = { lightness: 0.62, chroma: 0.2, hueDegrees: 260, alpha: 0.8 };

test('apply makes one precise undoable edit and tracks its new range', async () => {
  await receive({ type: 'ready' });
  expect(messages[0]?.source).toBe('oklch(62% 0.35 260 / 80%)');
  await receive({ type: 'apply', color });
  expect(source).toBe('--brand: oklch(62% 0.2 260 / 80%);');
  expect(editCount).toBe(1);
  expect(editOptions).toEqual({ undoStopBefore: true, undoStopAfter: true });
  await receive({ type: 'apply', color: { ...color, alpha: 1 } });
  expect(source).toBe('--brand: oklch(62% 0.2 260);');
  expect(messages.at(-1)?.type).toBe('applied');
});

test('intervening document edits cannot be overwritten', async () => {
  document.version += 1;
  source = `/* other edit */ ${source}`;
  await receive({ type: 'apply', color });
  expect(editCount).toBe(0);
  expect(messages.at(-1)?.type).toBe('error');
  expect(source).toContain('/* other edit */');
});

test('no-op, malformed, and concurrent messages cannot create extra edits', async () => {
  await receive({ type: 'apply', color: { ...color, chroma: 0.35 } });
  expect(editCount).toBe(0);
  await receive({ type: 'apply', color: { ...color, alpha: Infinity } });
  expect(editCount).toBe(0);
  await Promise.all([receive({ type: 'apply', color }), receive({ type: 'apply', color })]);
  expect(editCount).toBe(1);
});

test('failed edits report failure and leave original source intact', async () => {
  rejectEdit = true;
  await receive({ type: 'apply', color });
  expect(source).toBe('--brand: oklch(62% 0.35 260 / 80%);');
  expect(messages.at(-1)?.type).toBe('error');
});
