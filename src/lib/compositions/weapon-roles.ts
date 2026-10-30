/**
 * Party role implied by a weapon line, the way players read a comp at a glance: healing
 * staffs heal, hammers and maces tank, arcane and quarterstaffs support, everything else
 * deals damage. This is a reading of the weapon, not a recorded assignment, so anything
 * that shows it says "by weapon type".
 */
export type WeaponRole = "Tank" | "Healer" | "DPS" | "Support";

const rules: [WeaponRole, RegExp][] = [
  [
    "Healer",
    /\b(holy|nature|divine|lifetouch|fallen|redemption|hallowfall|exalted|wild|druidic|blight|rampant|ironroot|rootbound|great nature)\b/i,
  ],
  [
    "Tank",
    /\b(hammer|polehammer|tombhammer|grovekeeper|hand of justice|truebolt|mace|morning star|bedrock|incubus|camlann|oathkeepers|dreadnought)\b/i,
  ],
  [
    "Support",
    /\b(arcane|enigmatic|witchwork|occult|malevolent locus|evensong|astral|quarterstaff|iron-clad|double bladed|black monk|soulscythe|staff of balance|grailseeker|phalanx)\b/i,
  ],
];

export function weaponRole(weaponName: string): WeaponRole {
  for (const [role, pattern] of rules) if (pattern.test(weaponName)) return role;
  return "DPS";
}

export const weaponRoleOrder: WeaponRole[] = ["Tank", "Healer", "DPS", "Support"];
