# AGENTS.md

**AI Agent Documentation for sveltekit-superforms**

This document provides essential information for AI agents (like GitHub Copilot, Claude, ChatGPT, etc.) working with the sveltekit-superforms codebase. Last updated: October 18, 2025.

---

## Project Overview

**sveltekit-superforms** is a comprehensive form management library for SvelteKit that provides:

- Server and client-side validation with 12+ validation libraries
- Progressive enhancement (works without JavaScript)
- Type-safe form handling with automatic TypeScript inference
- Advanced features: nested data, file uploads, multiple forms, SPA mode, snapshots, tainted detection

**Website:** https://superforms.rocks/  
**Repository:** https://github.com/ciscoheat/sveltekit-superforms  
**License:** MIT

---

## Architecture & Core Concepts

### 1. **Validation Adapters**

The library uses a **validation adapter pattern** to support multiple validation libraries. Each adapter lives in `src/lib/adapters/`.

**Supported Libraries:**

- Zod (v3 via `zod.ts`, v4 via `zod4.ts`)
- Valibot, Yup, Joi, ArkType, Effect, TypeBox, Superstruct, VineJS
- class-validator, schemasafe, simple-schema
- JSON Schema (direct)

**Adapter Interface** (`src/lib/adapters/adapters.ts`):

```typescript
interface ValidationAdapter<Out, In> {
	validate(data): Promise<ValidationResult<Out>>;
	jsonSchema?: JSONSchema;
	defaults?: Out;
	constraints?: InputConstraints<Out>;
}
```

**Key Files:**

- `src/lib/adapters/adapters.ts` - Core adapter types and factory
- `src/lib/adapters/typeSchema.ts` - Type-level adapter definitions
- `src/lib/adapters/zod4.ts` - Zod v4 adapter (has special JSON Schema overrides for date/bigint)

### 2. **Core API Surface**

**Server-side (`src/lib/superValidate.ts`):**

```typescript
superValidate(data?, adapter, options?) -> SuperValidated<T>
```

- Validates data against schema
- Returns form object with `{ id, valid, posted, errors, data, constraints, message }`
- Can accept: RequestEvent, Request, FormData, URLSearchParams, URL, Partial<T>, null, undefined

**Client-side (`src/lib/client/superForm.ts`):**

```typescript
superForm(data: SuperValidated<T>, options?: FormOptions<T>) -> SuperForm<T>
```

- Creates reactive form stores
- Returns: `{ form, errors, constraints, message, tainted, delayed, enhance, ... }`
- 2290 lines - the largest and most complex file in the codebase

**Key Exports (`src/lib/index.ts`):**

- `superValidate`, `superForm` - Main APIs
- Proxy functions: `intProxy`, `numberProxy`, `dateProxy`, `fileProxy`, etc.
- Helpers: `defaults`, `defaultValues`, `setError`, `setMessage`, `withFiles`
- Types: `SuperValidated`, `Infer`, `InferIn`, `ValidationErrors`, `FormOptions`

### 3. **Data Flow**

```
Schema Definition (Zod/Valibot/etc.)
    ↓
Adapter wraps schema
    ↓
superValidate (server) → SuperValidated object
    ↓
Pass to client via PageData/ActionData
    ↓
superForm (client) → Reactive stores + enhance action
    ↓
Form submission → Server validation → Client update
```

### 4. **Key Subsystems**

**Traversal & Paths** (`src/lib/traversal.ts`, `src/lib/stringPath.ts`):

- Handle nested object paths like `user.addresses[0].city`
- `traversePath`, `setPaths`, `pathExists`, `comparePaths`
- `splitPath`, `mergePath` for string path manipulation

**Errors** (`src/lib/errors.ts`):

- `SuperFormError`, `SchemaError` custom errors
- `mapErrors`, `flattenErrors`, `updateErrors` for error transformation
- Merges schema errors with custom field errors

**Form Data** (`src/lib/formData.ts`):

