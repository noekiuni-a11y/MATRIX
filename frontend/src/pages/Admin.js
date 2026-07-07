import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Loader2, Store, Gift, Trophy, Users, Upload } from "lucide-react";

const TABS = [
  { id: "items", label: "Items", icon: Store },
  { id: "promos", label: "Promocodes", icon: Gift },
  { id: "challenges", label: "Challenges", icon: Trophy },
];

const inputCls = "w-full px-4 py-2.5 border-[3px] border-slate-900 rounded-xl font-medium outline-none focus:ring-4 ring-blue-200";
const btnPrimary = "flex items-center gap-2 bg-blue-600 text-white font-black px-6 py-2.5 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#0F172A] transition-all disabled:opacity-60";
const card = "bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A]";

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className={`${card} flex items-center gap-4`}>
      <span className={`p-3 rounded-xl border-[3px] border-slate-900 ${color}`}>
        <Icon size={22} strokeWidth={2.5} />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="font-display font-black text-2xl">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function ItemsTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: 100, category: "hat", is_live: true, image: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/catalog", { params: { all: true } }).then(({ data }) => setItems(data));
  useEffect(() => {
    load();
  }, []);

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/catalog", { ...form, price: Number(form.price) });
      toast.success("Item created!");
      setForm({ name: "", description: "", price: 100, category: "hat", is_live: true, image: "" });
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/admin/catalog/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <form onSubmit={create} className={`${card} lg:col-span-2 space-y-4 h-fit`}>
        <h3 className="font-display font-black text-xl">New Item</h3>
        <input data-testid="item-name-input" className={inputCls} placeholder="Item name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <textarea data-testid="item-desc-input" className={inputCls} placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input data-testid="item-price-input" type="number" min={0} className={inputCls} placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <select data-testid="item-category-input" className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["hat", "face", "shirt", "pants", "gear"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 font-bold cursor-pointer">
          <input data-testid="item-live-input" type="checkbox" className="w-5 h-5 accent-blue-600" checked={form.is_live} onChange={(e) => setForm({ ...form, is_live: e.target.checked })} />
          Live (visible in catalog)
        </label>
        <label className="flex items-center gap-2 bg-slate-100 border-[3px] border-dashed border-slate-400 rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-slate-200">
          <Upload size={18} /> Upload image
          <input data-testid="item-image-input" type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        {form.image && <img src={form.image} alt="preview" className="w-24 h-24 object-contain border-[3px] border-slate-900 rounded-xl bg-slate-100 p-1" />}
        <button data-testid="create-item-btn" disabled={busy} className={btnPrimary}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />} Create item
        </button>
      </form>

      <div className="lg:col-span-3 space-y-3">
        <h3 className="font-display font-black text-xl">All Items ({items.length})</h3>
        {items.map((i) => (
          <div key={i.id} data-testid={`admin-item-${i.id}`} className="flex items-center gap-4 bg-white border-[3px] border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_#0F172A]">
            <div className="w-14 h-14 bg-slate-100 border-2 border-slate-900 rounded-lg p-1 flex items-center justify-center shrink-0">
              {i.image ? <img src={i.image} alt={i.name} className="w-full h-full object-contain" /> : <Store size={20} className="text-slate-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black truncate">{i.name}</p>
              <p className="text-sm font-bold text-amber-600">{i.price} Brix · <span className="capitalize text-slate-500">{i.category}</span> {i.is_live ? "· 🔴 Live" : "· Hidden"}</p>
            </div>
            <button data-testid={`delete-item-${i.id}`} onClick={() => remove(i.id)} className="p-2 border-2 border-slate-900 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromosTab() {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState({ code: "", brix_reward: 100, max_uses: 100, active: true });
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/admin/promocodes").then(({ data }) => setPromos(data));
  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/promocodes", { ...form, brix_reward: Number(form.brix_reward), max_uses: Number(form.max_uses) });
      toast.success("Promocode created!");
      setForm({ code: "", brix_reward: 100, max_uses: 100, active: true });
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/admin/promocodes/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <form onSubmit={create} className={`${card} lg:col-span-2 space-y-4 h-fit`}>
        <h3 className="font-display font-black text-xl">New Promocode</h3>
        <input data-testid="promo-code-input" className={`${inputCls} uppercase`} placeholder="MATRIX2026" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase text-slate-500">Brix reward</label>
            <input data-testid="promo-reward-input" type="number" min={1} className={inputCls} value={form.brix_reward} onChange={(e) => setForm({ ...form, brix_reward: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-500">Max uses</label>
            <input data-testid="promo-maxuses-input" type="number" min={1} className={inputCls} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
          </div>
        </div>
        <button data-testid="create-promo-btn" disabled={busy} className={btnPrimary}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />} Create code
        </button>
      </form>

      <div className="lg:col-span-3 space-y-3">
        <h3 className="font-display font-black text-xl">All Codes ({promos.length})</h3>
        {promos.map((p) => (
          <div key={p.id} data-testid={`admin-promo-${p.id}`} className="flex items-center gap-4 bg-white border-[3px] border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_#0F172A]">
            <div className="flex-1 min-w-0">
              <p className="font-black font-mono truncate">{p.code}</p>
              <p className="text-sm font-bold text-slate-500">+{p.brix_reward} Brix · {p.uses}/{p.max_uses} used</p>
            </div>
            <button data-testid={`delete-promo-${p.id}`} onClick={() => remove(p.id)} className="p-2 border-2 border-slate-900 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChallengesTab() {
  const [challenges, setChallenges] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", brix_reward: 50, active: true });
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/admin/challenges").then(({ data }) => setChallenges(data));
  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/challenges", { ...form, brix_reward: Number(form.brix_reward) });
      toast.success("Challenge created & set active!");
      setForm({ title: "", description: "", brix_reward: 50, active: true });
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/admin/challenges/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <form onSubmit={create} className={`${card} lg:col-span-2 space-y-4 h-fit`}>
        <h3 className="font-display font-black text-xl">New Daily Challenge</h3>
        <input data-testid="challenge-title-input" className={inputCls} placeholder="Log in today!" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea data-testid="challenge-desc-input" className={inputCls} placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div>
          <label className="text-xs font-black uppercase text-slate-500">Brix reward</label>
          <input data-testid="challenge-reward-input" type="number" min={1} className={inputCls} value={form.brix_reward} onChange={(e) => setForm({ ...form, brix_reward: e.target.value })} />
        </div>
        <p className="text-xs font-bold text-slate-500">Creating a challenge sets it as the active daily challenge.</p>
        <button data-testid="create-challenge-btn" disabled={busy} className={btnPrimary}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />} Create challenge
        </button>
      </form>

      <div className="lg:col-span-3 space-y-3">
        <h3 className="font-display font-black text-xl">All Challenges ({challenges.length})</h3>
        {challenges.map((c) => (
          <div key={c.id} data-testid={`admin-challenge-${c.id}`} className="flex items-center gap-4 bg-white border-[3px] border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_#0F172A]">
            <div className="flex-1 min-w-0">
              <p className="font-black truncate">{c.title} {c.active && <span className="text-emerald-600 text-xs">● ACTIVE</span>}</p>
              <p className="text-sm font-bold text-amber-600">+{c.brix_reward} Brix</p>
            </div>
            <button data-testid={`delete-challenge-${c.id}`} onClick={() => remove(c.id)} className="p-2 border-2 border-slate-900 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("items");
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, [tab]);

  return (
    <div className="matrix-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <span className="bg-slate-900 text-white p-2 rounded-xl border-[3px] border-slate-900 shadow-[3px_3px_0px_#F59E0B]">
            <Shield size={22} strokeWidth={2.5} />
          </span>
          <h1 className="font-display font-black text-3xl md:text-4xl">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Users} label="Users" value={stats.users} color="bg-blue-500 text-white" />
          <Stat icon={Store} label="Items" value={stats.items} color="bg-pink-500 text-white" />
          <Stat icon={Gift} label="Promocodes" value={stats.promocodes} color="bg-emerald-400 text-slate-900" />
          <Stat icon={Trophy} label="Challenges" value={stats.challenges} color="bg-amber-400 text-slate-900" />
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                data-testid={`admin-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black border-[3px] border-slate-900 transition-all ${
                  tab === t.id ? "bg-slate-900 text-white" : "bg-white hover:-translate-y-0.5"
                }`}
              >
                <Icon size={18} strokeWidth={2.5} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "items" && <ItemsTab />}
        {tab === "promos" && <PromosTab />}
        {tab === "challenges" && <ChallengesTab />}
      </div>
    </div>
  );
}
