import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getUserBySession } from '$lib/server/auth';
import { debugLog } from '$lib/server/debuglog';

const PUBLIC_PATHS = new Set(['/', '/login', '/signup']);

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('sp_session');
	event.locals.user = token ? getUserBySession(token) : null;

	const pathname = event.url.pathname;
	// #region agent log
	fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H2',location:'src/hooks.server.ts:handle',message:'handle auth decision',data:{pathname,hasToken:Boolean(token),hasUser:Boolean(event.locals.user)},timestamp:Date.now()})}).catch(()=>{});
	debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H2',location:'src/hooks.server.ts:handle',message:'handle auth decision',data:{pathname,hasToken:Boolean(token),hasUser:Boolean(event.locals.user)},timestamp:Date.now()});
	debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H1/H2',location:'src/hooks.server.ts:handle',message:'request meta',data:{pathname,host:event.request.headers.get('host')??'',origin:event.url.origin??''},timestamp:Date.now()});
	// #endregion
	const isPublic =
		PUBLIC_PATHS.has(pathname) ||
		pathname.startsWith('/api/') || // demo/public endpoints
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/favicon') ||
		pathname.startsWith('/assets/') ||
		pathname === '/manifest.json' ||
		pathname === '/robots.txt';

	if (!isPublic && !event.locals.user) {
		// #region agent log
		fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H2',location:'src/hooks.server.ts:redirect',message:'redirecting to login',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
		debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H2',location:'src/hooks.server.ts:redirect',message:'redirecting to login',data:{pathname},timestamp:Date.now()});
		// #endregion
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	return resolve(event);
};
