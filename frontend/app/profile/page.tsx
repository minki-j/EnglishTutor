import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { client } from "@/lib/mongodb";
import { ProfileForm } from "./profile-form";
import { User } from "@/models/User";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const db = client.db("test");
  const collection = db.collection("users");

  const user_mongodb = await collection.findOne({ googleId: session.user?.id });

  if (!user_mongodb) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">No user found</p>
      </div>
    );
  }

  const { _id, ...userData } = user_mongodb;
  const user = {
    id: _id.toString(),
    ...userData
  } as User;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      <ProfileForm user={user} />
    </div>
  );
}
