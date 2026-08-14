export function CardSkeleton({ lines = 3, testId }) {
  return (
    <div className="lmp-card p-5 sm:p-6" data-testid={testId}>
      <div className="lmp-skeleton h-4 w-28 mb-4" />
      <div className="lmp-skeleton h-8 w-40 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="lmp-skeleton h-3.5 w-full mb-2.5" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-skeleton">
      <div className="lmp-skeleton h-9 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton testId="credits-skeleton" />
        <CardSkeleton testId="billing-skeleton" />
      </div>
      <CardSkeleton lines={4} testId="schedule-skeleton" />
      <CardSkeleton lines={2} testId="inbox-skeleton" />
    </div>
  )
}
