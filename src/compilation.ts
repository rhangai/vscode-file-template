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
		const {
			nameExt,
			namePrefix,
			nameSuffix,
			nameWithoutExt,
			nameWithoutPrefix,
			nameWithoutSuffix,
		} = this.parseName(name);
		const dir = basename(this.outputUri.fsPath);
		return {
			...this.createContextCase("name", name),
			...this.createContextCase("dir", dir),
			...this.createContextCase("nameExt", nameExt),
			...this.createContextCase("namePrefix", namePrefix),
			...this.createContextCase("nameSuffix", nameSuffix),
			...this.createContextCase("nameWithoutExt", nameWithoutExt),
			...this.createContextCase("nameWithoutPrefix", nameWithoutPrefix),
			...this.createContextCase("nameWithoutSuffix", nameWithoutSuffix),
		};
	}

	private createContextCase(key: string, value: string) {
		return {
			[key]: value,
			[`${key}Param`]: helpers.case.param(value),
			[`${key}Camel`]: helpers.case.camel(value),
			[`${key}Pascal`]: helpers.case.pascal(value),
			[`${key}Snake`]: helpers.case.snake(value),
			[`${key}Constant`]: helpers.case.constant(value),
			[`${key}Dot`]: helpers.case.dot(value),
		};
	}

	private parseName(name: string) {
		const parts = helpers.case.param(name).split("-");

		let nameExt = "";
		let nameWithoutExt = name;
		if (name.indexOf(".") >= 0) {
			nameExt = extname(name);
			nameWithoutExt = basename(name, nameExt);
		}

		if (parts.length <= 1) {
			return {
				nameExt,
				nameWithoutExt,
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
			nameExt,
			namePrefix,
			nameSuffix,
			nameWithoutExt,
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
	private async writeDir(
		templateUri: vscode.Uri = this.item.uri,
		outputUri: vscode.Uri = this.outputUri
	) {
		const templateFiles = await vscode.workspace.fs
			.readDirectory(templateUri)
			.then(
				(files) => files,
				() => []
			);
		const files = templateFiles.filter(
			([, fileType]) =>
				fileType === vscode.FileType.File || vscode.FileType.Directory
		);
		for (const [file, fileType] of files) {
			const newOutputUri = Compilation.resolveOutputUri(
				outputUri,
				Mustache.render(file, this.buildContext)
			);

			if (fileType === vscode.FileType.File) {
				await this.doWriteFile(
					newOutputUri,
					vscode.Uri.joinPath(templateUri, file)
				);
			} else if (fileType === vscode.FileType.Directory) {
				await this.doWriteDir(newOutputUri);
				this.writeDir(vscode.Uri.joinPath(templateUri, file), newOutputUri);
			}
		}
	}

	private async writeFile() {
		let extension = extname(this.item.uri.path);
		if (extension === ".template") {
			extension = extname(basename(this.item.uri.path, extension));
		}
		const outputUri = Compilation.resolveOutputUri(
			this.outputUri,
			`${this.name}${extension}`
		);
		await this.doWriteFile(outputUri, this.item.uri);
	}

	private async doWriteDir(outputUri: vscode.Uri) {
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
		await vscode.workspace.fs.createDirectory(outputUri);
	}

	/**
	 * Do write a file to an output uri
	 * @param outputUri
	 * @param templateUri
	 * @param context
	 * @returns
	 */
	private async doWriteFile(outputUri: vscode.Uri, templateUri: vscode.Uri) {
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
