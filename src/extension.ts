import cp = require('child_process');
import path = require('path');
import * as vscode from 'vscode';

const GO_TPL_MODE: vscode.DocumentFilter = { language: 'html', scheme: 'file' };

export class GoTplDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
	public provideDocumentFormattingEdits(
		document: vscode.TextDocument,
		options: vscode.FormattingOptions,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.TextEdit[]> {
		if (vscode.window.visibleTextEditors.every((e) => e.document.fileName !== document.fileName)) {
			return [];
		}

		return this.runFormatter(document, token).then(
			(edits) => edits,
			(err) => {
				if (typeof err === 'string' && err.startsWith('TODO')) {
					console.log(err);
					// TODO1
					return Promise.resolve([]);
				}
				if (err) {
					console.log(err);
					return Promise.reject('Check the console in dev tools to find errors when formatting.');
				}
			}
		);
	}

	private runFormatter(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
		const formatCommandBinPath = '/Users/bep/go/bin/gotfmt'; // TODO

		return new Promise<vscode.TextEdit[]>((resolve, reject) => {
			vscode.window.showInformationMessage('Formatting with gotfmt');

			const env = {};
			const cwd = path.dirname(document.fileName);
			let stdout = '';
			let stderr = '';

			const p = cp.spawn(formatCommandBinPath, { env, cwd });
			token.onCancellationRequested(() => !p.killed);
			p.stdout.setEncoding('utf8');
			p.stdout.on('data', (data) => (stdout += data));
			p.stderr.on('data', (data) => (stderr += data));
			p.on('error', (err) => {
				if (err && (<any>err).code === 'ENOENT') {
					// TODO1
					return reject();
				}
			});
			p.on('close', (code) => {
				if (code !== 0) {
					return reject(stderr);
				}

				// Return the complete file content in the edit.
				// VS Code will calculate minimal edits to be applied
				const fileStart = new vscode.Position(0, 0);
				const fileEnd = document.lineAt(document.lineCount - 1).range.end;
				const textEdits: vscode.TextEdit[] = [
					new vscode.TextEdit(new vscode.Range(fileStart, fileEnd), stdout)
				];
				return resolve(textEdits);
			});

			if (p.pid) {
				p.stdin.end(document.getText());
			}
		});
	}
}

let registration: vscode.Disposable | undefined;
function registerFormatterIfEnabled() {
	const isEnabled = true; // TODO..
	if (isEnabled && !registration) {
		registration = vscode.languages.registerDocumentFormattingEditProvider(
			GO_TPL_MODE,
			new GoTplDocumentFormattingEditProvider()
		);
	} else if (!isEnabled && registration) {
		registration.dispose();
		registration = undefined;
	}
}

registerFormatterIfEnabled();

vscode.workspace.onDidChangeConfiguration((event) => {
	// TODO1
	if (event.affectsConfiguration('fooLang.formatter.enabled')) {
		registerFormatterIfEnabled();
	}
});
