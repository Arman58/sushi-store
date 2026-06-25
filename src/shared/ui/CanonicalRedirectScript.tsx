import { buildCanonicalRedirectScript } from "@/lib/canonical-host";

/** Мгновенный редирект apex → www до загрузки React и service worker. */
export function CanonicalRedirectScript() {
    const script = buildCanonicalRedirectScript();
    if (!script) return null;

    return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
