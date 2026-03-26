import type { JSONSchema } from './index.js';
import { schemaInfo, type SchemaInfo } from './schemaInfo.js';

export function schemaHash(schema: JSONSchema): string {
	return hashCode(_schemaHash(schemaInfo(schema, false, []), 0, []));
}

function _schemaHash(info: SchemaInfo | undefined, depth: number, path: string[]): string {
	if (!info) return '';

	function tab() {
		return '  '.repeat(depth);
	}

	function mapSchemas(schemas: JSONSchema[]) {
		return schemas
			.map((s) => _schemaHash(schemaInfo(s, info?.isOptional ?? false, path), depth + 1, path))
			.filter((s) => s)
			.join('|');
	}

	function nullish() {
		const output: string[] = [];
		if (info?.isNullable) output.push('null');
		if (info?.isOptional) output.push('undefined');
		return !output.length ? '' : '|' + output.join('|');
	}

	// Union
	if (info.union) {
		return 'Union {\n  ' + tab() + mapSchemas(info.union) + '\n' + tab() + '}' + nullish();
	}

	// Objects
	if (info.properties) {
		const output: string[] = [];
		for (const [key, prop] of Object.entries(info.properties)) {
			const propInfo = schemaInfo(
				prop,
				!info.required?.includes(key) || prop.default !== undefined,
				[key]
			);
			output.push(key + ': ' + _schemaHash(propInfo, depth + 1, path));
		}
		return 'Object {\n  ' + tab() + output.join(',\n  ') + '\n' + tab() + '}' + nullish();
	}

	// Arrays
	if (info.array) {
		return 'Array[' + mapSchemas(info.array) + ']' + nullish();
	}

	return info.types.join('|') + nullish();
}

// https://stackoverflow.com/a/8831937/70894
function hashCode(str: string) {
	let hash = 0;
	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	// Make it unsigned, for the hash appearance
	if (hash < 0) hash = hash >>> 0;
	return hash.toString(36);
}
