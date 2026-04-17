import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ glass = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={['rounded-2xl p-6 shadow-card', glass ? 'glass' : 'bg-white', className].join(' ')}
    >
      {children}
    </div>
  );
}
