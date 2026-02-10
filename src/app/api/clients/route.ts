import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
      },
    });
    return NextResponse.json(clients);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
}
