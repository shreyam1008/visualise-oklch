import * as vscode from 'vscode';
import { formatHex, parse } from 'culori';

const oklchRegex = /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;

let decorationsMap = new Map<string, { decorationType: vscode.TextEditorDecorationType, ranges: vscode.DecorationOptions[] }[]>();

export function activate(context: vscode.ExtensionContext) {
	let activeEditor = vscode.window.activeTextEditor;

	function updateDecorations() {
		if (!activeEditor) {
			return;
		}

		const docUriString = activeEditor.document.uri.toString();
		if (decorationsMap.has(docUriString)) {
			decorationsMap.get(docUriString)?.forEach(d => d.decorationType.dispose());
			decorationsMap.delete(docUriString);
		}

		const text = activeEditor.document.getText();
		const newDecorations: { decorationType: vscode.TextEditorDecorationType, ranges: vscode.DecorationOptions[] }[] = [];
		let match;

		const localOklchRegex = new RegExp(oklchRegex);

		while ((match = localOklchRegex.exec(text))) {
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(startPos, endPos);

			const oklchString = match[0];
			let hexColor = '#888888';
			try {
				const parsedColor = parse(oklchString);
				if (parsedColor) {
					hexColor = formatHex(parsedColor);
				}
			} catch (e) {
				console.error(`Error parsing OKLCH colour: ${oklchString}`, e);
			}

			const singleColorDecorationType = vscode.window.createTextEditorDecorationType({
				before: {
					contentText: '■',
					margin: '0 0.2em 0 0',
					color: hexColor
				}
			});

			const decoration = { range };

			newDecorations.push({ decorationType: singleColorDecorationType, ranges: [decoration] });
		}

		newDecorations.forEach(d => {
			activeEditor?.setDecorations(d.decorationType, d.ranges);
		});

		decorationsMap.set(docUriString, newDecorations);
	}

	let timeout: NodeJS.Timeout | undefined = undefined;
	function triggerUpdateDecorations(throttle = false) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		timeout = setTimeout(() => {
			updateDecorations();
		}, throttle ? 500 : 0);
	}

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations(true);
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidCloseTextDocument(document => {
		const docUriString = document.uri.toString();
		if (decorationsMap.has(docUriString)) {
			decorationsMap.get(docUriString)?.forEach(d => d.decorationType.dispose());
			decorationsMap.delete(docUriString);
		}
	});
}

export function deactivate() {
	decorationsMap.forEach((decorations: { decorationType: vscode.TextEditorDecorationType, ranges: vscode.DecorationOptions[] }[]) => {
		decorations.forEach((d: { decorationType: vscode.TextEditorDecorationType, ranges: vscode.DecorationOptions[] }) => d.decorationType.dispose());
	});
	decorationsMap.clear();
}
