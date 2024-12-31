import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb"; 
import User from "@/models/User";

export default async function QuizPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-4">
        <p>Coming soon!</p>
      </div>
    </div>
  );
}
