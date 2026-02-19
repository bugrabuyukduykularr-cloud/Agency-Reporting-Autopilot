export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("not authenticated") ||
      msg.includes("jwt expired") ||
      msg.includes("invalid token") ||
      msg.includes("unauthorized")
    );
  }
  return false;
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("rate limit") || msg.includes("429");
  }
  return false;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}
