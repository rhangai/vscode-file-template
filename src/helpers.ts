import {
	camelCase,
	capitalCase,
	constantCase,
	dotCase,
	headerCase,
	noCase,
	paramCase,
	pascalCase,
	pathCase,
	sentenceCase,
	snakeCase,
} from "change-case";

export const helpers = {
	case: {
		camel: camelCase,
		capital: capitalCase,
		constant: constantCase,
		dot: dotCase,
		header: headerCase,
		no: noCase,
		param: paramCase,
		pascal: pascalCase,
		path: pathCase,
		sentence: sentenceCase,
		snake: snakeCase,
	},
};
