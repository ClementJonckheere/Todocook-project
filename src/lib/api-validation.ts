import { NextResponse } from "next/server";
import { z } from "zod";

// Messages d'erreur zod par défaut en français
z.config(z.locales.fr());

export type FieldError = { field: string; message: string };

/** Taille maximale d'un corps JSON accepté par défaut (les imports ont leur propre limite). */
export const DEFAULT_MAX_BODY_BYTES = 100 * 1024;

export function formatIssues(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "body",
    message: issue.message,
  }));
}

/**
 * Réponse 400 commune. `error` (premier message) et `errors` (détail par champ) sont tous
 * deux fournis : les écrans existants lisent l'un ou l'autre.
 */
export function validationError(errors: FieldError[] | string, status = 400) {
  const list = typeof errors === "string" ? [{ field: "body", message: errors }] : errors;
  return NextResponse.json({ error: list[0]?.message ?? "Requête invalide", errors: list }, { status });
}

type Parsed<T> = { data: T; response?: undefined } | { data?: undefined; response: NextResponse };

export function parseWith<S extends z.ZodType>(schema: S, value: unknown): Parsed<z.output<S>> {
  const result = schema.safeParse(value);
  if (!result.success) return { response: validationError(formatIssues(result.error)) };
  return { data: result.data };
}

/** Lit et valide le corps JSON : 413 si trop gros, 400 si illisible ou invalide. */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  maxBytes = DEFAULT_MAX_BODY_BYTES
): Promise<Parsed<z.output<S>>> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { response: validationError("Requête trop volumineuse.", 413) };
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { response: validationError("Requête trop volumineuse.", 413) };
  }
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return { response: validationError("Corps de requête JSON invalide.") };
  }
  return parseWith(schema, body);
}

/** Valide les paramètres de l'URL (query string). */
export function parseQuery<S extends z.ZodType>(request: Request, schema: S): Parsed<z.output<S>> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return parseWith(schema, params);
}
