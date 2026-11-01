import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-serif text-4xl">Page not found</h1>
      <p className="mt-2 text-sm text-neutral-500">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link href="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  );
}
