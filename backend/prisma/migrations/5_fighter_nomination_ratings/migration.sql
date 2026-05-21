ALTER TABLE "tournament_nominations"
  ADD COLUMN "rating_status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rating_calculated_at" TIMESTAMP(3),
  ADD COLUMN "rating_error" TEXT;

CREATE TABLE "fighter_nomination_ratings" (
  "id" SERIAL PRIMARY KEY,
  "nomination_id" INTEGER NOT NULL,
  "fighter_id" INTEGER NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 1000,
  "fights_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fighter_nomination_ratings_nomination_id_fkey"
    FOREIGN KEY ("nomination_id") REFERENCES "nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fighter_nomination_ratings_fighter_id_fkey"
    FOREIGN KEY ("fighter_id") REFERENCES "fighters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "fighter_nomination_rating_history" (
  "id" SERIAL PRIMARY KEY,
  "nomination_id" INTEGER NOT NULL,
  "fighter_id" INTEGER NOT NULL,
  "tournament_id" INTEGER NOT NULL,
  "tournament_nomination_id" INTEGER NOT NULL,
  "rating_before" INTEGER NOT NULL,
  "rating_after" INTEGER NOT NULL,
  "fights_count_delta" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fighter_nomination_rating_history_nomination_id_fkey"
    FOREIGN KEY ("nomination_id") REFERENCES "nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fighter_nomination_rating_history_fighter_id_fkey"
    FOREIGN KEY ("fighter_id") REFERENCES "fighters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fighter_nomination_rating_history_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fighter_nomination_rating_history_tournament_nomination_id_fkey"
    FOREIGN KEY ("tournament_nomination_id") REFERENCES "tournament_nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "fighter_nomination_ratings_nomination_id_fighter_id_key"
  ON "fighter_nomination_ratings"("nomination_id", "fighter_id");

CREATE INDEX "fighter_nomination_ratings_nomination_id_rating_idx"
  ON "fighter_nomination_ratings"("nomination_id", "rating");

CREATE UNIQUE INDEX "fighter_nomination_rating_history_tournament_nomination_id_fighter_id_key"
  ON "fighter_nomination_rating_history"("tournament_nomination_id", "fighter_id");

CREATE INDEX "fighter_nomination_rating_history_nomination_id_fighter_id_tournament_id_idx"
  ON "fighter_nomination_rating_history"("nomination_id", "fighter_id", "tournament_id");
