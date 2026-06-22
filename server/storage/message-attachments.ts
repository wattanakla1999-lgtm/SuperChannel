import "server-only";

import { randomUUID } from "node:crypto";
import { serverEnv } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "upload"
  );
}

async function ensureAttachmentsBucket() {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.createBucket(
    serverEnv.storageAttachmentsBucket,
    {
      allowedMimeTypes: ["image/*"],
      fileSizeLimit: `${MAX_IMAGE_SIZE_BYTES}`,
      public: false,
    },
  );

  if (
    error &&
    !/already exists|duplicate|violates unique constraint/i.test(error.message)
  ) {
    throw error;
  }
}

export function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    const error = new Error("Please choose an image file.");
    error.name = "INVALID_REQUEST";
    throw error;
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const error = new Error("Please choose an image smaller than 10 MB.");
    error.name = "INVALID_REQUEST";
    throw error;
  }
}

export async function uploadConversationImage(options: {
  conversationId: string;
  file: File;
  organizationId: string;
}) {
  validateImageFile(options.file);
  await ensureAttachmentsBucket();

  const supabase = createSupabaseAdminClient();
  const storagePath = [
    options.organizationId,
    "conversations",
    options.conversationId,
    `${randomUUID()}-${sanitizeFileName(options.file.name)}`,
  ].join("/");

  const { error } = await supabase.storage
    .from(serverEnv.storageAttachmentsBucket)
    .upload(storagePath, await options.file.arrayBuffer(), {
      contentType: options.file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    contentType: options.file.type,
    fileName: options.file.name || "image",
    storagePath,
  };
}

export async function createSignedAttachmentUrl(
  storagePath: string,
  expiresInSeconds = 60 * 60,
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(serverEnv.storageAttachmentsBucket)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Unable to generate attachment URL.");
  }

  return data.signedUrl;
}

export async function downloadStoredAttachment(storagePath: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(serverEnv.storageAttachmentsBucket)
    .download(storagePath);

  if (error || !data) {
    throw error ?? new Error("Unable to download the attachment.");
  }

  return {
    body: new Uint8Array(await data.arrayBuffer()),
    contentType: data.type || "application/octet-stream",
  };
}
