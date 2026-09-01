interface SkeletonProps {
  width?: string
  height?: string
  className?: string
  circle?: boolean
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  circle = false,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${circle ? 'skeleton--circle' : ''} ${className}`}
      style={{ width, height }}
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <Skeleton height="120px" className="skeleton--rounded-lg" />
      <div className="dashboard-skeleton__grid">
        <Skeleton height="80px" className="skeleton--rounded" />
        <Skeleton height="80px" className="skeleton--rounded" />
        <Skeleton height="80px" className="skeleton--rounded" />
        <Skeleton height="80px" className="skeleton--rounded" />
      </div>
      <Skeleton height="200px" className="skeleton--rounded-lg" />
      <Skeleton height="160px" className="skeleton--rounded-lg" />
    </div>
  )
}
