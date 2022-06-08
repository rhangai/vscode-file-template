import { helpers } from "./helpers";
import * as vscode from "vscode";
import * as Mustache from "mustache";
import { basename, extname } from "path";
import type { CompilerTemplateItem } from "./compiler";

export type CompilationCreateOptions = {
	context: vscode.ExtensionContext;
	outputUri: vscode.Uri;
	name: string;
	item: CompilerTemplateItem;
};

/**
 * Compiler for the templates
 */
export class Compilation {
	static async create(
		options: CompilationCreateOptions
	): Promise<Compilation | null> {
		const outputUri = await Compilation.resolveDir(options.outputUri);
		if (!outputUri) {
			return null;
		}
		return new Compilation(
			options.context,
			options.outputUri,
			options.item,
			options.name
		);
	}

	private readonly buildContext: Record<string, unknown>;

	private constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly outputUri: vscode.Uri,
		private readonly item: CompilerTemplateItem,
		private readonly name: string
	) {
		this.buildContext = this.createContext();
	}

	private createContext() {
		const name = this.name;
		const { namePrefix, nameSuffix, nameWithoutPrefix, nameWithoutSuffix } =
			this.parseName(name);
		const dir = basename(this.outputUri.fsPath);
		return {
			...this.createContextCase("name", name),
			...this.createContextCase("dir", dir),
			...this.createContextCase("namePrefix", namePrefix),
			...this.createContextCase("nameSuffix", nameSuffix),
			...this.createContextCase("nameWithoutPrefix", nameWithoutPrefix),
			...this.createContextCase("nameWithoutSuffix", nameWithoutSuffix),
		};
	}

	private createContextCase(key: string, value: string) {
		return {
			[`${key}Param`]: helpers.case.param(value),
			[`${key}Camel`]: helpers.case.camel(value),
			[`${key}Pascal`]: helpers.case.pascal(value),
			[`${key}Snake`]: helpers.case.snake(value),
		};
	}

	private parseName(name: string) {
		const parts = helpers.case.param(name).split("-");
		if (parts.length <= 1) {
			return {
				namePrefix: "",
				nameSuffix: "",
				nameWithoutPrefix: name,
				nameWithoutSuffix: name,
			};
		}
		const namePrefix = parts[parts.length - 1];
		const nameSuffix = parts[parts.length - 1];
		const nameWithoutPrefix = parts.slice(1).join("-");
		const nameWithoutSuffix = parts.slice(0, parts.length - 1).join("-");
		return {
			namePrefix,
			nameSuffix,
			nameWithoutPrefix,
			nameWithoutSuffix,
		};
	}

	async write() {
		if (this.item.fileType === vscode.FileType.Directory) {
			await this.writeDir();
		} else {
			await this.writeFile();
		}
	}
	private async writeDir() {
		const templateFiles = await vscode.workspace.fs
			.readDirectory(this.item.uri)
			.then(
				(files) => files,
				() => []
			);
		const files = templateFiles.filter(
			([, fileType]) => fileType === vscode.FileType.File
		);
		for (const [file] of files) {
			const outputFilename = Mustache.render(file, this.buildContext);
			await this.doWriteFile(
				outputFilename,
				vscode.Uri.joinPath(this.item.uri, file)
			);
		}
	}

	private async writeFile() {
		let extension = extname(this.item.uri.path);
		if (extension === ".template") {
			extension = extname(basename(this.item.uri.path, extension));
		}
		await this.doWriteFile(`${this.name}${extension}`, this.item.uri);
	}

	/**
	 * Do write a file to an output uri
	 * @param outputUri
	 * @param templateUri
	 * @param context
	 * @returns
	 */
	private async doWriteFile(outputFile: string, templateUri: vscode.Uri) {
		const outputUri = Compilation.resolveOutputUri(this.outputUri, outputFile);
		const contentArray = await vscode.workspace.fs.readFile(templateUri);
		const content = Mustache.render(contentArray.toString(), this.buildContext);

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

	/**
	 * Get the dir from a given URI
	 */
	private static resolveOutputUri(baseUri: vscode.Uri, filenameParam: string) {
		let filename = filenameParam;
		const ext = extname(filename);
		if (ext === ".template") {
			filename = basename(filename, ext);
		}
		return vscode.Uri.joinPath(baseUri, filename);
	}

	/**
	 * Get the dir from a given URI
	 */
	private static async resolveDir(baseUri: vscode.Uri) {
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
