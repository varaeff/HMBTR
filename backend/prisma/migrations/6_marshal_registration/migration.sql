ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "is_secretary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tournaments"
ADD COLUMN IF NOT EXISTS "is_marshals_registration_closed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "marshals_categories" (
    "id" SERIAL NOT NULL,
    "name_ru" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,

    CONSTRAINT "marshals_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "marshals" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "surname" VARCHAR(255) NOT NULL,
    "patronymic" VARCHAR(255),
    "country_id" INTEGER NOT NULL,
    "city_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "pic" TEXT,

    CONSTRAINT "marshals_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marshals_country_id_fkey'
    ) THEN
        ALTER TABLE "marshals"
        ADD CONSTRAINT "marshals_country_id_fkey"
        FOREIGN KEY ("country_id") REFERENCES "countries"("id")
        ON DELETE NO ACTION ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marshals_city_id_fkey'
    ) THEN
        ALTER TABLE "marshals"
        ADD CONSTRAINT "marshals_city_id_fkey"
        FOREIGN KEY ("city_id") REFERENCES "cities"("id")
        ON DELETE NO ACTION ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marshals_category_id_fkey'
    ) THEN
        ALTER TABLE "marshals"
        ADD CONSTRAINT "marshals_category_id_fkey"
        FOREIGN KEY ("category_id") REFERENCES "marshals_categories"("id")
        ON DELETE NO ACTION ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "tournament_marshals" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "marshal_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_marshals_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tournament_marshals_tournament_id_fkey'
    ) THEN
        ALTER TABLE "tournament_marshals"
        ADD CONSTRAINT "tournament_marshals_tournament_id_fkey"
        FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tournament_marshals_marshal_id_fkey'
    ) THEN
        ALTER TABLE "tournament_marshals"
        ADD CONSTRAINT "tournament_marshals_marshal_id_fkey"
        FOREIGN KEY ("marshal_id") REFERENCES "marshals"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_marshals_tournament_id_marshal_id_key"
ON "tournament_marshals"("tournament_id", "marshal_id");

CREATE INDEX IF NOT EXISTS "tournament_marshals_marshal_id_idx"
ON "tournament_marshals"("marshal_id");
