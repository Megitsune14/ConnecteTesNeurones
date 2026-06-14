interface MiniDigitGridProps {
  pattern: number[][]
  cellPx?: number
  className?: string
  'aria-label'?: string
}

const MiniDigitGrid = ({
  pattern,
  cellPx = 2,
  className = '',
  'aria-label': ariaLabel,
}: MiniDigitGridProps) => (
  <div
    className={[
      'inline-flex flex-col gap-px rounded border border-grey/80 bg-grey p-0.5 shadow-sm',
      className,
    ].join(' ')}
    aria-hidden={ariaLabel ? undefined : true}
    aria-label={ariaLabel}
  >
    {pattern.map((row, rowIndex) => (
      <div key={rowIndex} className="flex gap-px">
        {row.map((pixel, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={pixel === 1 ? 'bg-black' : 'bg-grey/60'}
            style={{
              width: cellPx,
              height: cellPx,
            }}
          />
        ))}
      </div>
    ))}
  </div>
)

export default MiniDigitGrid
