import { NextRequest, NextResponse } from "next/server";
import { listAccounts } from "@/lib/repositories/accounts.repository";
import { requireAdmin } from "@/lib/auth";
import {
  InvalidAccountQueryError,
  parseAccountQuery,
} from "@/lib/admin/account-query";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const result = await listAccounts(
      parseAccountQuery(request.nextUrl.searchParams),
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof InvalidAccountQueryError
            ? error.message
            : "Failed to load accounts.",
      },
      {
        status: error instanceof InvalidAccountQueryError ? 400 : 500,
      },
    );
  }
}
