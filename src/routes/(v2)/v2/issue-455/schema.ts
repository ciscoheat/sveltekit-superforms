import i18next from 'i18next';
import { z } from 'zod';
// @ts-expect-error Need to use .mjs, explanation: https://stackoverflow.com/a/77108389/70894
import { zodI18nMap } from 'zod-i18n-map/dist/index.mjs';
import translation from 'zod-i18n-map/locales/es/zod.json?raw';

i18next.init({
	lng: 'es',
	resources: {
		es: { zod: JSON.parse(translation) }
	}
});
z.setErrorMap(zodI18nMap);

export const schema = z.object({
	name: z.string().min(2),
	email: z.string().email()
});

/*
const data = schema.safeParse({ name: '', email: '' });
if (!data.success) {
	console.dir(data.error.flatten(), { depth: 10 }); //debug
}
*/
