import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/server/env";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const key = Buffer.from(serverEnv.credentialEncryptionKey, "base64");

  if (key.byteLength !== KEY_BYTES) {
    throw new Error(
      "INTEGRATION_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
}

export type EncryptedCredentialPayload = {
  authTag: string;
  ciphertext: string;
  iv: string;
  keyVersion: number;
};

export function encryptCredentialPayload(
  payload: Record<string, unknown>,
  keyVersion = 1,
): EncryptedCredentialPayload {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const plaintext = JSON.stringify(payload);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    keyVersion,
  };
}

export function decryptCredentialPayload<T = Record<string, unknown>>(
  payload: EncryptedCredentialPayload,
) {
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}
