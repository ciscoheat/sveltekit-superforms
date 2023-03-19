import type { ZodTypeInfo } from '../entity';

/**
 * Client-side version of unwrapZodType, to prevent including the whole Zod library
 * if no Zod schema exists on the client. Any change in server/entity.ts must be reflected here!
 * @param zodType
 * @returns
 */
export function unwrapZodType(zodType: any): ZodTypeInfo {
  let _wrapped = true;
  let isNullable = false;
  let isOptional = false;
  let hasDefault = false;
  let defaultValue: unknown = undefined;

  //let i = 0;
  while (_wrapped) {
    //console.log(' '.repeat(++i * 2) + zodType.constructor.name);
    if (zodType.constructor.name == 'ZodNullable') {
      isNullable = true;
      zodType = zodType.unwrap();
    } else if (zodType.constructor.name == 'ZodDefault') {
      hasDefault = true;
      defaultValue = zodType._def.defaultValue();
      zodType = zodType._def.innerType;
    } else if (zodType.constructor.name == 'ZodOptional') {
      isOptional = true;
      zodType = zodType.unwrap();
    } else if (zodType.constructor.name == 'ZodEffects') {
      zodType = zodType._def.schema;
    } else {
      _wrapped = false;
    }
  }

  return {
    zodType,
    isNullable,
    isOptional,
    hasDefault,
    defaultValue
  };
}
