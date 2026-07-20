import type { ProgressStep } from '../Game/types'

export type TutorialStepKey =
  | ProgressStep
  | 'network-interaction-seuil'

export const TUTORIAL_MESSAGES: Record<TutorialStepKey, string> = {
  'digit-selection':
    'Vous disposez d’une grille 9 × 6. Cliquez sur les cases blanches pour les remplir en noir et dessiner un chiffre. Le réseau a été conçu uniquement pour reconnaître 0, 3, 6 et 9 : il ne pourra pas identifier les autres chiffres. Validez lorsque votre dessin est prêt.',
  'grid-division':
    'Votre chiffre est découpé en six bandelettes : trois colonnes (COL) et trois lignes (LIG). Observez comment les pixels se répartissent, puis passez à l’étape suivante.',
  'pixel-counting':
    'Comptez les pixels noirs dans chaque bandelette et saisissez la valeur, ou utilisez le comptage automatique. Remplissez les six valeurs pour alimenter le réseau.',
  'network-interaction':
    'Dans le réseau, cliquez sur chaque neurone caché (A à F) pour calculer sa somme et sa sortie, puis sur les neurones de sortie (0, 3, 6, 9). Suivez le parcours de la grille jusqu’à la décision finale. Une fois toutes les valeurs calculées, passez en mode apprentissage pour ajuster les seuils.',
  'network-interaction-seuil':
    'En mode apprentissage, ajustez les curseurs pour modifier les seuils des neurones. Calibrez la reconnaissance sur les exemples de référence, y compris les cas plus difficiles.',
}
