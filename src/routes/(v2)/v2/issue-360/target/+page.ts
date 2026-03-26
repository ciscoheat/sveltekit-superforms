import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(303, '/v2/issue-360/second-target');
}
