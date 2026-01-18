// Typed access to environment variables (Vite's import.meta.env)
export const VITE_API_BASE_URL: string = (
	(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api'
) as string;

export const VITE_APP_NAME: string = ((import.meta as any).env?.VITE_APP_NAME || 'Tournaments') as string;

export const VITE_NODE_ENV: string = ((import.meta as any).env?.MODE || 'development') as string;

export default {
	VITE_API_BASE_URL,
	VITE_APP_NAME,
	VITE_NODE_ENV,
};

