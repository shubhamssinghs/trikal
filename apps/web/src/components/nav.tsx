import Link from "next/link";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/companies", label: "Companies" },
  { href: "/projects", label: "Projects" },
];

export function Nav({ active }: { active?: string }) {
  return (
    <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
      <Link href="/" className="font-semibold text-white">Trikal</Link>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href}
          className={`text-sm ${active === l.href ? "text-white" : "text-gray-400 hover:text-white"}`}>
          {l.label}
        </Link>
      ))}
      <Link href="/settings"
        className={`text-sm ml-auto ${active === "/settings" ? "text-white" : "text-gray-400 hover:text-white"}`}>
        Settings
      </Link>
    </nav>
  );
}
