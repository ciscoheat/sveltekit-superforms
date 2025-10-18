# Zod v4 `stringbool()` Support

Superforms now supports Zod v4's `z.stringbool()` type, which allows strict validation of boolean string values.

## What is `z.stringbool()`?

`z.stringbool()` is a Zod v4 feature that validates string inputs and converts them to booleans, but only accepts specific truthy/falsy string values. Unlike `z.boolean()` or `z.coerce.boolean()`, which accept any non-"false" value as truthy, `stringbool()` enforces strict validation.

## Implementation Details

Internally, `z.stringbool()` is implemented as a pipe: `string -> transform -> boolean`

Superforms detects this pattern in the JSON Schema generation phase and:

1. Marks the field with `format: "stringbool"` in the JSON Schema
2. Keeps the value as a string during FormData parsing
3. Lets Zod perform the validation and transformation

## Usage Examples

### Basic Example

```typescript
import { z } from 'zod/v4';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

const schema = z.object({
	acceptTerms: z.stringbool({
		truthy: ['true'],
		falsy: ['false'],
		case: 'sensitive'
	})
});

// Server-side (+page.server.ts)
export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// form.data.acceptTerms is now a boolean (true or false)
		console.log(form.data.acceptTerms); // boolean

		return { form };
	}
};
```

### Client-side Form

```svelte
<script lang="ts">
	import { superForm } from 'sveltekit-superforms';

	export let data;

	const { form, errors, enhance } = superForm(data.form);
</script>

<form method="POST" use:enhance>
	<input type="hidden" name="acceptTerms" value="true" />
	<button type="submit">Accept Terms</button>
</form>
```

### Custom Truthy/Falsy Values

You can customize which string values are considered truthy or falsy:

```typescript
const schema = z.object({
	status: z.stringbool({
		truthy: ['yes', 'on', '1'],
		falsy: ['no', 'off', '0'],
		case: 'insensitive' // Case-insensitive matching
	})
});
```

With this schema:

- `"yes"`, `"YES"`, `"on"`, `"ON"`, `"1"` → `true`
- `"no"`, `"NO"`, `"off"`, `"OFF"`, `"0"` → `false`
- Any other value → Validation error

## Benefits Over Regular Boolean

| Feature         | `z.boolean()` / `z.coerce.boolean()`       | `z.stringbool()`                                 |
| --------------- | ------------------------------------------ | ------------------------------------------------ |
| Validation      | Accepts any value as truthy except "false" | Only accepts specified truthy/falsy values       |
| Type Safety     | Less strict                                | More strict                                      |
| Error Detection | May miss invalid inputs                    | Catches invalid inputs                           |
| Use Case        | General boolean fields                     | Security-critical or strict validation scenarios |

## Common Use Cases

### Toggle Role Buttons

```typescript
const schema = z.object({
	role: z.string(),
	hadRole: z.stringbool({
		truthy: ['true'],
		falsy: ['false'],
		case: 'sensitive'
	})
});
```

Hidden form fields that track whether a user had a role when the page loaded, preventing unexpected toggles.

### Checkbox-like Hidden Inputs

```typescript
const schema = z.object({
	consent: z.stringbool({
		truthy: ['true'],
		falsy: ['false']
	})
});
```

For forms that look like buttons to the user but need to track boolean state.

### Feature Flags

```typescript
const schema = z.object({
	enabled: z.stringbool({
		truthy: ['enabled', 'on'],
		falsy: ['disabled', 'off'],
		case: 'insensitive'
	})
});
```

## Testing

Run the stringbool tests:

```bash
npm test -- stringbool
```

## Related Issues

- [Issue #610](https://github.com/ciscoheat/sveltekit-superforms/issues/610) - Original feature request
- [Zod Issue #4821](https://github.com/colinhacks/zod/issues/4821) - Discussion about detecting stringbool in JSON Schema

## Credits

Thanks to [@fr33bits](https://github.com/fr33bits) for reporting the issue and [@colinhacks](https://github.com/colinhacks) for clarifying the stringbool implementation.
