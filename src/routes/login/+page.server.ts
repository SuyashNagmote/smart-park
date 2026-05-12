import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSession, verifyUser } from '$lib/server/auth';
import { checkRateLimit, getClientIp } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	return { redirectTo: url.searchParams.get('redirectTo') ?? '/dashboard' };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies } = event;
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const redirectTo = String(form.get('redirectTo') ?? '/dashboard');

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.', email });
		}

		// ── Rate limiting ────────────────────────────────────────
		const ip = getClientIp(event);
		const rl = checkRateLimit('login', ip);
		if (!rl.allowed) {
			const mins = Math.ceil(rl.retryAfterSec / 60);
			return fail(429, {
				message: `Too many login attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`,
				email,
			});
		}

		const user = verifyUser(email, password);
		if (!user) return fail(400, { message: 'Invalid email or password.', email });

		const session = createSession(user.id);
		cookies.set('sp_session', session.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
		});

		throw redirect(303, redirectTo.startsWith('/') ? redirectTo : '/dashboard');
	},
};
