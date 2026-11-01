import { z } from "zod";
export const regionSchema = z.enum(["americas", "europe", "asia"]);
export type Region = z.infer<typeof regionSchema>;
export const regions = {
  americas: { label: "Americas", host: "https://west.albion-online-data.com" },
  europe: { label: "Europe", host: "https://europe.albion-online-data.com" },
  asia: { label: "Asia", host: "https://east.albion-online-data.com" },
} as const;
export const cities = [
  "Bridgewatch",
  "Martlock",
  "Lymhurst",
  "Fort Sterling",
  "Thetford",
  "Caerleon",
  "Brecilien",
  "Black Market",
] as const;
