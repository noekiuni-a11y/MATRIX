import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Coins, Trophy, Gift, Loader2, Store, CheckCircle2 } from "lucide-react";

const CATEGORIES = ["all", "hat", "face", "shirt", "pants", "gear"];

function DailyChallenge() {
  const { refreshUser } = useAuth();
  const [state, setState] = useState({ challenge: null, claimed: false });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/challenges/daily");
      setState(data);
    } catch {}
  };
  useEffect(() => {
    load();
  }, []);

  if (!state.challenge) return null;

  const claim = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/challenges/daily/claim");
      toast.success(data.message);
      setState((s) => ({ ...s, claimed: true }));
      refreshUser();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="daily-challenge-card"
      className="bg-emerald-400 border-4 border-slate-900 rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#0F172A] relative overflow-hidden"
    >
      <Trophy className="absolute -right-4 -bottom-4 opacity-20" size={140} strokeWidth={1.5} />
      <span className="inline-block bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
        Daily Challenge
      </span>
      <h2 className="font-display font-black text-2xl md:text-3xl mt-3">{state.challenge.title}</h2>
      <p className="font-semibold text-slate-800 mt-1 max-w-lg">{state.challenge.description}</p>
      <div className="flex items-center gap-4 mt-5">
        <span className="flex items-center gap-1.5 bg-amber-400 font-black px-3 py-1.5 border-[3px] border-slate-900 rounded-xl">
          <Coins size={18} strokeWidth={2.5} /> +{state.challenge.brix_reward}
        </span>
        {state.claimed ? (
          <span data-testid="challenge-claimed" className="flex items-center gap-2 font-black text-slate-900">
            <CheckCircle2 size={20} strokeWidth={2.5} /> Claimed today!
          </span>
        ) : (
          <button
            data-testid="claim-challenge-btn"
            onClick={claim}
            disabled={busy}
            className="flex items-center gap-2 bg-white font-black px-6 py-2.5 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#0F172A] transition-all disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />} Claim reward
          </button>
        )}
      </div>
    </div>
  );
}

function PromoRedeem() {
  const { refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const redeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/promocodes/redeem", { code });
      toast.success(data.message);
      setCode("");
      refreshUser();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#0F172A]">
      <span className="inline-flex items-center gap-2 bg-pink-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
        <Gift size={14} strokeWidth={2.5} /> Promocode
      </span>
      <h2 className="font-display font-black text-2xl md:text-3xl mt-3">Got a secret code?</h2>
      <p className="font-semibold text-slate-600 mt-1">Redeem it for instant Brix.</p>
      <form onSubmit={redeem} className="flex gap-3 mt-5">
        <input
          data-testid="promo-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="MATRIX2026"
          className="flex-1 px-4 py-2.5 border-[3px] border-slate-900 rounded-xl font-bold uppercase outline-none focus:ring-4 ring-pink-200"
        />
        <button
          data-testid="promo-redeem-btn"
          disabled={busy}
          className="flex items-center gap-2 bg-pink-500 text-white font-black px-6 py-2.5 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#0F172A] transition-all disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />} Redeem
        </button>
      </form>
    </div>
  );
}

export default function Catalog() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/catalog", { params: { category: cat } })
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false));
  }, [cat]);

  return (
    <div className="matrix-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <DailyChallenge />
          <PromoRedeem />
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-blue-600 text-white p-2 rounded-xl border-[3px] border-slate-900 shadow-[3px_3px_0px_#0F172A]">
            <Store size={22} strokeWidth={2.5} />
          </span>
          <h1 className="font-display font-black text-3xl md:text-4xl">Catalog</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              data-testid={`cat-filter-${c}`}
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-xl font-black text-sm capitalize border-[3px] border-slate-900 transition-all ${
                cat === c ? "bg-slate-900 text-white" : "bg-white hover:-translate-y-0.5"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-400" size={40} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white border-4 border-dashed border-slate-300 rounded-2xl">
            <p className="font-black text-xl text-slate-400">No live items yet.</p>
            <p className="font-medium text-slate-400">Check back soon for fresh drops!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => {
              const owned = user?.owned_items?.includes(item.id);
              return (
                <Link
                  key={item.id}
                  to={`/item/${item.id}`}
                  data-testid={`catalog-item-${item.id}`}
                  className="flex flex-col bg-white border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#0F172A] hover:-translate-y-2 hover:shadow-[8px_8px_0px_#0F172A] transition-all group"
                >
                  <div className="aspect-square bg-slate-100 border-b-4 border-slate-900 p-4 relative group-hover:bg-sky-100 transition-colors">
                    {item.is_live && (
                      <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 border-2 border-slate-900 rounded-full uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                      </span>
                    )}
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Store size={48} />
                      </div>
                    )}
                    {owned && (
                      <span className="absolute bottom-2 right-2 bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 border-2 border-slate-900 rounded-full uppercase">
                        Owned
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <h3 className="font-display font-black text-base leading-tight line-clamp-1">{item.name}</h3>
                    <span className="mt-auto flex items-center gap-1.5 text-amber-600 font-black">
                      <Coins size={16} strokeWidth={2.5} /> {item.price.toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
