"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "/active-predictions", label: "Active predictions" },
  { href: "/past-predictions", label: "Past predictions" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/winner-predictions", label: "Winner predictions" },
];

export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
         <div className="mb-8 flex flex-col gap-4">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 p-6 text-white shadow-lg shadow-indigo-200/50">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-50">
            League dashboard
          </span>
          <h1 className="mt-3 text-4xl font-bold">Pavadas FIFA League</h1>
          <p className="mt-2 max-w-2xl text-sm text-indigo-50/90">
            Choose a player, predict match outcomes, and track your score across the league.
          </p>
        </div>
        
        <div className="border-t border-slate-200 bg-slate-50/90">
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 py-4 sm:px-6 lg:px-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-indigo-200 bg-white px-4 py-2 font-medium text-indigo-700 transition hover:bg-indigo-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>


      
    </header>
  );
}
