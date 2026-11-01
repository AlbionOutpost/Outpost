"use client";

export function BuildFamilySelect({
  value,
  families,
}: {
  value: string;
  families: readonly { id: string; name: string; count: number }[];
}) {
  return (
    <label>
      Weapon family
      <select
        name="family"
        aria-label="Library weapon family"
        title="Counts across the full library"
        defaultValue={value}
        onChange={(event) => {
          const weapon = event.currentTarget.form?.elements.namedItem("weapon");
          if (weapon instanceof HTMLSelectElement) weapon.value = "";
        }}
      >
        <option value="">All weapon families</option>
        {families.map((family) => (
          <option key={family.id} value={family.id}>
            {family.name} ({family.count.toLocaleString("en-GB")})
          </option>
        ))}
      </select>
    </label>
  );
}
