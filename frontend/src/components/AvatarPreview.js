import React from "react";

// Blocky neo-brutalist humanoid avatar rendered from config + equipped items.
// items: map of {id: itemObject} for equipped slots (hat, face, gear)
export default function AvatarPreview({ avatar = {}, items = {}, size = "md" }) {
  const a = {
    skin: avatar.skin || "#F5C99B",
    shirt: avatar.shirt || "#2563EB",
    pants: avatar.pants || "#0F172A",
    ...avatar,
  };

  const hatItem = avatar.hat ? items[avatar.hat] : null;
  const faceItem = avatar.face ? items[avatar.face] : null;
  const gearItem = avatar.gear ? items[avatar.gear] : null;

  const scale = { sm: 0.55, md: 0.85, lg: 1.15 }[size] || 0.85;
  const border = "3px solid #0F172A";

  return (
    <div
      data-testid="avatar-preview"
      className="relative select-none"
      style={{ width: 180 * scale, height: 250 * scale }}
    >
      {/* Hat item image floating above head */}
      {hatItem?.image && (
        <img
          src={hatItem.image}
          alt="hat"
          className="absolute left-1/2 -translate-x-1/2 object-contain z-30"
          style={{ top: -18 * scale, width: 120 * scale, height: 70 * scale }}
        />
      )}

      {/* Head */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-2xl z-20 flex items-center justify-center overflow-hidden"
        style={{
          top: 30 * scale,
          width: 90 * scale,
          height: 90 * scale,
          background: a.skin,
          border,
          boxShadow: `${4 * scale}px ${4 * scale}px 0 #0F172A`,
        }}
      >
        {faceItem?.image ? (
          <img src={faceItem.image} alt="face" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center" style={{ gap: 8 * scale }}>
            <div className="flex" style={{ gap: 16 * scale }}>
              <span className="rounded-full bg-slate-900" style={{ width: 10 * scale, height: 14 * scale }} />
              <span className="rounded-full bg-slate-900" style={{ width: 10 * scale, height: 14 * scale }} />
            </div>
            <span
              className="rounded-b-full bg-slate-900"
              style={{ width: 26 * scale, height: 8 * scale, marginTop: 6 * scale }}
            />
          </div>
        )}
      </div>

      {/* Torso */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-xl z-10"
        style={{
          top: 120 * scale,
          width: 110 * scale,
          height: 80 * scale,
          background: a.shirt,
          border,
          boxShadow: `${4 * scale}px ${4 * scale}px 0 #0F172A`,
        }}
      >
        {gearItem?.image && (
          <img
            src={gearItem.image}
            alt="gear"
            className="absolute object-contain z-20"
            style={{ right: -30 * scale, top: 0, width: 50 * scale, height: 50 * scale }}
          />
        )}
      </div>

      {/* Legs */}
      <div className="absolute left-1/2 -translate-x-1/2 flex" style={{ top: 198 * scale, gap: 8 * scale }}>
        <div
          className="rounded-b-xl"
          style={{ width: 46 * scale, height: 50 * scale, background: a.pants, border }}
        />
        <div
          className="rounded-b-xl"
          style={{ width: 46 * scale, height: 50 * scale, background: a.pants, border }}
        />
      </div>
    </div>
  );
}
