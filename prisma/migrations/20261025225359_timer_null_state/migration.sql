ALTER TABLE "Timer" DROP CONSTRAINT "Timer_state";
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_state" CHECK (("status"='RUNNING' AND "dueAt" IS NOT NULL AND "remainingMs" IS NULL) OR ("status"='PAUSED' AND "dueAt" IS NULL AND "remainingMs" IS NOT NULL AND "remainingMs">=0) OR ("status"='COMPLETED' AND "dueAt" IS NULL AND "remainingMs" IS NOT NULL AND "remainingMs"=0));
