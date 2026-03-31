'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { gsap } from 'gsap';

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Animate overlay items
  useEffect(() => {
    if (menuOpen) {
      gsap.from('.menu-item', {
        y: 30, opacity: 0, duration: 0.4,
        ease: 'power3.out', stagger: 0.06, delay: 0.1,
      });
    }
  }, [menuOpen]);

  return (
    <>
      {/* ── Desktop nav ── */}
      <nav className="hidden sm:flex fixed top-4 left-1/2 -translate-x-1/2 z-50 nav-frosted px-3 py-2.5 items-center gap-1">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold tracking-tight text-[var(--accent)]" style={{ fontFamily: 'var(--font-display)' }}>
          <Image src="/tory-logo.png" alt="Tory" width={26} height={26} className="rounded-full" />
          TORY
        </Link>

        <div className="w-px h-4 bg-[var(--text)]/10 mx-1" />

        {isHome ? (
          <>
            <a href="#features" className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors rounded-full hover:bg-[var(--text)]/5 whitespace-nowrap">
              Features
            </a>
            <a href="#how-it-works" className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors rounded-full hover:bg-[var(--text)]/5 whitespace-nowrap">
              How It Works
            </a>
            <a href="#faq" className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors rounded-full hover:bg-[var(--text)]/5 whitespace-nowrap">
              FAQ
            </a>
          </>
        ) : (
          <Link href="/" className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors rounded-full hover:bg-[var(--text)]/5">
            Home
          </Link>
        )}

        <Link href="/search" className="ml-1 text-xs font-semibold !py-2 !px-5 text-white whitespace-nowrap rounded-full" style={{ background: 'linear-gradient(135deg, #8196FF, #5870F7, #3448C5)' }}>
          Analyze Token
        </Link>
      </nav>

      {/* ── Mobile nav — floating pill ── */}
      <nav className="sm:hidden fixed top-4 left-4 right-4 z-50 flex items-center justify-between px-3 py-2.5 rounded-full" style={{ background: 'rgba(14, 14, 14, 0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--accent)]" style={{ fontFamily: 'var(--font-display)' }}>
          <Image src="/tory-logo.png" alt="Tory" width={28} height={28} className="rounded-full" />
          TORY
        </Link>

        <div className="flex items-center gap-3">
          {/* Hamburger / Close */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]"
          >
            {menuOpen ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path d="M1 1H15M1 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile overlay menu ── */}
      {menuOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 flex flex-col pt-20"
          style={{ background: 'rgba(14, 14, 14, 0.97)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex-1 flex flex-col justify-center px-8 gap-2">
            {isHome ? (
              <>
                <a href="#features" className="menu-item display text-4xl text-[var(--text)] py-3 hover:text-[var(--accent)] transition-colors">Features</a>
                <a href="#how-it-works" className="menu-item display text-4xl text-[var(--text)] py-3 hover:text-[var(--accent)] transition-colors">How It Works</a>
                <a href="#faq" className="menu-item display text-4xl text-[var(--text)] py-3 hover:text-[var(--accent)] transition-colors">FAQ</a>
              </>
            ) : (
              <Link href="/" className="menu-item display text-4xl text-[var(--text)] py-3 hover:text-[var(--accent)] transition-colors">Home</Link>
            )}
            <div className="h-px bg-[var(--border)] my-4" />
            <Link href="/search" className="menu-item display text-4xl text-[var(--accent)] py-3">
              Analyze Token →
            </Link>
          </div>

          <div className="px-8 pb-8">
            <p className="text-xs text-[var(--text-dim)]">Statistical analysis only. Not financial advice.</p>
          </div>
        </div>
      )}
    </>
  );
}
