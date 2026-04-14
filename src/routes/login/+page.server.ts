import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSession, verifyUser } from '$lib/server/auth';
import { debugLog } from '$lib/server/debuglog';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	return { redirectTo: url.searchParams.get('redirectTo') ?? '/dashboard' };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const redirectTo = String(form.get('redirectTo') ?? '/dashboard');

		// #region agent log
		fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H3',location:'src/routes/login/+page.server.ts:action',message:'login action invoked',data:{hasEmail:Boolean(email),passwordLen:password?.length??0,redirectTo:redirectTo?.slice(0,64)},timestamp:Date.now()})}).catch(()=>{});
		debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H3',location:'src/routes/login/+page.server.ts:action',message:'login action invoked',data:{hasEmail:Boolean(email),passwordLen:password?.length??0,redirectTo:redirectTo?.slice(0,64)},timestamp:Date.now()});
		// #endregion

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.', email });
		}

		const user = verifyUser(email, password);
		if (!user) return fail(400, { message: 'Invalid email or password.', email });

		const session = createSession(user.id);
		// #region agent log
		fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1',location:'src/routes/login/+page.server.ts:cookie',message:'setting session cookie',data:{secure:process.env.NODE_ENV==='production',maxAgeSec:Math.floor((session.expiresAt-Date.now())/1000)},timestamp:Date.now()})}).catch(()=>{});
		debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1',location:'src/routes/login/+page.server.ts:cookie',message:'setting session cookie',data:{secure:process.env.NODE_ENV==='production',maxAgeSec:Math.floor((session.expiresAt-Date.now())/1000)},timestamp:Date.now()});
		// #endregion
		cookies.set('sp_session', session.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
		});

		// #region agent log
		fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H2',location:'src/routes/login/+page.server.ts:redirect',message:'redirecting after login',data:{to:redirectTo.startsWith('/')?redirectTo:'/dashboard'},timestamp:Date.now()})}).catch(()=>{});
		debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H2',location:'src/routes/login/+page.server.ts:redirect',message:'redirecting after login',data:{to:redirectTo.startsWith('/')?redirectTo:'/dashboard'},timestamp:Date.now()});
		// #endregion
		throw redirect(303, redirectTo.startsWith('/') ? redirectTo : '/dashboard');
	},
};
