"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { updateProfile } from "./actions";

import { User } from "@/models/User";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [user.aboutMe]);

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
        <Label htmlFor="name" className="block text-sm font-medium">
          Name
        </Label>
        <Input
          type="text"
          id="name"
          name="name"
          defaultValue={user.name}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="block text-sm font-medium">
          Email
        </Label>
        <Input
          type="email"
          id="email"
          name="email"
          defaultValue={user.email}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-4">
        <div>
          <Label
            htmlFor="motherTongue"
            className="block text-sm font-medium mb-2"
          >
            Mother Tongue
          </Label>
          <Input
            id="motherTongue"
            name="motherTongue"
            defaultValue={user.motherTongue}
            placeholder="Enter your native language"
            className="w-full"
          />
        </div>

        <div>
          <Label
            htmlFor="englishLevel"
            className="block text-sm font-medium mb-2"
          >
            English Level
          </Label>
          <Select name="englishLevel" defaultValue={user.englishLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select your English level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Elementary">Elementary</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aboutMe" className="block text-sm font-medium">
          About Me
        </Label>
        <Textarea
          ref={textareaRef}
          id="aboutMe"
          name="aboutMe"
          defaultValue={user.aboutMe}
          rows={4}
          placeholder="Tell us about yourself, your interests, and your learning goals..."
          onChange={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          className="mb-4 min-h-[100px] max-h-[300px] text-md resize-none leading-relaxed"
        />
        <p className="text-sm text-gray-500">
          This information will be used to generate example sentences that are
          relevant to your situation.
        </p>
      </div>

      <Button type="submit" className="">
        Save Changes
      </Button>
    </form>
  );
}
