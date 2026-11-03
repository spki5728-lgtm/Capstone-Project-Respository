import { NavLink, Outlet } from "react-router";

const links = [
  { to: "/", label: "Upload" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/report", label: "Report" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold">Depop Sales Insights</h1>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  isActive ? "font-semibold text-red-600" : "text-gray-600 hover:text-gray-900"
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
