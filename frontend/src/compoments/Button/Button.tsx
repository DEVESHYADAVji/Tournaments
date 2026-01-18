import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;
	variant?: ButtonVariant;
	disabled?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
	primary: {
		backgroundColor: '#0b76ff',
		color: '#fff',
		border: '1px solid #0b76ff',
	},
	secondary: {
		backgroundColor: '#fff',
		color: '#0b76ff',
		border: '1px solid #0b76ff',
	},
	ghost: {
		backgroundColor: 'transparent',
		color: '#0b76ff',
		border: '1px dashed #cfdfff',
	},
};

const baseStyle: React.CSSProperties = {
	padding: '8px 14px',
	borderRadius: 6,
	fontSize: 14,
	cursor: 'pointer',
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
};

const disabledStyle: React.CSSProperties = {
	opacity: 0.6,
	cursor: 'not-allowed',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ children, variant = 'primary', disabled = false, style, ...rest }, ref) => {
		const mergedStyle: React.CSSProperties = {
			...baseStyle,
			...variantStyles[variant],
			...(disabled ? disabledStyle : {}),
			...style,
		};

		return (
			<button ref={ref} style={mergedStyle} disabled={disabled} {...rest}>
				{children}
			</button>
		);
	}
);

Button.displayName = 'Button';

export default Button;
