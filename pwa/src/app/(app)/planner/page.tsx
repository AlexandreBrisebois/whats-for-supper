export default function PlannerPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-pink/10 text-pink">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-pink">Weekly Planner</h1>
      <p className="max-w-xs text-charcoal-400">
        Phase 2: View and adjust your family's weekly dinner plan.
      </p>
      <div className="mt-8 rounded-lg bg-pink/5 px-4 py-2 text-sm font-medium text-pink">
        Coming Soon
      </div>
    </div>
  );
}
