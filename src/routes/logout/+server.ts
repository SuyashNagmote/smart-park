import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('sp_session');
	if (token) deleteSession(token);
	cookies.delete('sp_session', { path: '/' });
	throw redirect(303, '/login');
};
