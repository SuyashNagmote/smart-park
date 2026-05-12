import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSession, createUser } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { checkRateLimit, getClientIp } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies } = event;
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password)
			return fail(400, { message: 'Email and password are required.', email });
		if (!email.includes('@')) return fail(400, { message: 'Please enter a valid email.', email });
		if (password.length < 8)
			return fail(400, { message: 'Password must be at least 8 characters.', email });

		// ── Rate limiting ────────────────────────────────────────
		const ip = getClientIp(event);
		const rl = checkRateLimit('signup', ip);
		if (!rl.allowed) {
			const mins = Math.ceil(rl.retryAfterSec / 60);
			return fail(429, {
				message: `Too many signup attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`,
				email,
			});
		}

		try {
			// ensure DB initialized (tables exist)
			getDb();
			const user = createUser(email, password);
			const session = createSession(user.id);

			cookies.set('sp_session', session.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
			});
		} catch (e: any) {
			// unique constraint from sqlite
			if (
				String(e?.message ?? '')
					.toLowerCase()
					.includes('unique')
			) {
				return fail(400, { message: 'An account with that email already exists.', email });
			}
			return fail(500, { message: 'Could not create account. Please try again.', email });
		}

		throw redirect(303, '/dashboard');
	},
};
