import { z } from "zod";
import { regionSchema } from "../albion/region-config";
const eventFields = {
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(4000),
  startsAt: z.string().datetime(),
  timezone: z
    .string()
    .max(80)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
  expectedParticipants: z.number().int().min(1).max(400),
  voiceInfo: z.string().max(200),
  compositionId: z.string().max(100).nullable(),
};
export const groupAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("profile"),
    expectedUpdatedAt: z.string().datetime(),
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().max(4000),
    region: regionSchema,
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
  }),
  z.object({
    action: z.literal("edit-event"),
    eventId: z.string().max(100),
    version: z.number().int().positive(),
    ...eventFields,
  }),
  z.object({ action: z.literal("invite"), hours: z.number().int().min(1).max(168) }),
  z.object({ action: z.literal("revoke"), invitationId: z.string().max(100) }),
  z.object({ action: z.literal("request"), message: z.string().trim().max(1000) }),
  z.object({ action: z.literal("decide"), userId: z.string().max(100), approve: z.boolean() }),
  z.object({
    action: z.literal("role"),
    userId: z.string().max(100),
    role: z.enum(["ADMIN", "OFFICER", "MEMBER"]),
  }),
  z.object({ action: z.literal("remove"), userId: z.string().max(100) }),
  z.object({ action: z.literal("leave") }),
  z.object({ action: z.literal("transfer"), userId: z.string().max(100) }),
  z.object({ action: z.literal("delete") }),
  z.object({
    action: z.literal("announcement"),
    title: z.string().trim().min(3).max(100),
    body: z.string().trim().min(1).max(8000),
  }),
  z.object({ action: z.literal("remove-announcement"), id: z.string().max(100) }),
  z.object({
    action: z.literal("event"),
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(4000),
    startsAt: z.string().datetime(),
    timezone: z
      .string()
      .max(80)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }),
    expectedParticipants: z.number().int().min(1).max(400),
    voiceInfo: z.string().max(200),
    compositionId: z.string().max(100).nullable(),
  }),
  z.object({ action: z.literal("cancel-event"), eventId: z.string().max(100) }),
  z.object({
    action: z.literal("rsvp"),
    eventId: z.string().max(100),
    status: z.enum(["AVAILABLE", "MAYBE", "UNAVAILABLE"]),
    role: z.string().trim().max(60),
  }),
  z.object({ action: z.literal("share-build"), buildId: z.string().max(100) }),
  z.object({ action: z.literal("remove-build"), id: z.string().max(100) }),
]);
