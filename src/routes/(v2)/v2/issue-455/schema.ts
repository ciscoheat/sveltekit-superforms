import i18next from 'i18next';
import { z } from 'zod';
import { zodI18nMap } from 'zod-i18n-map';
import translation from 'zod-i18n-map/locales/es/zod.json';

i18next.init({
	lng: 'es',
	resources: {
		es: { zod: translation }
	}
});
z.setErrorMap(zodI18nMap);

export const schema = z.object({
	name: z.string().min(2),
	email: z.string().email()
});

const data = schema.safeParse({ name: '', email: '' });
if (!data.success) {
	console.dir(data.error.flatten(), { depth: 10 }); //debug
}
