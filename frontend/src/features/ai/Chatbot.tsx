import React, { useEffect, useRef, useState } from 'react';

type Sender = 'user' | 'bot';

interface Message {
	id: string;
	sender: Sender;
	text: string;
	timestamp: string;
}

const Chatbot: React.FC = () => {
	const [messages, setMessages] = useState<Message[]>([
		{
			id: 'm1',
			sender: 'bot',
			text: 'Hello — I am an assistant. Ask me anything about tournaments.',
			timestamp: new Date().toISOString(),
		},
	]);

	const [input, setInput] = useState('');
	const listRef = useRef<HTMLDivElement | null>(null);

	const sendMessage = (text: string) => {
		const trimmed = text.trim();
		if (!trimmed) return;

		const userMsg: Message = {
			id: String(Date.now()),
			sender: 'user',
			text: trimmed,
			timestamp: new Date().toISOString(),
		};

		setMessages((prev) => [...prev, userMsg]);
		setInput('');

		// Simulate a bot reply (no backend integration yet)
		setTimeout(() => {
			const botMsg: Message = {
				id: String(Date.now() + 1),
				sender: 'bot',
				text: `Bot: I received "${trimmed}" (this is a simulated reply).`,
				timestamp: new Date().toISOString(),
			};
			setMessages((prev) => [...prev, botMsg]);
		}, 700);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		sendMessage(input);
	};

	useEffect(() => {
		// Auto-scroll to bottom when messages change
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	}, [messages]);

	return (
		<div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
			<h3>AI Chatbot</h3>

			<div
				ref={listRef}
				style={{
					height: 360,
					overflowY: 'auto',
					border: '1px solid #e6e6e6',
					padding: 12,
					borderRadius: 8,
					background: '#fff',
				}}
				aria-live="polite"
			>
				{messages.map((m) => (
					<div
						key={m.id}
						style={{
							display: 'flex',
							justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
							marginBottom: 10,
						}}
					>
						<div
							style={{
								maxWidth: '75%',
								padding: '8px 10px',
								borderRadius: 8,
								background: m.sender === 'user' ? '#0b76ff' : '#f2f2f2',
								color: m.sender === 'user' ? '#fff' : '#000',
							}}
						>
							<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
							<div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
								{new Date(m.timestamp).toLocaleTimeString()}
							</div>
						</div>
					</div>
				))}
			</div>

			<form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
				<input
					aria-label="Message input"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type a message and press Enter or Send"
					style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
				/>
				<button type="submit" disabled={!input.trim()} style={{ padding: '8px 12px' }}>
					Send
				</button>
			</form>
		</div>
	);
};

export default Chatbot;

