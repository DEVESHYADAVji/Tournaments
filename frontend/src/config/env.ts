// Typed access to environment variables (Vite's import.meta.env)
// Defaults to localhost with standard development ports
export const VITE_API_BASE_URL: string = (
	import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
) as string;

export const VITE_HELP_CHATBOT_BASE_URL: string = (
	import.meta.env.VITE_HELP_CHATBOT_BASE_URL || 'http://localhost:8002'
) as string;

export const VITE_OCR_SERVICE_BASE_URL: string = (
	import.meta.env.VITE_OCR_SERVICE_BASE_URL || 'http://localhost:8001'
) as string;

export const VITE_APP_NAME: string = (import.meta.env.VITE_APP_NAME || 'Tournaments') as string;

export const VITE_NODE_ENV: string = (import.meta.env.MODE || 'development') as string;

export default {
	VITE_API_BASE_URL,
	VITE_HELP_CHATBOT_BASE_URL,
	VITE_OCR_SERVICE_BASE_URL,
	VITE_APP_NAME,
	VITE_NODE_ENV,
};
