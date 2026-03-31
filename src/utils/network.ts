/**
 * Network utilities
 */

/**
 * Checks if a hostname belongs to a local network or loopback address.
 * Allows localhost, IPv4 loopback, IPv6 loopback, local domains, and private IPv4 ranges.
 *
 * @param hostname The hostname parsed from a URL
 * @returns boolean True if the hostname is a local network address
 */
export function isLocalNetwork(hostname: string): boolean {
    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]' ||
        hostname === '::1' ||
        hostname.endsWith('.local')
    ) {
        return true;
    }

    // Check for private IPv4 ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
        const [_, octet1Str, octet2Str] = match;
        const octet1 = parseInt(octet1Str, 10);
        const octet2 = parseInt(octet2Str, 10);

        // 10.0.0.0 - 10.255.255.255
        if (octet1 === 10) return true;
        // 172.16.0.0 - 172.31.255.255
        if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
        // 192.168.0.0 - 192.168.255.255
        if (octet1 === 192 && octet2 === 168) return true;
    }

    return false;
}
