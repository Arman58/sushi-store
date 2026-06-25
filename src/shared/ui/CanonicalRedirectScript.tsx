import { buildCanonicalRedirectScript } from "@/lib/canonical-host";

/**
 * Мгновенный редирект apex → www до загрузки React.
 * App Router: inline <script>, не next/script beforeInteractive (только pages/_document).
 */
export function CanonicalRedirectScript() {
    return (
        <script
            id="canonical-host-redirect"
            dangerouslySetInnerHTML={{ __html: buildCanonicalRedirectScript() }}
        />
    );
}
