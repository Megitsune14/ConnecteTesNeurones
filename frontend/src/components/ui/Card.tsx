import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Padding interne : 'normal' (p-6) ou 'large' (p-8) */
  padding?: 'normal' | 'large'
  /** Effet hover (shadow-md au survol) */
  hover?: boolean
  className?: string
}

const paddingClasses = {
  normal: 'p-6',
  large: 'p-8',
}

const Card = ({
  children,
  padding = 'normal',
  hover = false,
  className = '',
  ...props
}: CardProps) => {
  return (
    <div
      className={[
        'rounded-2xl border border-grey bg-white shadow-sm transition',
        paddingClasses[padding],
        hover ? 'hover:shadow-md' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
