import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Boxes, Coins, Store, Shirt, Gift, Trophy, ArrowRight } from "lucide-react";
import AvatarPreview from "@/components/AvatarPreview";

const feature = (Icon, title, desc, color, id) => (
  <div
    key={title}
    data-testid={id}
    className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0F172A] transition-all"
  >
    <span className={`inline-flex p-3 rounded-xl border-[3px] border-slate-900 ${color}`}>
      <Icon size={24} strokeWidth={2.5} />
    </span>
    <h3 className="font-display font-black text-xl mt-4">{title}</h3>
    <p className="text-slate-600 font-medium mt-1">{desc}</p>
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? "/catalog" : "/register";

  return (
    <div className="matrix-bg min-h-screen">
      <header className="max-w-7xl mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white p-1.5 rounded-lg border-[3px] border-slate-900 shadow-[3px_3px_0px_#0F172A]">
            <Boxes size={22} strokeWidth={2.5} />
          </span>
          <span className="font-display font-black text-2xl tracking-tight">MATRIX</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            data-testid="landing-login-btn"
            className="font-bold px-4 py-2 rounded-xl border-[3px] border-slate-900 hover:bg-slate-100 transition-colors"
          >
            Log in
          </Link>
          <Link
            to={cta}
            data-testid="landing-signup-btn"
            className="bg-blue-600 text-white font-black px-5 py-2 border-[3px] border-slate-900 rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#0F172A] transition-all"
          >
            Play free
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-10 md:pt-16 grid lg:grid-cols-2 gap-10 items-center">
        <div className="animate-pop-in">
          <span className="inline-block bg-pink-500 text-white text-xs font-black px-3 py-1 border-2 border-slate-900 rounded-full uppercase tracking-wider">
            Build · Style · Play
          </span>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight mt-4 leading-[1.05]">
            Your world, your <span className="text-blue-600">avatar</span>, your{" "}
            <span className="text-amber-500">Brix</span>.
          </h1>
          <p className="text-lg text-slate-600 font-medium mt-5 max-w-md">
            Matrix is the playground where you create an account, customize a blocky avatar, shop a live
            catalog, redeem promocodes and crush daily challenges for Brix.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to={cta}
              data-testid="hero-cta-btn"
              className="flex items-center gap-2 bg-amber-400 text-slate-900 font-black px-6 py-3 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0F172A] transition-all"
            >
              <Coins size={20} strokeWidth={2.5} /> Get 500 free Brix
            </Link>
            <Link
              to="/catalog"
              className="flex items-center gap-2 bg-white font-black px-6 py-3 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0F172A] transition-all"
            >
              Browse catalog <ArrowRight size={20} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-sky-200 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_#0F172A] p-10 aspect-square w-full max-w-md flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 [box-shadow:inset_0_0_50px_rgba(255,255,255,0.6)] pointer-events-none" />
            <div className="animate-float">
              <AvatarPreview
                avatar={{ skin: "#F5C99B", shirt: "#EC4899", pants: "#0F172A" }}
                size="lg"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {feature(Store, "Live Catalog", "Snag limited items dropped fresh by admins.", "bg-blue-500 text-white", "feat-catalog")}
        {feature(Shirt, "Avatar Editor", "Mix skins, shirts, hats & gear with live preview.", "bg-pink-500 text-white", "feat-avatar")}
        {feature(Gift, "Promocodes", "Redeem secret codes for instant Brix.", "bg-emerald-400 text-slate-900", "feat-promo")}
        {feature(Trophy, "Daily Challenge", "Claim Brix every single day you log in.", "bg-amber-400 text-slate-900", "feat-daily")}
      </section>
    </div>
  );
}
