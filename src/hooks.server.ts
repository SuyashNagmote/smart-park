import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getUserBySession } from '$lib/server/auth';

const PUBLIC_PATHS = new Set(['/', '/login', '/signup']);

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('sp_session');
	event.locals.user = token ? getUserBySession(token) : null;

	const pathname = event.url.pathname;

	const isPublic =
		PUBLIC_PATHS.has(pathname) ||
		pathname.startsWith('/api/') ||
		pathname.startsWith('/auth/') ||
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/favicon') ||
		pathname.startsWith('/assets/') ||
		pathname === '/manifest.json' ||
		pathname === '/robots.txt';

	if (!isPublic && !event.locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	return resolve(event);
};
