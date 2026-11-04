-- Порядок категорий на сайте теперь задаётся полем Category.position (админка получила
-- кнопки "вверх/вниз"). Раньше витрина игнорировала position и сортировала по "весу",
-- вычисленному из подстрок slug/названия (сеты -> суши -> пицца -> шаурма -> лахмаджо ->
-- стрипсы -> ... -> напитки -> соусы).
--
-- Чтобы после выкладки порядок на сайте НЕ изменился, один раз записываем в position
-- текущий видимый порядок: те же правила, тот же приоритет, при равенстве - старый
-- position, затем id. Повторный запуск безопасен (меняются только отличающиеся значения).
--
-- Названия сравниваются и как есть (с вариантом заглавной первой буквы), и в lower():
-- результат не зависит от того, умеет ли collation БД понижать регистр не-ASCII букв.
WITH names AS (
    SELECT c."id", c."position", lower(c."slug") AS s,
           coalesce(string_agg(t."name", ' '), '') AS raw
    FROM "Category" c
    LEFT JOIN "CategoryTranslation" t ON t."categoryId" = c."id"
    GROUP BY c."id", c."position", c."slug"
), keyed AS (
    SELECT "id", "position", s, raw || ' ' || lower(raw) AS n FROM names
), weighted AS (
    SELECT "id", "position",
        CASE
            WHEN s LIKE '%set%' OR s LIKE '%combo%'
              OR n LIKE ANY (ARRAY['%սեթ%','%Սեթ%','%сет%','%Сет%','%կոմբո%','%Կոմբո%','%комбо%','%Комбо%']) THEN 0
            WHEN s LIKE '%sushi%' OR s LIKE '%roll%'
              OR n LIKE ANY (ARRAY['%սուշի%','%Սուշի%','%суши%','%Суши%','%ռոլ%','%Ռոլ%','%ролл%','%Ролл%']) THEN 1
            WHEN s LIKE '%pizza%'
              OR n LIKE ANY (ARRAY['%պիցցա%','%Պիցցա%','%пицц%','%Пицц%']) THEN 2
            WHEN s LIKE '%shawarma%'
              OR n LIKE ANY (ARRAY['%շաուրմա%','%Շաուրմա%','%шаурм%','%Шаурм%']) THEN 3
            WHEN s LIKE '%lahmajo%'
              OR n LIKE ANY (ARRAY['%լահմաջո%','%Լահմաջո%','%лахмаджо%','%Лахмаджо%']) THEN 4
            WHEN s LIKE '%strips%'
              OR n LIKE ANY (ARRAY['%սթրիփս%','%Սթրիփս%','%стрипс%','%Стрипс%']) THEN 5
            WHEN s LIKE '%drink%'
              OR n LIKE ANY (ARRAY['%ըմպելիք%','%Ըմպելիք%','%напит%','%Напит%']) THEN 80
            WHEN s LIKE '%sauc%' OR s LIKE '%cat-1783467020200%'
              OR n LIKE ANY (ARRAY['%սոուս%','%Սոուս%','%соус%','%Соус%']) THEN 99
            ELSE "position"
        END AS wt
    FROM keyed
), ranked AS (
    SELECT "id", (ROW_NUMBER() OVER (ORDER BY wt, "position", "id") - 1)::int AS new_position
    FROM weighted
)
UPDATE "Category" c
SET "position" = r.new_position
FROM ranked r
WHERE c."id" = r."id" AND c."position" IS DISTINCT FROM r.new_position;
