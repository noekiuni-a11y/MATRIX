import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Coins, Loader2, Sparkles, CheckCircle2, XCircle } from "lucide-react";

const COLORS = ["bg-blue-500", "bg-pink-500", "bg-emerald-400", "bg-amber-400"];

export default function BuyBrix() {
  const { refreshUser } = useAuth();
  const [packages, setPackages] = useState([]);
  const [buying, setBuying] = useState(null);
  const [params, setParams] = useSearchParams();
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null); // 'success' | 'failed'
  const nav = useNavigate();

  useEffect(() => {
    api.get("/payments/packages").then(({ data }) => setPackages(data));
  }, []);

  const poll = useCallback(
    async (sessionId, attempt = 0) => {
      if (attempt >= 8) {
        setPolling(false);
        setResult("failed");
        toast.error("Payment status timed out. If charged, your Brix will arrive shortly.");
        return;
      }
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setPolling(false);
          setResult("success");
          toast.success(`Payment complete! +${data.brix} Brix added.`);
          refreshUser();
          return;
        }
        if (data.status === "expired") {
          setPolling(false);
          setResult("failed");
          toast.error("Payment session expired.");
          return;
        }
        setTimeout(() => poll(sessionId, attempt + 1), 2000);
      } catch {
        setTimeout(() => poll(sessionId, attempt + 1), 2000);
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (sessionId) {
      setPolling(true);
      poll(sessionId);
    }
  }, [params, poll]);

  const buy = async (pkgId) => {
    setBuying(pkgId);
    try {
      const { data } = await api.post("/payments/checkout", {
        package_id: pkgId,
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      setBuying(null);
    }
  };

  if (polling) {
    return (
      <div className="matrix-bg min-h-screen flex items-center justify-center">
        <div className="bg-white border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0px_#0F172A] p-10 text-center">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={48} />
          <h2 className="font-display font-black text-2xl mt-4">Confirming payment…</h2>
          <p className="font-semibold text-slate-600 mt-1">Hang tight, crediting your Brix.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="matrix-bg min-h-screen flex items-center justify-center p-4">
        <div className="bg-white border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0px_#0F172A] p-10 text-center max-w-md animate-pop-in">
          {result === "success" ? (
            <CheckCircle2 className="mx-auto text-emerald-500" size={64} strokeWidth={2.5} />
          ) : (
            <XCircle className="mx-auto text-red-500" size={64} strokeWidth={2.5} />
          )}
          <h2 className="font-display font-black text-3xl mt-4">
            {result === "success" ? "Brix added!" : "Payment not completed"}
          </h2>
          <p className="font-semibold text-slate-600 mt-2">
            {result === "success"
              ? "Your balance has been topped up. Go spend it in the catalog!"
              : "No charge was made. You can try again anytime."}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              data-testid="buybrix-done-btn"
              onClick={() => {
                setResult(null);
                setParams({});
                nav("/catalog");
              }}
              className="bg-blue-600 text-white font-black px-6 py-3 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0F172A] transition-all"
            >
              Go to catalog
            </button>
            <button
              onClick={() => {
                setResult(null);
                setParams({});
              }}
              className="bg-white font-black px-6 py-3 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0F172A] transition-all"
            >
              Buy more
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="matrix-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 text-xs font-black px-3 py-1 border-2 border-slate-900 rounded-full uppercase tracking-wider">
            <Sparkles size={14} strokeWidth={2.5} /> Top up
          </span>
          <h1 className="font-display font-black text-4xl md:text-5xl mt-4">Buy Brix</h1>
          <p className="text-lg font-semibold text-slate-600 mt-3">
            Grab a pack and unlock limited items before they sell out.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {packages.map((p, i) => (
            <div
              key={p.id}
              data-testid={`brix-package-${p.id}`}
              className="flex flex-col bg-white border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#0F172A] hover:-translate-y-2 hover:shadow-[8px_8px_0px_#0F172A] transition-all"
            >
              <div className={`${COLORS[i % COLORS.length]} border-b-4 border-slate-900 p-6 flex flex-col items-center`}>
                <Coins size={40} strokeWidth={2.5} className="text-slate-900" />
                <p className="font-display font-black text-3xl mt-2 text-slate-900">{p.brix.toLocaleString()}</p>
                {p.bonus > 0 && (
                  <span className="mt-1 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    +{p.bonus} bonus
                  </span>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-display font-black text-lg">{p.label}</h3>
                <p className="font-black text-2xl mt-1">${p.usd.toFixed(2)}</p>
                <button
                  data-testid={`buy-package-${p.id}`}
                  onClick={() => buy(p.id)}
                  disabled={buying === p.id}
                  className="mt-4 flex items-center justify-center gap-2 bg-amber-400 text-slate-900 font-black px-4 py-2.5 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#0F172A] transition-all disabled:opacity-60"
                >
                  {buying === p.id ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} strokeWidth={2.5} />}
                  Buy now
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-bold text-slate-400 mt-8">
          Payments securely handled by Stripe. Test mode — use card 4242 4242 4242 4242.
        </p>
      </div>
    </div>
  );
}
