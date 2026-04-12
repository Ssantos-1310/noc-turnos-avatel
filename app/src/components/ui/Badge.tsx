import type { ShiftType } from '../../types'
import { SHIFT_LABELS } from '../../constants'

interface BadgeProps {
  type: ShiftType
  onClick?: () => void
  selected?: boolean
  className?: string
}

/**
 * Muestra el código de turno con los colores correctos.
 * Clases CSS definidas en styles/components.css (.badge, .badge-M, etc.)
 */
export function Badge({ type, onClick, selected, className = '' }: BadgeProps) {
  const label = type || '·'
  const badgeClass = type
    ? `badge badge-${type}`
    : 'badge badge-empty'

  const selectedClass = selected ? 'td-selected' : ''

  return (
    <span
      className={`${badgeClass} ${selectedClass} ${className}`.trim()}
      title={type ? SHIFT_LABELS[type] : ''}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {label}
    </span>
  )
}
