ALTER TABLE "whiteboards" ADD COLUMN "is_public" boolean NOT NULL DEFAULT false;
ALTER TABLE "whiteboards" ADD COLUMN "share_token" text;
CREATE UNIQUE INDEX "whiteboards_share_token_uq" ON "whiteboards" ("share_token") WHERE "share_token" IS NOT NULL;
