// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mycobol" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mycobol.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from mycobol!');
	});

	function getLineNumber(document: vscode.TextDocument, searchText: string): number {
		const text = document.getText();
		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes(searchText)) {
				return i;  // Line numbers are 0-based in the API, but typically 1-based for user display
			}
		}
		return -1;
	}

	const diagnosticCollection = vscode.languages.createDiagnosticCollection("myExtension");
	const disposableMoveTo = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		let diagnostics: vscode.Diagnostic[] = [];

		for (let i = 0; i < document.lineCount; i++) {
			let lineText = document.lineAt(i).text;

			if (lineText.includes('MOVE') && !lineText.includes('TO')) {
				let index = lineText.indexOf('MOVE');
				let range = new vscode.Range(new vscode.Position(i, index), new vscode.Position(i, index + 4));

				let diagnostic = new vscode.Diagnostic(
					range,
					`"MOVE" found without "TO".`,
					vscode.DiagnosticSeverity.Warning
				);

				diagnostics.push(diagnostic);
			}
		}

		diagnosticCollection.set(document.uri, diagnostics);
	});

	const disposableDivision = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		let editor = vscode.window.activeTextEditor;
		if (!editor) return;

		let divisions = [
			"IDENTIFICATION DIVISION",
			"PROCEDURE DIVISION",
			"DATA DIVISION",
			"ENVIRONMENT DIVISION",
		];

		divisions.forEach(division => {
			if (!document.getText().includes(division)) {
				vscode.window.showInformationMessage(`Insert '${division}'?`, "Yes").then((result) => {
					if (result === "Yes") {
						editor?.edit((editBuilder) => {
							let position;
							let procedureDivisionLine;

							switch (division) {
								case "IDENTIFICATION DIVISION":
									position = new vscode.Position(0, 0);
									break;
								case "ENVIRONMENT DIVISION":
									let dataDivisionLine = getLineNumber(document, "DATA DIVISION");
									if (dataDivisionLine > 0) {
										position = new vscode.Position(dataDivisionLine, 0);
										break;
									}
									procedureDivisionLine = getLineNumber(document, "PROCEDURE DIVISION");
									if (procedureDivisionLine > 0) {
										position = new vscode.Position(procedureDivisionLine, 0);
										break;
									}
									position = new vscode.Position(document.lineCount, 0);
								case "DATA DIVISION":
									procedureDivisionLine = getLineNumber(document, "PROCEDURE DIVISION");
									if (procedureDivisionLine > 0) {
										position = new vscode.Position(procedureDivisionLine, 0);
										break;
									}
									position = new vscode.Position(document.lineCount, 0);
								case "PROCEDURE DIVISION":
									position = new vscode.Position(document.lineCount, 0);
									break;
							}

							if (position !== undefined) {
								editBuilder.insert(position, `       ${division}\n`);
							}
						});
					}
				});
			}
		});
	});


	const disposablePerform = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		const text = document.getText();
		const lines = text.split('\n');
		let performStack: vscode.Position[] = [];

		for (let i = 0; i < lines.length; i++) {
			if (/\bPERFORM\b/.test(lines[i]) && !/\bEND-PERFORM\b/.test(lines[i])) {
				performStack.push(new vscode.Position(i, lines[i].indexOf('PERFORM')));
			} else if (/\bEND-PERFORM\b/.test(lines[i])) {
				if (performStack.length > 0) {
					performStack.pop();  // Match a PERFORM with an END-PERFORM
				}
			}
		}

		// At this point, any unmatched PERFORM statements remain on the stack
		const diagnostics: vscode.Diagnostic[] = performStack.map(position => {
			return new vscode.Diagnostic(
				new vscode.Range(position, position.translate(0, 'PERFORM'.length)),
				'PERFORM without matching END-PERFORM',
				vscode.DiagnosticSeverity.Error
			);
		});

		diagnosticCollection.set(document.uri, diagnostics);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposableMoveTo);
	context.subscriptions.push(disposableDivision);
	context.subscriptions.push(disposablePerform);

}

// This method is called when your extension is deactivated
export function deactivate() { }
