function decodePayload(r) {
    var auth = r.headersIn['Authorization'] || '';
    if (!auth.startsWith('Bearer ')) return null;
    var parts = auth.substring(7).split('.');
    if (parts.length < 2) return null;
    try {
        // base64url → base64
        var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        var decoded = atob(b64);
        return JSON.parse(decoded);
    } catch (e) {
        r.error('JWT decode error: ' + e.message);
        return null;
    }
}

function userId(r) {
    var p = decodePayload(r);
    return p ? (p.sub || '') : '';
}

function userEmail(r) {
    var p = decodePayload(r);
    return p ? (p.email || '') : '';
}

function isValid(r) {
    return decodePayload(r) ? '1' : '0';
}

export default { userId, userEmail, isValid };
