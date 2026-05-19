ALTER TABLE "fights" ADD COLUMN "forfeit_card_id" INTEGER;

CREATE INDEX "fights_forfeit_card_id_idx" ON "fights"("forfeit_card_id");
