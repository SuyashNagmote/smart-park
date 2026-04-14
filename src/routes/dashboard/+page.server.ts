import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// route is protected by hooks; locals.user is guaranteed here
	return { user: locals.user! };
};
