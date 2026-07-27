CREATE TABLE "fight_round_scores" (
  "id" SERIAL NOT NULL,
  "fight_id" INTEGER NOT NULL,
  "round" INTEGER NOT NULL,
  "competitor1_score" INTEGER NOT NULL DEFAULT 0,
  "competitor2_score" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "fight_round_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fight_round_scores_fight_id_round_key"
  ON "fight_round_scores"("fight_id", "round");

CREATE INDEX "fight_round_scores_fight_id_idx"
  ON "fight_round_scores"("fight_id");

ALTER TABLE "fight_round_scores"
  ADD CONSTRAINT "fight_round_scores_fight_id_fkey"
  FOREIGN KEY ("fight_id") REFERENCES "fights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "fight_round_scores" (
  "fight_id",
  "round",
  "competitor1_score",
  "competitor2_score"
)
SELECT
  f."id",
  v."round",
  CASE
    WHEN n."rounds" = 1 AND v."round" = 1 THEN f."competitor1_score"
    ELSE v."competitor1_score"
  END,
  CASE
    WHEN n."rounds" = 1 AND v."round" = 1 THEN f."competitor2_score"
    ELSE v."competitor2_score"
  END
FROM "fights" f
JOIN "nominations" n ON n."id" = f."nomination_id"
JOIN LATERAL (
  VALUES
    (1, f."competitor1_round1_score", f."competitor2_round1_score"),
    (2, f."competitor1_round2_score", f."competitor2_round2_score"),
    (3, f."competitor1_round3_score", f."competitor2_round3_score")
) AS v("round", "competitor1_score", "competitor2_score")
  ON v."round" <= n."rounds"
ON CONFLICT ("fight_id", "round") DO NOTHING;

INSERT INTO "fight_round_scores" (
  "fight_id",
  "round",
  "competitor1_score",
  "competitor2_score"
)
SELECT
  f."id",
  4,
  f."competitor1_round4_score",
  f."competitor2_round4_score"
FROM "fights" f
JOIN "nominations" n ON n."id" = f."nomination_id"
WHERE n."round_win" = TRUE
  AND (
    f."competitor1_round4_score" <> 0
    OR f."competitor2_round4_score" <> 0
    OR EXISTS (
      SELECT 1
      FROM "fight_warnings" fw
      WHERE fw."fight_id" = f."id"
        AND fw."round" = 4
    )
  )
ON CONFLICT ("fight_id", "round") DO NOTHING;
