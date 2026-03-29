import { type PropsWithChildren } from 'react';

type ButtonProps = {
  children: string;
  disabled?: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
};

type InputProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
};

type TextAreaProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  value: string;
};

type PillProps = PropsWithChildren<{
  active?: boolean;
  onClick?: () => void;
}>;

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({
  children,
  className = '',
}: CardProps) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Button({
  children,
  disabled = false,
  onClick,
  variant = 'primary',
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: InputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextArea({
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: TextAreaProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function Pill({
  active = false,
  children,
  onClick,
}: PillProps) {
  const content = (
    <span className={`pill ${active ? 'pill-active' : ''}`}>
      {children}
    </span>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button
      className="pill-reset"
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
}

export function EmptyState({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <Card className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
    </Card>
  );
}
