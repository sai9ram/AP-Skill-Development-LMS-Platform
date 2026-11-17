import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AuthError, logAudit, requireSession } from "@/lib/auth";

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function signStorageKey(storageKey: string, expiresAt: number): string {
  const secret =
    process.env.JWT_SECRET || "ap-skill-development-lms-enterprise-2026-secret";
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${storageKey}:${expiresAt}`)
    .digest("hex");
  return `/api/files?download=${encodeURIComponent(storageKey)}&exp=${expiresAt}&sig=${sig}`;
}

export async function GET(req: NextRequest) {
  try {
    const downloadKey = req.nextUrl.searchParams.get("download");
    if (downloadKey) {
      const exp = Number(req.nextUrl.searchParams.get("exp") || 0);
      const sig = req.nextUrl.searchParams.get("sig") || "";
      if (Date.now() > exp) {
        return NextResponse.json({ error: "Signed URL expired" }, { status: 403 });
      }
      const secret =
        process.env.JWT_SECRET || "ap-skill-development-lms-enterprise-2026-secret";
      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${downloadKey}:${exp}`)
        .digest("hex");
      if (sig !== expected) {
        return NextResponse.json({ error: "Invalid signed URL" }, { status: 403 });
      }
      const file = await prisma.fileAsset.findUnique({
        where: { storageKey: downloadKey },
      });
      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      return NextResponse.json({ file, verifiedSignedAccess: true });
    }

    await requireSession();
    const entityType = req.nextUrl.searchParams.get("entityType") || undefined;
    const entityId = req.nextUrl.searchParams.get("entityId") || undefined;

    const files = await prisma.fileAsset.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { uploadedAt: "desc" },
      take: 50,
    });

    const expiresAt = Date.now() + 5 * 60 * 1000; // 5-minute ephemeral signed URL
    return NextResponse.json({
      files: files.map((f) => ({
        ...f,
        signedUrl: signStorageKey(f.storageKey, expiresAt),
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const entityType = String(body.entityType || "").toUpperCase();
    const entityId = String(body.entityId || "");
    const fileName = String(body.fileName || "").trim();
    const mimeType = String(body.mimeType || "").trim();
    const fileSize = Number(body.fileSize || 0);

    if (!entityType || !entityId || !fileName || !mimeType) {
      return NextResponse.json(
        { error: "entityType, entityId, fileName, and mimeType are required" },
        { status: 400 }
      );
    }
    if (!ALLOWED_MIMES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 400 }
      );
    }
    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size must be between 1 byte and 10 MB" },
        { status: 400 }
      );
    }

    const storageKey = `ap-lms/${entityType.toLowerCase()}/${entityId}/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const file = await prisma.fileAsset.create({
      data: {
        entityType,
        entityId,
        fileName,
        storageKey,
        mimeType,
        fileSize,
        uploadedBy: session.email,
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "UPLOAD_FILE_METADATA",
      module: "FileManagement",
      entityType,
      entityId,
      details: { fileName, mimeType, fileSize, storageKey },
    });

    const expiresAt = Date.now() + 5 * 60 * 1000;
    return NextResponse.json(
      { file, signedUrl: signStorageKey(storageKey, expiresAt) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to register file" }, { status: 400 });
  }
}
