/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { AnySchema } from 'yup';
import type { JsonSchemaCallback, Meta } from '../types.js';

type YupParams = {
	addMethod: any;
	Schema: any;
};

function addMethod(yup: YupParams, name: string) {
	yup.addMethod(yup.Schema, name, function (this: AnySchema, value: any): AnySchema {
		const meta: Meta = this.describe().meta || {};
		return this.meta({
			...meta,
			jsonSchema: {
				...meta.jsonSchema,
				[name]: value
			}
		});
	});
}

export function extendSchema(yup: YupParams): void {
	addMethod(yup, 'example');
	addMethod(yup, 'examples');
	addMethod(yup, 'description');

	yup.addMethod(
		yup.Schema,
		'jsonSchema',
		function (this: AnySchema, callback: JsonSchemaCallback): AnySchema {
			const meta: Meta = this.describe().meta || {};
			return this.meta({
				...meta,
				jsonSchema: callback(meta.jsonSchema || {})
			});
		}
	);
}
