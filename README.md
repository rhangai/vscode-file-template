# rhangai.file-template vscode extension

Generate templates from a single file or multiple files

## Creating files

Right click in your explore panel and select `Create from template`

### Single file template

The gif belows create a single file from the Component template

![Image](docs/component.gif)

### Folder templates

The gif belows create 3 files: clients-hooks.ts, clients.spec.ts, clients.tsx

![Image](docs/component-complex.gif)

## Creating templates

Create a `.vscode/templates` folder in your project root

### File templates

Just create a new file inside the templates dir. Every file will be considered a new template.

### Folder templates

Folder templates allow the creationg of multiple files. Every file inside the template folder
will be created in the destination. (Template substitution applies for every file)

## Template substitution

Every template is compiled through `mustache`. So you can use `{{ var }}` substitution

The following variables are allowed in template substitution

- name: User input when creating templates
- dir: Base dir destination name
- namePrefix: Name prefix (param-case by default)
- nameSuffix: Name suffix (param-case by default)
- nameWithoutExt: Name without an extension (Ex: `my-class.cpp` would become `my-class`)
- nameWithoutPrefix: Name without prefix (param-case by default)
- nameWithoutSuffix: Name without suffix (param-case by default)

You can also use the following variants for each var

- varParam: The variable var param cased (`some-name`)
- varCamel: The variable var camel cased (`someName`)
- varPascal: The variable var pascal cased (`SomeName`)
- varSnake: The variable var snake cased (`some_name`)

If the name is `my-niceTemplate-create`

| Var                 | Value                     |
| ------------------- | ------------------------- |
| `name`              | `my-niceTemplate-create`  |
| `nameParam`         | `my-nice-template-create` |
| `nameSnake`         | `my_nice_template_create` |
| `nameCamel`         | `myNiceTemplateCreate`    |
| `namePascal`        | `MyNiceTemplateCreate`    |
| `namePrefix`        | `my`                      |
| `nameSuffix`        | `create`                  |
| `nameWithoutPrefix` | `nice-template-create`    |
| `nameWithoutSuffix` | `my-nice-template`        |

If the name is `my-niceTemplate-create.java`

| Var                    | Value                         |
| ---------------------- | ----------------------------- |
| `name`                 | `my-niceTemplate-create.java` |
| `nameWithoutExt`       | `my-niceTemplate-create`      |
| `nameWithoutExtPascal` | `myNiceTemplateCreate`        |
