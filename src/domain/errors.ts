/**
 * Errors the business rules can raise. The UI layer maps these to messages;
 * anything else that escapes is treated as an unexpected failure.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: "validation" | "not_found" | "conflict" | "unavailable" | "limit_reached",
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "validation");
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super(`${entity} not found`, "not_found");
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, "conflict");
  }
}

/** A dependency we rely on (exchange rates, OCR) could not answer. */
export class ServiceUnavailableError extends DomainError {
  constructor(message: string) {
    super(message, "unavailable");
  }
}

/** A daily usage limit (such as receipt scans) has been reached. */
export class LimitReachedError extends DomainError {
  constructor(message: string) {
    super(message, "limit_reached");
  }
}
