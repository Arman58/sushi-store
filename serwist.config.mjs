// @ts-check
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { serwist } from "@serwist/next/config";

const revision =
    spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
    randomUUID();

/** @type {import("@serwist/next/config").SerwistOptions} */
const serwistOptions = {
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    // Только /offline. Страницы меню НЕ прекэшируем: Serwist отдаёт precache
    // cache-first раньше runtimeCaching, и меню (категории, фото, цены, "нет в
    // наличии") застывало на момент деплоя. Офлайн-меню даёт NetworkFirst
    // "menu-pages" в sw.ts (кэш наполняется после первого посещения).
    additionalPrecacheEntries: [{ url: "/offline", revision }],
};

export default serwist(serwistOptions);
