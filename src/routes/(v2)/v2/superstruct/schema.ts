import { object, string, size, define } from 'superstruct';

const email = () => define<string>('email', (value) => String(value).includes('@'));

export const schema = object({
	name: size(string(), 2, 100),
	email: email()
});
