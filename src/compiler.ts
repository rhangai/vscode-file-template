import { helpers } from "./helpers";
import * as vscode from "vscode";
import * as Mustache from "mustache";
import { basename, extname } from "path";

type TemplateItem = {
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

	async find(file: vscode.Uri): Promise<TemplateItem[]> {
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
			let templateName = file;
			let templateDescription = "";
			if (fileType === vscode.FileType.File) {
				const ext = extname(file);
				templateName = basename(file, ext);
				templateDescription = ext;
			} else if (fileType === vscode.FileType.Directory) {
				templateDescription = "multiple";
			}
			return {
				templateName,
				templateDescription,
				fileName: file,
				fileType,
				uri: vscode.Uri.joinPath(templatesUri, file),
			};
		});
	}

	async write(
		outputBaseUriParam: vscode.Uri,
		item: TemplateItem,
		name: string
	) {
		const outputBaseUri = await this.resolveDir(outputBaseUriParam);
		if (!outputBaseUri) {
			return;
		}

		if (item.fileType === vscode.FileType.Directory) {
			await this.writeDir(outputBaseUri, item, name);
		} else {
			await this.writeFile(outputBaseUri, item.uri, name);
		}
	}

	private createContext(outputBaseUri: vscode.Uri, name: string) {
		const dir = basename(outputBaseUri.fsPath);
		return {
			name: name,
			nameParam: helpers.case.param(name),
			nameCamel: helpers.case.camel(name),
			namePascal: helpers.case.pascal(name),
			dir,
			dirParam: helpers.case.param(dir),
			dirCamel: helpers.case.camel(dir),
			dirPascal: helpers.case.pascal(dir),
		};
	}

	private async writeDir(
		outputBaseUri: vscode.Uri,
		item: TemplateItem,
		name: string
	) {
		const templateFiles = await vscode.workspace.fs
			.readDirectory(item.uri)
			.then(
				(files) => files,
				() => []
			);
		const files = templateFiles.filter(
			([, fileType]) => fileType === vscode.FileType.File
		);

		const context = this.createContext(outputBaseUri, name);
		for (const [file] of files) {
			const outputFilename = Mustache.render(file, context);
			await this.doWriteFile(
				vscode.Uri.joinPath(outputBaseUri, outputFilename),
				vscode.Uri.joinPath(item.uri, file),
				context
			);
		}
	}

	private async writeFile(
		outputBaseUri: vscode.Uri,
		templateUri: vscode.Uri,
		name: string
	) {
		const context = this.createContext(outputBaseUri, name);
		const extension = extname(templateUri.path);
		const outputUri = vscode.Uri.joinPath(outputBaseUri, `${name}${extension}`);
		await this.doWriteFile(outputUri, templateUri, context);
	}

	private async doWriteFile(
		outputUri: vscode.Uri,
		templateUri: vscode.Uri,
		context: any
	) {
		const contentArray = await vscode.workspace.fs.readFile(templateUri);
		const content = Mustache.render(contentArray.toString(), context);

		const outputStat = await vscode.workspace.fs.stat(outputUri).then(
			(s) => s,
			() => null
		);
		if (outputStat !== null) {
			const answer = await vscode.window.showQuickPick(["No", "Yes"], {
				title: `Overwrite ${outputUri.path}?`,
				placeHolder: `File ${outputUri.path} already exists, overwrite?`,
			});
			if (answer !== "Yes") {
				return;
			}
		}
		await vscode.workspace.fs.writeFile(outputUri, Buffer.from(content));
		await vscode.workspace.openTextDocument(outputUri).then((doc) => {
			vscode.window.showTextDocument(doc, {
				preview: false,
			});
		});
	}

	private async resolveDir(baseUri: vscode.Uri) {
		const stat = await vscode.workspace.fs.stat(baseUri).then(
			(s) => s,
			() => null
		);
		if (!stat) {
			return null;
		}
		if (stat.type === vscode.FileType.Directory) {
			return baseUri;
		}
		return vscode.Uri.joinPath(baseUri, "../");
	}
}
