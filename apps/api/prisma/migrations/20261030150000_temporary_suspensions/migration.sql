-- Suspensiones temporales: sin fecha de fin, la suspensión es indefinida.
ALTER TABLE "users" ADD COLUMN "suspended_until" TIMESTAMPTZ;
