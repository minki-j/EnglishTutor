'use server'

import { client } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const aboutMe = formData.get('aboutMe') as string;

  const db = client.db("test");
  const collection = db.collection('users');

  await collection.updateOne(
    { googleId: session.user.id },
    {
      $set: {
        name,
        email,
        aboutMe,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath('/profile');
}
