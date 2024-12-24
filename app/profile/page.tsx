import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

interface UserDocument {
  googleId: string;
  name: string;
  email: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  await connectDB();
  const user = (await User.findOne({
    googleId: session.user?.id,
  }).lean()) as unknown as UserDocument;

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-4">
        {user ? (
          <>
            <p className="text-muted-foreground">{user.name}</p>
            <p className="text-muted-foreground">{user.email}</p>
          </>
        ) : (
          <p className="text-muted-foreground">No user found</p>
        )}
      </div>
    </div>
  );
}
