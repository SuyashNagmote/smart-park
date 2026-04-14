import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSession, createUser } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { debugLog } from '$lib/server/debuglog';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		// #region agent log
		fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H3',location:'src/routes/signup/+page.server.ts:action',message:'signup action invoked',data:{hasEmail:Boolean(email),passwordLen:password?.length??0},timestamp:Date.now()})}).catch(()=>{});
		debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H3',location:'src/routes/signup/+page.server.ts:action',message:'signup action invoked',data:{hasEmail:Boolean(email),passwordLen:password?.length??0},timestamp:Date.now()});
		// #endregion

		if (!email || !password)
			return fail(400, { message: 'Email and password are required.', email });
		if (!email.includes('@')) return fail(400, { message: 'Please enter a valid email.', email });
		if (password.length < 8)
			return fail(400, { message: 'Password must be at least 8 characters.', email });

		try {
			// ensure DB initialized (tables exist)
			getDb();
			const user = createUser(email, password);
			const session = createSession(user.id);
			// #region agent log
			fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1',location:'src/routes/signup/+page.server.ts:cookie',message:'setting session cookie',data:{secure:process.env.NODE_ENV==='production',maxAgeSec:Math.floor((session.expiresAt-Date.now())/1000)},timestamp:Date.now()})}).catch(()=>{});
			debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1',location:'src/routes/signup/+page.server.ts:cookie',message:'setting session cookie',data:{secure:process.env.NODE_ENV==='production',maxAgeSec:Math.floor((session.expiresAt-Date.now())/1000)},timestamp:Date.now()});
			// #endregion
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

		// #region agent log
		fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H2',location:'src/routes/signup/+page.server.ts:redirect',message:'redirecting to dashboard after signup',data:{to:'/dashboard'},timestamp:Date.now()})}).catch(()=>{});
		debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H2',location:'src/routes/signup/+page.server.ts:redirect',message:'redirecting to dashboard after signup',data:{to:'/dashboard'},timestamp:Date.now()});
		// #endregion
		throw redirect(303, '/dashboard');
	},
};
