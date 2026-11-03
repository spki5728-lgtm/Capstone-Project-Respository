import { ExternalLink, LogOut } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { depopShopUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ProfileProvider, useProfile } from "../lib/profile";
import Logo from "./Logo";

const links = [
  { to: "/", label: "Upload" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/report", label: "AI Report" },
];

export default function Layout() {
  return (
    <ProfileProvider>
      <div className="flex min-h-screen flex-col text-stone-900">
        <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
            <NavLink to="/" className="flex shrink-0 items-center gap-2">
              <Logo size={30} />
              <span className="hidden text-xl font-extrabold tracking-tight md:inline">Flipcast</span>
            </NavLink>
            <div className="flex items-center gap-2">
              <nav className="flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end
                    className={({ isActive }) =>
                      `whitespace-nowrap rounded-full px-2 py-1.5 font-medium transition sm:px-3 ${
                        isActive ? "bg-white text-rose-600 shadow-sm" : "text-stone-600 hover:text-stone-900"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <AccountMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          <Outlet />
        </main>
        <footer className="border-t border-stone-200/70 py-6 text-center text-xs text-stone-500">
          Flipcast · AI insights for Depop sellers · CU Boulder AI Club capstone
        </footer>
      </div>
    </ProfileProvider>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <details className="relative">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-sm font-bold text-white shadow-md shadow-rose-500/20 [&::-webkit-details-marker]:hidden"
        aria-label="Account menu"
      >
        {initial}
      </summary>
      <div className="card absolute right-0 mt-2 w-60 p-2 text-sm">
        <div className="truncate px-3 py-2 text-stone-500">{user?.email}</div>
        {profile?.depopHandle && (
          <a
            href={depopShopUrl(profile.depopHandle)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2 font-medium hover:bg-stone-100"
          >
            My Depop page (@{profile.depopHandle}) <ExternalLink size={14} />
          </a>
        )}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium hover:bg-stone-100"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </details>
  );
}