- `parseRequest` - Extracts and coerces FormData to typed objects
- Handles arrays, files, nested structures
- Automatic type coercion (strings → numbers, dates, booleans)

**JSON Schema** (`src/lib/jsonSchema/`):

- Converts validation schemas to JSON Schema
- Generates HTML input constraints (min, max, pattern, required)
- `schemaDefaults` extracts default values from schemas
- `schemaShape` provides type information for nested structures

**Proxies** (`src/lib/client/proxies.ts`):

- Writable store wrappers that convert between form data and display formats
- `dateProxy` - Handles Date ↔ ISO string conversion
- `numberProxy`, `intProxy` - Number ↔ string with validation
- `fileProxy`, `filesProxy` - File input handling

**Progressive Enhancement** (`src/lib/client/form.ts`):

- `enhance` action (uses SvelteKit's `use:enhance`)
- Scrolls to first error, auto-focus, custom validity
- Works without JS, enhanced with JS

---

## Project Structure

```
src/
├── lib/
│   ├── adapters/           # Validation library adapters
│   │   ├── zod.ts          # Zod v3 adapter
│   │   ├── zod4.ts         # Zod v4 adapter
│   │   ├── valibot.ts, yup.ts, joi.ts, etc.
│   │   └── adapters.ts     # Core adapter types
│   ├── client/             # Client-side code (browser)
│   │   ├── superForm.ts    # Main client API (2290 lines)
│   │   ├── proxies.ts      # Data conversion proxies
│   │   ├── form.ts         # Progressive enhancement
│   │   ├── elements.ts     # DOM element helpers
│   │   ├── flash.ts        # Flash message handling
│   │   ├── customValidity.ts  # HTML5 validation API
│   │   ├── SuperDebug.svelte  # Debug component (Svelte 4)
│   │   └── SuperDebugRuned.svelte # Debug component (Svelte 5)
│   ├── jsonSchema/         # JSON Schema utilities
│   │   ├── constraints.ts  # HTML input constraints
│   │   ├── schemaDefaults.ts # Default value extraction
│   │   ├── schemaShape.ts  # Type shape analysis
│   │   └── schemaHash.ts   # Schema hashing for caching
│   ├── server/             # Server-only exports
│   │   └── index.ts        # Re-exports server APIs
│   ├── superValidate.ts    # Core server validation
│   ├── traversal.ts        # Object path traversal
│   ├── stringPath.ts       # Path string utilities
│   ├── formData.ts         # FormData parsing
│   ├── errors.ts           # Error handling
│   ├── defaults.ts         # Default value helpers
│   ├── utils.ts            # Shared utilities
│   ├── superStruct.ts      # Type utilities for nested structures
│   ├── memoize.ts          # Adapter memoization
│   └── index.ts            # Main entry point
├── routes/                 # Demo/test routes
│   ├── (v1)/               # v1 examples
│   └── (v2)/               # v2 examples
└── tests/                  # Test files
    ├── superValidate.test.ts  # Core validation tests
    ├── superForm.test.ts      # Client form tests
    ├── formData.test.ts       # FormData parsing tests
    ├── JSONSchema.test.ts     # JSON Schema tests
    ├── zod4Union.test.ts      # Zod v4 union tests
    └── zodUnion.test.ts       # Zod v3 union tests
```

---

## Known Issues & Important Notes

**Adapter-specific notes:**

- Zod v4 adapter has special JSON Schema handling for `date` (→ integer/unix-time) and `bigint` (→ string) in `src/lib/adapters/zod4.ts`
- Test reference to issue #626 in `src/tests/superValidate.test.ts` (closed issue about form-level errors)

### Other Important Notes

1. **Svelte 5 Compatibility**: Library uses Svelte stores (v4 reactivity) but has Svelte 5 components (`SuperDebugRuned.svelte`). Fine-grained reactivity with `$effect` triggers on all form updates, not individual fields.

2. **Circular Dependency Warning** (#350): Using `@sveltejs/adapter-node` produces circular dependency warnings during build (doesn't break functionality).

3. **Multiple Forms**: When using multiple forms on same page with different schemas, no ID required. With same schema, set unique `id` in options.

4. **Nested Data**: Requires `dataType: 'json'` option and `use:enhance`. Without JS, only flat structures work (HTML FormData limitation).

---

## Common Patterns & Best Practices

### Creating a Validation Adapter

When adding support for a new validation library:

1. Create `src/lib/adapters/newlibrary.ts`
2. Implement the adapter factory returning `ValidationAdapter<Out, In>`
3. Add memoization with `memoize()` from `$lib/memoize.js`
4. Export from `src/lib/adapters/index.ts`
5. Add TypeScript types to `src/lib/adapters/typeSchema.ts`
6. Write tests in `src/tests/`

**Template:**

```typescript
import { memoize } from '$lib/memoize.js';
import { createAdapter } from './adapters.js';

function _newlibrary<S extends Schema>(schema: S) {
  return createAdapter({
    superFormValidationLibrary: 'newlibrary',
    jsonSchema: /* convert schema to JSON Schema */,
    defaults: /* extract defaults */,
    validate: async (data) => {
      const result = await schema.validate(data);
      if (result.isValid) return { data: result.value };
      return { issues: result.errors.map(e => ({ path: e.path, message: e.message })) };
    }
  });
}

export const newlibrary = memoize(_newlibrary);
```

### Form Validation Flow

**Server (`+page.server.ts`):**

```typescript
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { schema } from './schema';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		if (!form.valid) return fail(400, { form });
		// Process form.data
		return { form };
	}
};
```

**Client (`+page.svelte`):**

```svelte
<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { schema } from './schema';

	let { data } = $props();
	const { form, errors, enhance } = superForm(data.form, {
		validators: zodClient(schema)
	});
</script>

<form method="POST" use:enhance>
	<input name="email" bind:value={$form.email} />
	{#if $errors.email}<span>{$errors.email}</span>{/if}
	<button>Submit</button>
</form>
```

### Handling Nested Data

```typescript
// Schema
const schema = z.object({
	user: z.object({
		addresses: z.array(
			z.object({
				street: z.string(),
				city: z.string()
			})
		)
	})
});

// Client options
const { form } = superForm(data.form, {
	dataType: 'json' // Required for nested data
});

// Accessing nested fields
$form.user.addresses[0].city = 'New York';
```

### Proxy Usage

```typescript
// Date proxy for datetime-local input
const dateValue = dateProxy(form, 'publishedAt', { format: 'datetime-local' });

// In template
<input type="datetime-local" bind:value={$dateValue} />

// File proxy for file input
const avatar = fileProxy(form, 'avatar');

<input type="file" bind:files={$avatar} />
```

---

## Testing

**Test Framework:** Vitest  
**Run Tests:** `pnpm test` or `vitest run`  
**Test Files:** `src/tests/*.test.ts`

**Key Test Files:**

- `superValidate.test.ts` - Core validation logic, includes Zod 4 test block
- `superForm.test.ts` - Client-side form behavior
- `zod4Union.test.ts` - Zod v4 discriminated unions
- `formData.test.ts` - FormData parsing and coercion

**Test Command:** `pnpm test` (runs all tests)  
**Previous test invocation issue:** Running tests with absolute file paths didn't work; must run from project root with correct test globs.

---

## Type System

**Core Types:**

```typescript
// Main form data type
type SuperValidated<Out, Message = any, In = Out> = {
  id: string;
  valid: boolean;
  posted: boolean;  // Deprecated, will be removed in v3
  errors: ValidationErrors<Out>;
  data: Out;
  constraints?: InputConstraints<Out>;
  message?: Message;
  shape?: SchemaShape;
};

// Infer output type from adapter
type Infer<T extends ValidationAdapter> = /* ... */;

// Infer input type from adapter
type InferIn<T extends ValidationAdapter> = /* ... */;

// Error structure (recursive for nested objects)
type ValidationErrors<T> = {
  _errors?: string[];
} & SuperStructArray<T, string[], { _errors?: string[] }>;

// Form path types (for accessing nested fields)
type FormPath<T> = string; // e.g., "user.addresses[0].city"
type FormPathLeaves<T> = string; // Only leaf paths
```

**Type Utilities:**

- `Infer<Schema>` - Extract output type from validation adapter
- `InferIn<Schema>` - Extract input type (pre-validation)
- `FormPath<T>` - Type-safe path strings
- `SuperStructArray<T, V>` - Recursive type mapping for nested structures

---

## Building & Publishing

**Build:** `pnpm run build`

- Runs `vite build` and `pnpm run prepack`
- Output: `dist/` directory (svelte-package)

**Pre-publish Checks:**

```bash
pnpm run check       # Type checking
pnpm run lint        # ESLint + Prettier
pnpm run test        # Vitest
pnpm run check:adapters  # Verify adapter types exist
```

**Package Exports:**

- `sveltekit-superforms` - Main entry, includes server + client
- `sveltekit-superforms/server` - Server-only APIs
- `sveltekit-superforms/client` - Client-only APIs
- `sveltekit-superforms/adapters` - Validation adapters
- `sveltekit-superforms/client/SuperDebug.svelte` - Debug component (Svelte 4)
- `sveltekit-superforms/SuperDebug.svelte` - Debug component (Svelte 5, runed)

---

## Development Tips for AI Agents

1. **When modifying adapters:** Test with the corresponding test file and verify against the adapter's JSON Schema generation.

2. **When fixing Zod v4 issues:** Check `src/lib/adapters/zod4.ts` and `src/tests/zod4Union.test.ts`. The adapter has special handling for date/bigint in JSON Schema.

3. **When working with nested data:** Use traversal utilities from `src/lib/traversal.ts` and path utilities from `src/lib/stringPath.ts`.

4. **When adding features to superForm:** The file is 2290 lines - read carefully around the area you're modifying. Look for event hooks (`onSubmit`, `onUpdate`, etc.) and option handling.

5. **When dealing with FormData:** Check `src/lib/formData.ts` for coercion logic and `parseRequest` implementation.

6. **When debugging errors:** Use the error mapping functions in `src/lib/errors.ts` and check how they integrate with validation results.

7. **For type issues:** Look at `src/lib/adapters/typeSchema.ts` for type-level adapter definitions and `src/lib/superStruct.ts` for nested type utilities.

8. **Before making breaking changes:** Check for deprecation notices (e.g., `posted` field marked for removal in v3).

---

## Quick Reference

**Documentation:** https://superforms.rocks/  
**API Reference:** https://superforms.rocks/api  
**FAQ:** https://superforms.rocks/faq  
**Discord:** https://discord.gg/g5GHjGtU2W  
**Examples:** `src/routes/` directory

**Key Contributors:**

- Andreas Söderlund (@ciscoheat) - Creator and maintainer

**Support Model:**

- Free support: #free-support on Discord
- Commercial support: Donation-based, #commercial-support on Discord

---

## Change Log Highlights

See `CHANGELOG.md` for full history.

---

## Final Notes

This is a mature, widely-used library with comprehensive documentation. The codebase is well-structured but complex, especially `superForm.ts`. When making changes:

- **Always run tests** (`pnpm test`)
- **Check for TypeScript errors** (`pnpm run check`)
- **Consider backward compatibility** many users depend on this, but adapters should in general only support the latest version of its validation library.
- **Document breaking changes** clearly
- **Test across validation libraries** if modifying adapter system

The library's philosophy: **Progressive enhancement first**, with powerful client-side features as enhancements. Forms should work without JavaScript, be enhanced with JavaScript, and provide excellent TypeScript DX.
