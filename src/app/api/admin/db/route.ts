import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No DB URL" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table") || "deals";

    let rows = [];
    let stats: any = {};

    if (table === "coins") {
      rows = await sql`
SELECT * FROM coins
ORDER BY coin ASC;
`;
      const cRes: any = await sql`
SELECT COUNT(*) as count 
FROM coins;
`;
      stats.count = parseInt(cRes[0]?.count || "0", 10);
    } else {
      rows = await sql`
SELECT * FROM deals
ORDER BY created_at DESC;
`;
      const dRes: any = await sql`
SELECT COUNT(*) as count 
FROM deals;
`;
      stats.count = parseInt(dRes[0]?.count || "0", 10);
    }

    return NextResponse.json({
      success: true,
      table,
      stats,
      data: rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function DELETE(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No DB URL" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");

    if (table === "coins") {
      await sql`
TRUNCATE TABLE coins CASCADE;
`;
    } else if (table === "deals") {
      await sql`
TRUNCATE TABLE deals CASCADE;
`;
    } else {
      return NextResponse.json({ error: "Unknown table" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Table truncated",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
