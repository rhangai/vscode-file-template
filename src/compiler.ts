import { helpers } from "./helpers";
import * as vscode from "vscode";
import * as Mustache from "mustache";
import { basename, extname } from "path";
import { Compilation } from "./compilation";

export type CompilerTemplateItem = {
	templateName: string;
	templateDescription: string;
	uri: vscode.Uri;
	fileName: string;
	fileType: vscode.FileType;
};

/**
 * Compiler for the templates
 */
export class Compiler {
	constructor(private readonly context: vscode.ExtensionContext) {}

	async find(file: vscode.Uri): Promise<CompilerTemplateItem[]> {
		const workspace = vscode.workspace.getWorkspaceFolder(file);
		if (!workspace) {
			return [];
		}
		const templatesUri = vscode.Uri.joinPath(
			workspace.uri,
			".vscode/templates"
		);
		const templateFiles = await vscode.workspace.fs
			.readDirectory(templatesUri)
			.then(
				(files) => files,
				() => []
			);
		return templateFiles.map(([file, fileType]) => {
			const templateInfo = Compiler.parseTemplateInfo(file, fileType);
			return {
				...templateInfo,
				fileName: file,
				fileType,
				uri: vscode.Uri.joinPath(templatesUri, file),
			};
		});
	}

	static parseTemplateInfo(file: string, fileType: vscode.FileType) {
		if (fileType !== vscode.FileType.File) {
			return {
				templateName: file,
				templateDescription: "",
			};
		}
		const ext = extname(file);
		let templateName = basename(file, ext);
		let templateDescription = ext;
		if (ext === ".template") {
			const subExt = extname(templateName);
			templateName = basename(templateName, subExt);
			templateDescription = subExt;
		}
		return {
			templateName,
			templateDescription,
		};
	}

	/**
	 * Write the templates
	 * @param outputUri
	 * @param item
	 * @param name
	 * @returns
	 */
	async write(outputUri: vscode.Uri, item: CompilerTemplateItem, name: string) {
		const compilation = await Compilation.create({
			context: this.context,
			outputUri,
			item,
			name,
		});
		if (!compilation) {
			return;
		}
		await compilation.write();
	}
}
