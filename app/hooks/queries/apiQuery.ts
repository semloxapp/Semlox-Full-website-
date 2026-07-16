"use client";

export class ApiQueryError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiQueryError";
    this.status = status;
    this.code = code;
  }
}

export function queryMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

export function queryCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const code = (payload as Record<string, unknown>).code;
  return typeof code === "string" ? code : undefined;
}
