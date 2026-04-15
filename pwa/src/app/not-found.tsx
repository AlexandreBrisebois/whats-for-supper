import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <h2 className="text-2xl font-bold text-charcoal">Page not found</h2>
      <p className="text-charcoal-400">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="rounded-xl bg-sage-green px-6 py-3 font-semibold text-cream transition-opacity hover:opacity-90"
      >
        Go home
      </Link>
    </main>
  );
}
