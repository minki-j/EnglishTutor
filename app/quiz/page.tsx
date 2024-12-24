import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  await connectDB();
  const user = await User.findOne({
    googleId: session.user?.id,
  }).lean();

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-4">
        <p>Coming soon!</p>
      </div>
    </div>
  );
}
