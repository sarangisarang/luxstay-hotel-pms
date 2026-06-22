import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const path = req.nextUrl.searchParams.get("path");
    if (!path) return NextResponse.json({ error: "No path" }, { status: 400 });

    const token = req.headers.get("authorization"); // frontend-იდან მოვა

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE}${path}`;
    const res = await fetch(backendUrl, {
        headers: token ? { Authorization: token } : undefined,
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Backend fetch failed" }, { status: res.status });
    }

    const blob = await res.blob();
    return new NextResponse(blob, {
        headers: {
            "Content-Type": res.headers.get("content-type") || "application/octet-stream",
        },
    });
}