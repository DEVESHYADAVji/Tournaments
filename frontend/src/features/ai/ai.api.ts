import httpClient from '../../services/http';

export interface SendMessageRequest {
	message: string;
	context?: any;
}

export interface SendMessageResponse {
	success: boolean;
	reply: string;
	raw?: any;
}

const AI_ENDPOINTS = {
	SEND: '/ai/message',
};

/**
 * Send a message to the AI service.
 * Tries the network; on failure returns a simulated reply.
 */
export const sendMessage = async (payload: SendMessageRequest): Promise<SendMessageResponse> => {
	try {
		const resp = await httpClient.post(AI_ENDPOINTS.SEND, payload);
		const data: any = resp.data;

		// Normalize common shapes
		if (data && typeof data.reply === 'string') {
			return { success: true, reply: data.reply, raw: data };
		}

		if (data && data.data && typeof data.data.reply === 'string') {
			return { success: true, reply: data.data.reply, raw: data };
		}

		if (typeof data === 'string') {
			return { success: true, reply: data, raw: data };
		}

		return { success: true, reply: JSON.stringify(data), raw: data };
	} catch (error) {
		console.error('AI sendMessage failed, returning simulated reply', error);

		// Fallback simulated reply
		const simulatedReply = `Simulated reply: I received "${payload.message}"`;
		return { success: false, reply: simulatedReply, raw: null };
	}
};

export default {
	sendMessage,
};

