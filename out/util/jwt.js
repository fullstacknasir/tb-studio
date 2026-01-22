"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeJwt = decodeJwt;
exports.safeDecodeJwt = safeDecodeJwt;
function decodeJwt(token) {
    if (!token)
        throw new Error("Missing token");
    const parts = token.split('.');
    if (parts.length !== 3)
        throw new Error("Invalid JWT");
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const jsonPayload = Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload.exp !== "number")
        throw new Error("Invalid JWT payload");
    return payload;
}
function safeDecodeJwt(token) {
    try {
        return decodeJwt(token);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map