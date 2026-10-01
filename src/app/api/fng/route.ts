import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://api.alternative.me/fng/", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Err" }, { status: 500 });
  }
}
