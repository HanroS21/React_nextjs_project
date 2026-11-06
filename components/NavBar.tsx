"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/weather", label: "Weather", icon: "🌤️" },
  { href: "/activity", label: "Activity", icon: "📜" },
  { href: "/account", label: "Account", icon: "🔒" },
];

const ADMIN_LINK = { href: "/users", label: "Users", icon: "👥" };

export default function NavBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

  return (
    <nav className="nav" aria-label="Main">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
        >
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}