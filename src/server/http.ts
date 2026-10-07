import "server-only";
import { DomainError } from "@/domain/errors";
import { reportError } from "./report-error";

const STATUS: Record<DomainError["code"], number> = {
  validation: 400,
  not_found: 404,
  conflict: 409,
  limit_reached: 429,
  unavailable: 503,
};

/** Turns a thrown error into a JSON response the client can show as-is. */
export function errorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json({ error: error.message, code: error.code }, { status: STATUS[error.code] });
  }
  reportError(error);
  return Response.json(
    { error: "Something went wrong on our side. Please try again.", code: "internal" },
    { status: 500 },
  );
}

export function unauthorised(): Response {
  return Response.json({ error: "Please sign in first.", code: "unauthorised" }, { status: 401 });
}
