import React from 'react';

interface LoaderProps {
	size?: number; // pixels
	message?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 48, message }) => {
	const stroke = Math.max(2, Math.round(size * 0.08));

	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
			<svg
				width={size}
				height={size}
				viewBox="0 0 50 50"
				role="img"
				aria-label={message || 'Loading'}
			>
				<circle cx="25" cy="25" r="20" stroke="#e6e6e6" strokeWidth={stroke} fill="none" />
				<circle
					cx="25"
					cy="25"
					r="20"
					stroke="#0b76ff"
					strokeWidth={stroke}
					strokeLinecap="round"
					fill="none"
					strokeDasharray="31.4 62.8"
					transform="rotate(-90 25 25)"
				/>
			</svg>
			{message && <div style={{ fontSize: 12, color: '#666' }}>{message}</div>}
		</div>
	);
};

export default Loader;

