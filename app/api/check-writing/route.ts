import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import Correction from "@/models/Correction";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define Zod schema for the correction response
const CorrectionSchema = z.object({
  corrected: z.string().describe("The corrected version of the input text"),
  corrections: z.array(
    z.object({
      correction: z.string().describe("before and after correction connected by '→'"),
      explanation: z.string().describe("Detailed explanation of why the correction was made")
    })
  ).describe("Array of corrections and their explanations"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { text } = await req.json();

    const response = await openai.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an English teacher helping non-native speakers improve their English. 
Provide corrections and explanations in a clear, supportive manner.

--- 

Always respond with JSON with markdown formatting for strings in the following format:
{
  "corrected": "string of corrected text",
  "corrections": [{"correction": "string explaining each correction", "explanation": "string explaining each correction"}]
}

And keep in mind these important rules:
- When the user's text is unclear, ask for clarification.
- Don't make corrections that are not needed. For example, don't change phrases just because it's more fancy or complex. You should only correct when the user says something that is not grammatically correct, sounds unnatural or is not clear.
- Do not make corrections with capitalization and commas unless it's absolutely necessary.
- When there are more then 3 corrections, only add 3 most important ones in the corrections array.

---

Here are examples:

user's text: "I go to the store every day."
corrected: "This sentence is grammatically correct and sounds natural. Great job!"
corrections: []

user's text: "What do you usually do within one hours before going to the bed?"
corrected: "What do you usually do one hour before going to bed?"
corrections: [{
  "drop \`within\`": "\`Within one hour before going to bed\` would mean at any point inside the one-hour time frame before bedtime, not focusing on the full period. This wording could be used if you wanted to know about something that happens at some random or unspecified time during that hour, like:
\`Do you drink water within one hour before bed?\`
This implies it could happen at the 30-minute mark, the 10-minute mark, or just before bed—anywhere inside that hour.

However, your question is about someone's routine during the entire hour before bedtime. You're asking about everything they usually do in that specific period of time leading up to sleep."}, 
  {"one hours → one hour": "One hour is singular"}]

user's text: "I don't have an access to internet."
corrected: "I don't have access to the internet."
corrections: [{"an access → access": "The word \`access\` is an uncountable noun in this context, meaning you cannot use "an" before it. "}, 
  {"internet → the internet": "The internet is a specific, unique entity, so we use the definite article \`the\` before it. It refers to the global network of computers, making it a singular, identifiable thing."}]


user's text: "I don't want to no five minute too long waiting."
corrected: "Can you clarify what you wanted to say? I don't understand what you mean by \`no five minutes\`. Does it mean that you don't want to wait more than 5 minutes or  you don't have 5 minutes to wait?"
corrections: []

---

Important!!
- Do not make corrections with capitalization and commas unless it's absolutely necessary.
- Even if you make corrections for capitalization and commas, don't put them in the corrections array.


`,
        },
        {
          role: "user",
          content: `Please correct this text and provide a list of corrections with explanations: "${text}"`,
        },
      ],
      response_format: zodResponseFormat(CorrectionSchema, "correction"),
    });
    const result = response.choices[0].message.parsed;
    if (!result) {
      return new NextResponse("Failed to parse response", { status: 500 });
    }

    // Connect to MongoDB
    await connectDB();

    // Save the correction to MongoDB
    await Correction.create({
      userId: session.user?.id,
      originalText: text,
      correctedText: result.corrected,
      corrections: result.corrections,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking writing:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}