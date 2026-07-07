import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import AvatarPreview from "@/components/AvatarPreview";
import { Loader2, Save, Shirt, Check } from "lucide-react";
import { Link } from "react-router-dom";

const SKIN = ["#F5C99B", "#EAC086", "#C68642", "#8D5524", "#5C3B1E", "#F1C27D", "#A78BFA", "#34D399"];
const SHIRT = ["#2563EB", "#EC4899", "#10B981", "#F59E0B", "#EF4444", "#0F172A", "#8B5CF6", "#FFFFFF"];
const PANTS = ["#0F172A", "#334155", "#2563EB", "#7C2D12", "#065F46", "#831843", "#1E3A8A", "#78350F"];
const SLOTS = ["hat", "face", "gear"];

function Swatch({ colors, value, onChange, testid }) {
  return (
    <div className="flex flex-wrap gap-2" data-testid={testid}>
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`w-10 h-10 rounded-lg border-[3px] transition-transform hover:scale-110 ${
            value === c ? "border-slate-900 ring-4 ring-blue-300 scale-110" : "border-slate-900"
          }`}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

export default function AvatarEditor() {
  const { user, refreshUser } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || {});
  const [ownedItems, setOwnedItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAvatar(user?.avatar || {});
  }, [user]);

  useEffect(() => {
    async function load() {
      if (!user?.username) return;
      const { data } = await api.get(`/users/${user.username}`);
      setOwnedItems(data.owned || []);
    }
    load();
  }, [user?.username]);

  const itemMap = useMemo(() => {
    const m = {};
    ownedItems.forEach((i) => (m[i.id] = i));
    return m;
  }, [ownedItems]);

  const set = (k, v) => setAvatar((a) => ({ ...a, [k]: v }));

  const toggleEquip = (slot, itemId) => {
    setAvatar((a) => ({ ...a, [slot]: a[slot] === itemId ? null : itemId }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/avatar", avatar);
      toast.success("Avatar saved!");
      refreshUser();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="matrix-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <span className="bg-pink-500 text-white p-2 rounded-xl border-[3px] border-slate-900 shadow-[3px_3px_0px_#0F172A]">
            <Shirt size={22} strokeWidth={2.5} />
          </span>
          <h1 className="font-display font-black text-3xl md:text-4xl">Avatar Editor</h1>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Preview */}
          <div className="lg:col-span-5">
            <div className="bg-sky-200 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_#0F172A] p-8 aspect-square flex items-center justify-center relative overflow-hidden sticky top-24">
              <div className="absolute inset-0 [box-shadow:inset_0_0_50px_rgba(255,255,255,0.6)] pointer-events-none" />
              <AvatarPreview avatar={avatar} items={itemMap} size="lg" />
            </div>
          </div>

          {/* Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A]">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Skin</p>
              <Swatch colors={SKIN} value={avatar.skin} onChange={(c) => set("skin", c)} testid="skin-swatch" />
            </div>
            <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A]">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Shirt</p>
              <Swatch colors={SHIRT} value={avatar.shirt} onChange={(c) => set("shirt", c)} testid="shirt-swatch" />
            </div>
            <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A]">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Pants</p>
              <Swatch colors={PANTS} value={avatar.pants} onChange={(c) => set("pants", c)} testid="pants-swatch" />
            </div>

            <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A]">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Equip owned items</p>
              {ownedItems.length === 0 ? (
                <p className="font-medium text-slate-500">
                  You don't own any items yet.{" "}
                  <Link to="/catalog" className="font-black text-blue-600 underline">Visit the catalog</Link> to buy some!
                </p>
              ) : (
                <div className="space-y-5">
                  {SLOTS.map((slot) => {
                    const slotItems = ownedItems.filter((i) => i.category === slot);
                    return (
                      <div key={slot}>
                        <p className="font-black capitalize mb-2">{slot}</p>
                        {slotItems.length === 0 ? (
                          <p className="text-sm font-medium text-slate-400">No {slot} owned.</p>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {slotItems.map((i) => {
                              const equipped = avatar[slot] === i.id;
                              return (
                                <button
                                  key={i.id}
                                  data-testid={`equip-${i.id}`}
                                  onClick={() => toggleEquip(slot, i.id)}
                                  className={`relative w-20 h-20 rounded-xl border-[3px] border-slate-900 p-1.5 bg-slate-100 transition-transform hover:-translate-y-1 ${
                                    equipped ? "ring-4 ring-emerald-400 bg-emerald-50" : ""
                                  }`}
                                  title={i.name}
                                >
                                  {i.image ? (
                                    <img src={i.image} alt={i.name} className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[10px] font-bold">{i.name}</span>
                                  )}
                                  {equipped && (
                                    <span className="absolute -top-2 -right-2 bg-emerald-400 rounded-full border-2 border-slate-900 p-0.5">
                                      <Check size={12} strokeWidth={3} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              data-testid="save-avatar-btn"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-400 text-slate-900 font-black px-8 py-3.5 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0F172A] transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} strokeWidth={2.5} />}
              Save avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
