import type { HTMLAttributes, ReactNode } from 'react'

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Id pour ancrage (ex: #accueil) */
  id?: string
  /** Animation d'entrée fade-in-up */
  animate?: boolean
  /** Utiliser le style "carte" (fond blanc, bordure, ombre). Sinon, section sans fond. */
  asCard?: boolean
  className?: string
}

const Section = ({
  children,
  id,
  animate = false,
  asCard = true,
  className = '',
  ...props
}: SectionProps) => {
  const baseClasses = asCard
    ? 'rounded-2xl bg-white border border-grey p-8 shadow-sm'
    : ''
  const animationClass = animate ? 'animate-fade-in-up' : ''

  return (
    <section
      id={id}
      className={[baseClasses, animationClass, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </section>
  )
}

export default Section
