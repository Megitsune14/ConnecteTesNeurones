import type { InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label affiché au-dessus du champ (recommandé pour l'accessibilité) */
  label?: ReactNode
  /** Id du champ, utilisé pour htmlFor du label. Si non fourni, un id unique est généré. */
  id?: string
  /** Message d'erreur ou d'état (ex: "Correct !" ou "Incorrect") */
  feedback?: ReactNode
  /** Style du feedback : 'success' (vert), 'error' (rouge), ou neutre */
  feedbackVariant?: 'success' | 'error' | 'neutral'
  className?: string
}

const feedbackClasses = {
  success: 'bg-green/20 text-green',
  error: 'bg-red/20 text-red',
  neutral: 'bg-grey/20 text-astro',
}

const Input = ({
  label,
  id: idProp,
  feedback,
  feedbackVariant = 'neutral',
  className = '',
  ...props
}: InputProps) => {
  const id = idProp ?? `input-${Math.random().toString(36).slice(2, 9)}`

  return (
    <div className="space-y-2">
      {label != null && (
        <label htmlFor={id} className="text-darkBlue font-semibold block text-sm">
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          'w-full rounded-lg border border-grey bg-white px-3 py-2 text-darkBlue font-medium transition focus:outline-none focus:ring-2 focus:ring-blue/40',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {feedback != null && (
        <div
          className={`text-center py-1 rounded text-sm ${feedbackClasses[feedbackVariant]}`}
          role="status"
        >
          {feedback}
        </div>
      )}
    </div>
  )
}

export default Input
