/**
 * GET /auth/google/callback → Handle Google OAuth callback
 * Exchanges auth code for tokens, extracts user info, creates session.
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findOrCreateGoogleUser, createSession } from '$lib/server/auth';
import { env } from '$env/dynamic/private';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	const savedState = cookies.get('oauth_state');

	// Clean up state cookie
	cookies.delete('oauth_state', { path: '/' });

	// Handle errors from Google
	if (error) {
		throw redirect(303, `/login?error=${encodeURIComponent(error)}`);
	}

	// Validate CSRF state
	if (!state || !savedState || state !== savedState) {
		throw redirect(303, '/login?error=invalid_state');
	}

	if (!code) {
		throw redirect(303, '/login?error=no_code');
	}

	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw redirect(303, '/login?error=oauth_not_configured');
	}

	const redirectUri = `${url.origin}/auth/google/callback`;

	try {
		// Exchange code for tokens
		const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			}),
		});

		if (!tokenRes.ok) {
			throw redirect(303, '/login?error=token_exchange_failed');
		}

		const tokens = (await tokenRes.json()) as { access_token: string };

		// Fetch user info
		const userRes = await fetch(GOOGLE_USERINFO_URL, {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		});

		if (!userRes.ok) {
			throw redirect(303, '/login?error=userinfo_failed');
		}

		const profile = (await userRes.json()) as {
			id: string;
			email: string;
			verified_email: boolean;
		};

		if (!profile.email || !profile.verified_email) {
			throw redirect(303, '/login?error=email_not_verified');
		}

		// Find or create user + create session
		const user = findOrCreateGoogleUser(profile.id, profile.email);
		const session = createSession(user.id);

		cookies.set('sp_session', session.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: env.NODE_ENV === 'production',
			maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
		});

		throw redirect(303, '/dashboard');
	} catch (e: any) {
		// Re-throw SvelteKit redirects
		if (e?.status && e?.location) throw e;
		throw redirect(303, '/login?error=oauth_failed');
	}
};
