import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Coins, Loader2, ArrowLeft, CheckCircle2, Store } from "lucide-react";

export default function ItemDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refreshUser } = useAuth();
  const [item, setItem] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/catalog/${id}`).then(({ data }) => setItem(data)).catch(() => nav("/catalog"));
  }, [id, nav]);

  if (!item) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  const owned = user?.owned_items?.includes(item.id);
  const affordable = (user?.brix ?? 0) >= item.price;
  const soldOut = item.status === "limited" && item.sold_out;
  const offsale = item.status === "offsale";
  const purchasable = !owned && !soldOut && !offsale && affordable;

  const buyLabel = offsale
    ? "Off sale"
    : soldOut
    ? "Sold out"
    : affordable
    ? "Buy now"
    : "Not enough Brix";

  const buy = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/catalog/${item.id}/buy`);
      toast.success(data.message);
      refreshUser();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="matrix-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <Link to="/catalog" data-testid="back-to-catalog" className="inline-flex items-center gap-2 font-black mb-6 hover:underline">
          <ArrowLeft size={18} strokeWidth={2.5} /> Back to catalog
        </Link>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-sky-100 border-4 border-slate-900 rounded-3xl p-8 shadow-[6px_6px_0px_#0F172A] aspect-square flex items-center justify-center relative">
            {item.status === "limited" && (
              <span className="absolute top-4 left-4 flex items-center gap-1 bg-amber-400 text-slate-900 text-xs font-black px-3 py-1 border-2 border-slate-900 rounded-full uppercase">
                {item.sold_out ? "Sold Out" : `Limited · ${item.remaining} left`}
              </span>
            )}
            {item.status === "offsale" && (
              <span className="absolute top-4 left-4 bg-slate-900 text-white text-xs font-black px-3 py-1 border-2 border-slate-900 rounded-full uppercase">
                Off Sale
              </span>
            )}
            {item.status === "sale" && item.is_live && (
              <span className="absolute top-4 left-4 flex items-center gap-1 bg-red-500 text-white text-xs font-black px-3 py-1 border-2 border-slate-900 rounded-full uppercase">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Live
              </span>
            )}
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-contain" data-testid="item-image" />
            ) : (
              <Store size={80} className="text-slate-300" />
            )}
          </div>

          <div>
            <span className="inline-block bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider capitalize">
              {item.category}
            </span>
            <h1 data-testid="item-name" className="font-display font-black text-4xl mt-3">{item.name}</h1>
            <p className="font-semibold text-slate-600 mt-3">{item.description || "A fresh Matrix collectible."}</p>

            <div className="flex items-center gap-2 mt-6 bg-amber-400 border-4 border-slate-900 rounded-2xl px-5 py-3 shadow-[4px_4px_0px_#0F172A] w-fit">
              <Coins size={28} strokeWidth={2.5} />
              <span data-testid="item-price" className="font-display font-black text-3xl">{item.price.toLocaleString()}</span>
              <span className="font-black text-lg">Brix</span>
            </div>

            <div className="mt-6">
              {owned ? (
                <div data-testid="item-owned" className="flex items-center gap-2 bg-emerald-400 border-4 border-slate-900 rounded-xl px-5 py-3 font-black w-fit shadow-[4px_4px_0px_#0F172A]">
                  <CheckCircle2 size={22} strokeWidth={2.5} /> You own this — equip it in the Avatar editor!
                </div>
              ) : (
                <button
                  data-testid="buy-item-btn"
                  onClick={buy}
                  disabled={busy || !purchasable}
                  className="flex items-center gap-2 bg-blue-600 text-white font-black px-8 py-3.5 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0F172A] transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#0F172A]"
                >
                  {busy && <Loader2 size={18} className="animate-spin" />}
                  {buyLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
