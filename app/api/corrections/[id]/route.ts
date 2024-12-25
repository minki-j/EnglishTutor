import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Correction from "@/models/Correction";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectDB();

    const correction = await Correction.findOne({
      _id: params.id,
      userId: session.user?.id,
    });

    if (!correction) {
      return new NextResponse("Correction not found", { status: 404 });
    }

    await Correction.findByIdAndDelete(params.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CORRECTION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
