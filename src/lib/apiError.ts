import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Record not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Duplicate record already exists") {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 422);
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthError || err instanceof AppError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  // Map Prisma known error codes safely without exposing DB internals
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate record: a record with this unique identifier already exists." },
        { status: 409 }
      );
    }
    if (code === "P2025") {
      return NextResponse.json(
        { error: "Requested record was not found." },
        { status: 404 }
      );
    }
  }

  console.error("Unhandled API Error:", err);
  return NextResponse.json(
    { error: "An unexpected server error occurred. Please try again." },
    { status: 500 }
  );
}
