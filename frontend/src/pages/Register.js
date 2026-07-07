import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { Boxes, Loader2 } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { username, email, password });
      login(data.token, data.user);
      nav("/avatar");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="matrix-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0px_#0F172A] p-8 animate-pop-in">
        <div className="flex items-center gap-2 mb-6">
          <span className="bg-blue-600 text-white p-1.5 rounded-lg border-[3px] border-slate-900">
            <Boxes size={22} strokeWidth={2.5} />
          </span>
          <span className="font-display font-black text-2xl">MATRIX</span>
        </div>
        <h1 className="font-display font-black text-3xl">Join Matrix</h1>
        <p className="text-slate-600 font-medium mt-1">Create an account & get 500 Brix free.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Username</label>
            <input
              data-testid="register-username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-4 py-3 border-[3px] border-slate-900 rounded-xl font-medium outline-none focus:ring-4 ring-blue-200"
              placeholder="BlockMaster"
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Email</label>
            <input
              data-testid="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-3 border-[3px] border-slate-900 rounded-xl font-medium outline-none focus:ring-4 ring-blue-200"
              placeholder="you@matrix.com"
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Password</label>
            <input
              data-testid="register-password"
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-3 border-[3px] border-slate-900 rounded-xl font-medium outline-none focus:ring-4 ring-blue-200"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p data-testid="register-error" className="text-sm font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            data-testid="register-submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 text-slate-900 font-black px-6 py-3 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#0F172A] transition-all disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-600 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="font-black text-blue-600 underline" data-testid="goto-login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
