import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Coins, Store, UserCircle2, Shirt, Shield, LogOut, Boxes } from "lucide-react";

const brixBadge =
  "flex items-center gap-1.5 bg-amber-400 text-slate-900 font-black px-3 py-1.5 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A]";

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  if (!user) return null;

  const links = [
    { to: "/catalog", label: "Catalog", icon: Store, id: "nav-catalog" },
    { to: "/avatar", label: "Avatar", icon: Shirt, id: "nav-avatar" },
    { to: `/u/${user.username}`, label: "Profile", icon: UserCircle2, id: "nav-profile" },
  ];
  if (user.role === "admin") links.push({ to: "/admin", label: "Admin", icon: Shield, id: "nav-admin" });

  return (
    <header className="bg-white border-b-4 border-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between gap-4">
        <Link to="/catalog" data-testid="nav-logo" className="flex items-center gap-2 group">
          <span className="bg-blue-600 text-white p-1.5 rounded-lg border-[3px] border-slate-900 shadow-[3px_3px_0px_#0F172A] group-hover:rotate-6 transition-transform">
            <Boxes size={22} strokeWidth={2.5} />
          </span>
          <span className="font-display font-black text-2xl tracking-tight">MATRIX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = loc.pathname === l.to;
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={l.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border-[3px] ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-transparent hover:border-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} strokeWidth={2.5} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className={brixBadge} data-testid="brix-balance">
            <Coins size={18} strokeWidth={2.5} />
            {(user.brix ?? 0).toLocaleString()}
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => {
              logout();
              nav("/login");
            }}
            className="p-2 border-[3px] border-slate-900 rounded-xl hover:bg-pink-500 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {links.map((l) => {
          const active = loc.pathname === l.to;
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap border-2 ${
                active ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"
              }`}
            >
              <Icon size={15} strokeWidth={2.5} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
