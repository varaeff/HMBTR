CREATE TABLE "disciplinary_cards" (
    "id" SERIAL NOT NULL,
    "fighter_id" INTEGER NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "fight_id" INTEGER NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "source" VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    "received_at" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disciplinary_cards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "disciplinary_cards_type_check" CHECK ("type" IN ('YELLOW', 'RED')),
    CONSTRAINT "disciplinary_cards_source_check" CHECK ("source" IN ('MANUAL', 'AUTOMATIC'))
);

CREATE INDEX "disciplinary_cards_fighter_type_dates_idx" ON "disciplinary_cards"("fighter_id", "type", "received_at", "expires_at");
CREATE INDEX "disciplinary_cards_tournament_id_idx" ON "disciplinary_cards"("tournament_id");
CREATE INDEX "disciplinary_cards_fight_id_idx" ON "disciplinary_cards"("fight_id");

ALTER TABLE "disciplinary_cards" ADD CONSTRAINT "disciplinary_cards_fighter_id_fkey" FOREIGN KEY ("fighter_id") REFERENCES "fighters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disciplinary_cards" ADD CONSTRAINT "disciplinary_cards_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disciplinary_cards" ADD CONSTRAINT "disciplinary_cards_fight_id_fkey" FOREIGN KEY ("fight_id") REFERENCES "fights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
