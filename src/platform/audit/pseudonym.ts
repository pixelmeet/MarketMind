import { createHmac } from "node:crypto";
import { AppError } from "@/platform/errors";

/**
 * Computes a keyed HMAC-SHA256 pseudonym for a user ID per DM-06 / SEC-AUD-02 / SEC-SEC-09.
 * 
 * Formula:
 *   actorPseudonym = HMAC-SHA256(key=AUDIT_PSEUDONYM_KEY, message=userId)
 * 
 * Properties:
 * - Stable: Same userId always yields the same pseudonym under the same key.
 * - Non-reversible without access to AUDIT_PSEUDONYM_KEY.
 * - Survives user deletion: Audit rows remain correlated without foreign keys to User.
 * 
 * @param userId - The user ID to pseudonymize (must be non-empty string).
 * @param secretKey - The AUDIT_PSEUDONYM_KEY secret.
 * @returns 64-character lowercase hex string.
 */
export function computeActorPseudonym(userId: string, secretKey: string): string {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    throw new AppError("INTERNAL", {
      message: "Cannot compute actor pseudonym: missing or invalid user ID.",
      details: { rule: "INVALID_USER_ID" },
    });
  }

  if (!secretKey || typeof secretKey !== "string" || secretKey.trim() === "") {
    throw new AppError("INTERNAL", {
      message: "Audit pseudonym computation failed: AUDIT_PSEUDONYM_KEY is not configured.",
      details: { rule: "MISSING_AUDIT_KEY" },
    });
  }

  return createHmac("sha256", secretKey).update(userId.trim()).digest("hex");
}

/**
 * Computes a salted hash for an IP address per doc/security.md SEC-AUD-02.
 * Never stores raw IP addresses in audit records.
 * 
 * @param ip - Client IP address.
 * @param salt - Salt string (or AUDIT_PSEUDONYM_KEY as default salt).
 * @returns 64-character lowercase hex string.
 */
export function computeIpHash(ip: string, salt: string): string {
  if (!ip || typeof ip !== "string" || ip.trim() === "") {
    throw new AppError("INTERNAL", {
      message: "Cannot compute IP hash: empty IP address.",
      details: { rule: "INVALID_IP" },
    });
  }

  if (!salt || typeof salt !== "string" || salt.trim() === "") {
    throw new AppError("INTERNAL", {
      message: "IP hash computation failed: missing salt key.",
      details: { rule: "MISSING_SALT" },
    });
  }

  return createHmac("sha256", salt).update(ip.trim()).digest("hex");
}
