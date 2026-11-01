import index from "./build-discovery-index.json";
export const buildDiscovery = index;
export const discoveryWeapons = index.weapons;
export function weaponFamily(name: string | undefined) {
  return index.weapons.find((weapon) => weapon.name === name)?.family ?? "other";
}
export function familyWeapons(family: string) {
  return index.weapons.filter((weapon) => weapon.family === family);
}
export function discoveryDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
