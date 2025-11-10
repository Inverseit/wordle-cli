"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type PropsWithChildren } from "react";

const NAV_ITEMS = [
  { href: "/play", label: "Жаңа ойын" },
  { href: "/bot", label: "Бот анализі" },
  { href: "/manual", label: "Қолмен анализ" },
];

export function PageShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen w-full text-tile">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.4rem] text-white/60">
              Wordle(6) · Қазақша
            </span>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">
              Энтропия зертханасы
            </h1>
          </div>
          <nav className="flex gap-2">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-8">
        {children}
      </main>
    </div>
  );
}

