const Skeleton = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'animate-pulse bg-gray-200'

  const variants = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  )
}

export const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <Skeleton className="h-4 w-1/4 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}

export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export const SkeletonForm = ({ fields = 4 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-1/4 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
