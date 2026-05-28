import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue text-white shadow hover:bg-blue-hover focus:ring-blue/40 border-2 border-blue',
  secondary:
    'bg-white text-blue border border-white/20 hover:bg-white/10 focus:ring-lightBlue/60',
  outline:
    'border-2 border-grey bg-transparent text-darkBlue hover:bg-grey/30 focus:ring-astro/30',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-3.5 text-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  loading?: boolean
  className?: string
}

const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      className={[
        'inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? 'Chargement...' : children}
    </button>
  )
}

export default Button
