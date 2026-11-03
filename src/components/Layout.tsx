import { NavLink, Outlet } from "react-router";
import Logo from "./Logo";

const links = [
  { to: "/", label: "Upload" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/report", label: "AI Report" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex shrink-0 items-center gap-2">
            <Logo size={30} />
            <span className="hidden text-xl font-extrabold tracking-tight sm:inline">Flipcast</span>
          </NavLink>
          <nav className="flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-2.5 py-1.5 font-medium transition sm:px-3 ${
                    isActive ? "bg-white text-rose-600 shadow-sm" : "text-stone-600 hover:text-stone-900"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200/70 py-6 text-center text-xs text-stone-500">
        Flipcast · AI insights for Depop sellers · CU Boulder AI Club capstone
      </footer>
    </div>
  );
}
