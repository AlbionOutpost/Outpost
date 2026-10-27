// Original small factual index, not a copied third-party dataset. Full catalog pending licensing review.
const families = [
  { id: "BAG", name: "Bag", category: "Accessories" },
  { id: "CAPE", name: "Cape", category: "Accessories" },
  { id: "MAIN_SWORD", name: "Broadsword", category: "Weapons" },
  { id: "MAIN_AXE", name: "Battleaxe", category: "Weapons" },
  { id: "2H_BOW", name: "Bow", category: "Weapons" },
] as const;
export const items = families.flatMap((f) =>
  [4, 5, 6, 7, 8].flatMap((tier) =>
    [0, 1, 2, 3].map((enchantment) => ({
      id: `T${tier}_${f.id}${enchantment ? `@${enchantment}` : ""}`,
      name: `${f.name} · T${tier}.${enchantment}`,
      tier,
      enchantment,
      category: f.category,
    })),
  ),
);
