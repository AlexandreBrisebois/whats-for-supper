export default function PlannerPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 flex h-40 w-40 items-center justify-center rounded-[2.5rem] bg-pink/[0.03] border border-pink/5 text-pink shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-80"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      
      <p className="max-w-xs text-sm font-medium text-charcoal-300 leading-relaxed">
        Phase 2 will allow you to view and adjust your family&apos;s weekly dinner plan with ease.
      </p>
      
      <div className="mt-10 rounded-2xl bg-pink/5 px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink border border-pink/10">
        On the Roadmap
      </div>
    </div>
  );
}
