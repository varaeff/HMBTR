CREATE TABLE "competition_blocks" (
    "id" SERIAL NOT NULL,
    "tournament_nomination_id" INTEGER NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "nomination_id" INTEGER NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "stage" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bracket_slots" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "competitor_id" INTEGER NOT NULL,
    "seed_position" INTEGER NOT NULL,
    "slot_position" INTEGER NOT NULL,

    CONSTRAINT "bracket_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "competition_placements" (
    "id" SERIAL NOT NULL,
    "tournament_nomination_id" INTEGER NOT NULL,
    "block_id" INTEGER,
    "group_id" INTEGER,
    "competitor_id" INTEGER NOT NULL,
    "scope" VARCHAR(32) NOT NULL,
    "place" INTEGER NOT NULL,

    CONSTRAINT "competition_placements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "groups" ADD COLUMN "block_id" INTEGER;
ALTER TABLE "fights" ADD COLUMN "block_id" INTEGER;
ALTER TABLE "fights" ADD COLUMN "bracket_round" INTEGER;
ALTER TABLE "fights" ADD COLUMN "bracket_position" INTEGER;
ALTER TABLE "fights" ADD COLUMN "is_bronze" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "bracket_slots_block_id_slot_position_key" ON "bracket_slots"("block_id", "slot_position");
CREATE UNIQUE INDEX "bracket_slots_block_id_competitor_id_key" ON "bracket_slots"("block_id", "competitor_id");
CREATE UNIQUE INDEX "competition_placements_group_place_key" ON "competition_placements"("tournament_nomination_id", "scope", "group_id", "place");
CREATE UNIQUE INDEX "competition_placements_group_competitor_key" ON "competition_placements"("tournament_nomination_id", "scope", "group_id", "competitor_id");

ALTER TABLE "competition_blocks" ADD CONSTRAINT "competition_blocks_tournament_nomination_id_fkey" FOREIGN KEY ("tournament_nomination_id") REFERENCES "tournament_nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT "groups_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "competition_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fights" ADD CONSTRAINT "fights_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "competition_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bracket_slots" ADD CONSTRAINT "bracket_slots_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "competition_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bracket_slots" ADD CONSTRAINT "bracket_slots_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition_placements" ADD CONSTRAINT "competition_placements_tournament_nomination_id_fkey" FOREIGN KEY ("tournament_nomination_id") REFERENCES "tournament_nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition_placements" ADD CONSTRAINT "competition_placements_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "competition_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition_placements" ADD CONSTRAINT "competition_placements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition_placements" ADD CONSTRAINT "competition_placements_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
