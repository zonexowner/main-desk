import { NextResponse } from "next/server";

const TOKEN_HEADER = "x-app-write-token";

export function getWriteAccessToken(): string | null {
  return (
    process.env.APP_WRITE_TOKEN?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

export function assertWriteAccess(request: Request): NextResponse | null {
  const configuredToken = getWriteAccessToken();

  if (!configuredToken) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "APP_WRITE_TOKEN or CRON_SECRET required for job endpoints in production",
        },
        { status: 503 },
      );
    }
    return null;
  }

  const headerToken = request.headers.get(TOKEN_HEADER);
  const auth = request.headers.get("authorization");
  const bearerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (headerToken === configuredToken || bearerToken === configuredToken) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
