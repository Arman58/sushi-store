const MAX_PUSH_ENDPOINT_LENGTH = 2048;

/** Accept only HTTPS endpoints hosted by known browser push services. */
export function isValidPushEndpoint(endpoint: string): boolean {
    if (
        endpoint.length > MAX_PUSH_ENDPOINT_LENGTH ||
        /[\s\\]/.test(endpoint)
    ) {
        return false;
    }

    // Require an explicit authority; reject even empty userinfo (https://@host).
    const authority = /^https:\/\/([^/?#]+)/i.exec(endpoint)?.[1];
    if (!authority || authority.includes("@")) return false;

    try {
        const url = new URL(endpoint);
        if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            (url.port && url.port !== "443")
        ) {
            return false;
        }

        const hostname = url.hostname;
        // URL normalizes case; trailing dots and malformed DNS labels stay rejected.
        if (!/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*$/.test(hostname)) {
            return false;
        }

        // Exact hosts / dot-delimited suffixes also exclude IP literals and localhost.
        return hostname === "fcm.googleapis.com" ||
            hostname.endsWith(".push.services.mozilla.com") ||
            hostname.endsWith(".push.apple.com") ||
            hostname.endsWith(".notify.windows.com");
    } catch {
        return false;
    }
}
