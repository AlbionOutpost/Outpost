import { describe, expect, it } from "vitest";
import { weaponRole } from "@/lib/compositions/weapon-roles";

describe("weaponRole", () => {
  it("reads common comp weapons the way players do", () => {
    expect(weaponRole("Rootbound Staff")).toBe("Support");
    expect(weaponRole("Blight Staff")).toBe("Healer");
    expect(weaponRole("Great Hammer")).toBe("Tank");
    expect(weaponRole("Great Cursed Staff")).toBe("DPS");
    expect(weaponRole("Arcane Staff")).toBe("Support");
  });
});
