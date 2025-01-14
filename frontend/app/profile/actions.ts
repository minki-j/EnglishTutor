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

  // Convert FormData to a plain object
  const formDataObject = Object.fromEntries(formData.entries());

  const db = client.db("test");
  const collection = db.collection('users');

  await collection.updateOne(
    { googleId: session.user.id },
    {
      $set: {
        ...formDataObject,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath('/profile');
}
