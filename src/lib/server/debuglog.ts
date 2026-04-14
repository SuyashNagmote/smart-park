import { appendFileSync } from 'node:fs';
import path from 'node:path';

type Payload = {
	sessionId: string;
	runId: string;
	hypothesisId: string;
	location: string;
	message: string;
	data?: Record<string, unknown>;
	timestamp: number;
};

const LOG_PATH = path.resolve(process.cwd(), 'debug-d93485.log');

export function debugLog(payload: Payload) {
	try {
		appendFileSync(LOG_PATH, JSON.stringify(payload) + '\n', 'utf8');
	} catch {
		// ignore
	}
}

