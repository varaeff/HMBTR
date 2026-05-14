CREATE TABLE "tournament_reports" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "language" VARCHAR(8) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "pdf_data" BYTEA NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_reports_tournament_id_language_key" ON "tournament_reports"("tournament_id", "language");

ALTER TABLE "tournament_reports" ADD CONSTRAINT "tournament_reports_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
