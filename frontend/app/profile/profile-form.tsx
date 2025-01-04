'use client';

import { useToast } from "@/components/ui/use-toast";
import { updateProfile } from "./actions";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    aboutMe?: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast();

  async function clientAction(formData: FormData) {
    await updateProfile(formData);
    toast({
      title: "Success",
      description: "Your profile has been updated successfully.",
    });
  }

  return (
    <form action={clientAction} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={user.name}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          defaultValue={user.email}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="aboutMe" className="block text-sm font-medium">
          About Me
        </label>
        <textarea
          id="aboutMe"
          name="aboutMe"
          defaultValue={user.aboutMe}
          rows={4}
          placeholder="Tell us about yourself, your interests, and your learning goals..."
          className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-500">
          This information will be used to generate example sentences that are relevant to your situation.
        </p>
      </div>

      <button
        type="submit"
        className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Save Changes
      </button>
    </form>
  );
}
