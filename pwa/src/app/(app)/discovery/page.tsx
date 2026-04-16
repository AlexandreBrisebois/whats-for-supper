export default function DiscoveryPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-indigo/10 text-indigo">
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
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-indigo">Discovery Mode</h1>
      <p className="max-w-xs text-charcoal-400">
        Phase 3: Swipe through your family's favorite recipes to build the weekly inspiration pool.
      </p>
      <div className="mt-8 rounded-lg bg-lavender-200 px-4 py-2 text-sm font-medium text-indigo">
        Coming Soon
      </div>
    </div>
  );
}
