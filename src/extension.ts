// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Compiler } from "./compiler";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const compiler = new Compiler(context);
	const writeTemplate = async (uri: vscode.Uri) => {
		const items = await compiler.find(uri);
		if (items.length <= 0) {
			vscode.window.showErrorMessage(
				"No template found. Please create a templates folder inside your .vscode folder"
			);
			return;
		}

		const options = items.map((item) => ({
			label: item.templateName,
			description: item.templateDescription,
			item,
		}));
		const selected = await vscode.window.showQuickPick(options, {
			title: "Pick a template",
		});
		if (!selected) {
			return;
		}
		const name = await vscode.window.showInputBox({
			title: "Name",
			placeHolder: "Name of the template",
		});
		if (!name) {
			return;
		}
		await compiler.write(uri, selected.item, name);
	};
	const getUriFromSelected = async () => {
		await vscode.commands.executeCommand("copyFilePath");
		const uriString = await vscode.env.clipboard.readText();
		return vscode.Uri.file(uriString);
	};

	context.subscriptions.push(
		vscode.commands.registerCommand("template.write", writeTemplate)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("template.writeUnknown", async () => {
			const uri = await getUriFromSelected();
			writeTemplate(uri);
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
