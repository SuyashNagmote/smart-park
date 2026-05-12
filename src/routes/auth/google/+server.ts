/**
 * GET /auth/google → Redirect user to Google OAuth consent screen
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const clientId = env.GOOGLE_CLIENT_ID;

	if (!clientId) {
		throw redirect(303, '/login?error=oauth_not_configured');
	}

	// Generate CSRF state token
	const state = crypto.randomBytes(16).toString('hex');
	cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: env.NODE_ENV === 'production',
		maxAge: 600, // 10 minutes
	});

	const redirectUri = `${url.origin}/auth/google/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		prompt: 'select_account',
	});

	throw redirect(302, `${GOOGLE_AUTH_URL}?${params.toString()}`);
};
