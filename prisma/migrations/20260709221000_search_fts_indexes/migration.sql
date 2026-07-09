-- Full-text search indexes for storefront search (hy/ru/en → 'simple' config).
CREATE INDEX IF NOT EXISTS "ProductTranslation_name_fts_idx"
ON "ProductTranslation"
USING gin (to_tsvector('simple', coalesce(name, '')));

CREATE INDEX IF NOT EXISTS "CategoryTranslation_name_fts_idx"
ON "CategoryTranslation"
USING gin (to_tsvector('simple', coalesce(name, '')));
