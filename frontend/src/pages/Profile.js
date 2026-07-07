import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import AvatarPreview from "@/components/AvatarPreview";
import { Coins, Loader2, Package, Pencil, Check } from "lucide-react";

export default function Profile() {
  const { username } = useParams();
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState("");

  const isOwn = user?.username === username;

  const load = async () => {
    try {
      const { data } = await api.get(`/users/${username}`);
      setProfile(data);
      setBio(data.bio || "");
    } catch {
      setProfile(false);
    }
  };
  useEffect(() => {
    load();
  }, [username]);

  const itemMap = useMemo(() => {
    const m = {};
    (profile?.owned || []).forEach((i) => (m[i.id] = i));
    return m;
  }, [profile]);

  const saveBio = async () => {
    try {
      await api.put("/profile", { bio });
      toast.success("Profile updated!");
      setEditingBio(false);
      refreshUser();
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  if (profile === null) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }
  if (profile === false) {
    return <div className="text-center py-32 font-black text-2xl text-slate-400">User not found.</div>;
  }

  return (
    <div className="matrix-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <div className="bg-sky-200 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_#0F172A] p-6 flex flex-col items-center relative overflow-hidden">
              <div className="absolute inset-0 [box-shadow:inset_0_0_40px_rgba(255,255,255,0.6)] pointer-events-none" />
              <AvatarPreview avatar={profile.avatar || {}} items={itemMap} size="md" />
            </div>
          </div>

          <div className="md:col-span-8 space-y-6">
            <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 data-testid="profile-username" className="font-display font-black text-3xl md:text-4xl">
                    @{profile.username}
                  </h1>
                  {profile.role === "admin" && (
                    <span className="inline-block mt-2 bg-blue-600 text-white text-xs font-black px-3 py-1 border-2 border-slate-900 rounded-full uppercase">
                      Admin
                    </span>
                  )}
                </div>
                {isOwn && (
                  <span className="flex items-center gap-1.5 bg-amber-400 font-black px-3 py-1.5 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A]">
                    <Coins size={18} strokeWidth={2.5} /> {(profile.brix ?? 0).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="mt-4">
                {editingBio ? (
                  <div className="space-y-3">
                    <textarea
                      data-testid="bio-input"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border-[3px] border-slate-900 rounded-xl font-medium outline-none focus:ring-4 ring-blue-200"
                      placeholder="Tell the Matrix about yourself..."
                    />
                    <button
                      data-testid="save-bio-btn"
                      onClick={saveBio}
                      className="flex items-center gap-2 bg-emerald-400 font-black px-4 py-2 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A]"
                    >
                      <Check size={16} strokeWidth={2.5} /> Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="font-medium text-slate-600">{profile.bio || "No bio yet."}</p>
                    {isOwn && (
                      <button data-testid="edit-bio-btn" onClick={() => setEditingBio(true)} className="text-slate-400 hover:text-slate-900">
                        <Pencil size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A]">
              <div className="flex items-center gap-2 mb-4">
                <Package size={20} strokeWidth={2.5} />
                <h2 className="font-display font-black text-xl">Inventory ({profile.owned?.length || 0})</h2>
              </div>
              {profile.owned?.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4" data-testid="inventory-grid">
                  {profile.owned.map((i) => (
                    <div key={i.id} className="bg-slate-100 border-[3px] border-slate-900 rounded-xl p-2 aspect-square flex flex-col items-center justify-center">
                      {i.image ? (
                        <img src={i.image} alt={i.name} className="w-full h-3/4 object-contain" />
                      ) : (
                        <Package size={28} className="text-slate-300" />
                      )}
                      <span className="text-[10px] font-bold text-center mt-1 line-clamp-1">{i.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-medium text-slate-400">No items owned yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
