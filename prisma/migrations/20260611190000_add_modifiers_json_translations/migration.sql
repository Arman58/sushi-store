-- Convert ModifierGroup.name and Modifier.name from TEXT to JSONB.

ALTER TABLE "ModifierGroup"
ALTER COLUMN "name" TYPE JSONB
USING jsonb_build_object('hy', "name", 'ru', "name", 'en', "name");

ALTER TABLE "Modifier"
ALTER COLUMN "name" TYPE JSONB
USING jsonb_build_object('hy', "name", 'ru', "name", 'en', "name");
