import { NextResponse } from "next/server";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ER_DUP_ENTRY";
}

export function errorResponse(err: unknown, duplicateMessage = "That already exists."): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
  if (isDuplicateError(err)) {
    return NextResponse.json({ message: duplicateMessage }, { status: 409 });
  }
  console.error(err);
  return NextResponse.json({ message: "Something went wrong on the server." }, { status: 500 });
}

export const validUsername = (u: string) => /^[a-zA-Z0-9_.-]{3,50}$/.test(u);
export const validPassword = (p: string) => p.length >= 12 && p.length <= 200;
export const validEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);