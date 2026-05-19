import { NextResponse } from "next/server";
import { renderQuotePdf } from "@/lib/pdf/render-quote";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const rendered = await renderQuotePdf(id);
    if (!rendered) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(rendered.bytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": rendered.mimeType,
        "Content-Disposition": `attachment; filename="${rendered.filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
