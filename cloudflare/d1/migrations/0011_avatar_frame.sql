-- Additive private-store upgrade: the picture frame a player picked; null keeps the plain picture.
ALTER TABLE "User" ADD COLUMN "avatarFrame" TEXT;
