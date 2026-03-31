'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Navigation() {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 nav-frosted px-6 py-3 flex items-center gap-8">
      <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--accent)]" style={{ fontFamily: 'var(--font-display)' }}>
        <Image src="/tory-logo.png" alt="Tory" width={28} height={28} className="rounded-full" />
        TORY
      </Link>
      <div className="w-px h-4 bg-[var(--accent)]/20" />
      <span className="tag-muted hidden sm:block">Crypto Intelligence</span>
    </nav>
  );
}
