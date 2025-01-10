import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { MongoError } from "mongodb";

import { authOptions } from "@/lib/auth";
import { client } from "@/lib/mongodb";

import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";

import { HistoryList } from "@/components/history-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const page = Number(searchParams.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const db = client.db("test");
    const collection = db.collection('results');

    console.time("MongoDB query");
    const [corrections, totalCount] = await Promise.all([
      collection
        .find({ userId: session.user?.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments({ userId: session.user?.id }),
    ]);
    console.timeEnd("MongoDB query");

    const formattedCorrections = corrections.map((doc) => {
      const baseFields = {
        id: doc._id.toString(),
        type: doc.type,
        userId: doc.userId,
        input: doc.input,
        createdAt: doc.createdAt,
        extraQuestions: doc.extraQuestions
      } as const;

      switch (doc.type) {
        case "vocabulary":
          return {
            ...baseFields,
            definition: doc.definition!,
            examples: doc.examples!
          } as IVocabulary;
        case "correction":
          return {
            ...baseFields,
            correctedText: doc.correctedText!,
            corrections: doc.corrections!
          } as ICorrection;
        case "breakdown":
          return {
            ...baseFields,
            breakdown: doc.breakdown!,
            paraphrase: doc.paraphrase!
          } as IBreakdown;
        default:
          throw new Error(`Unknown type: ${doc.type}`);
      }
    });

    const totalPages = Math.ceil(totalCount / limit);

    return (
      <div className="max-w-2xl mx-auto py-8">
        <HistoryList initialEntries={formattedCorrections} />
        {totalPages > 1 && (
          <nav className="flex justify-center gap-2 mt-8" aria-label="Pagination">
            {page > 1 && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={`/history?page=${page - 1}`}>Previous</a>
              </Button>
            )}
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(num => {
                  // Show first page, last page, current page, and pages around current page
                  return num === 1 ||
                    num === totalPages ||
                    Math.abs(num - page) <= 1;
                })
                .map((pageNum, index, array) => {
                  // Add ellipsis when there are gaps
                  if (index > 0 && pageNum - array[index - 1] > 1) {
                    return (
                      <span key={`ellipsis-${pageNum}`} className="px-2 py-2">
                        ...
                      </span>
                    );
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      asChild
                    >
                      <a href={`/history?page=${pageNum}`}>
                        {pageNum}
                      </a>
                    </Button>
                  );
                })}
            </div>
            {page < totalPages && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={`/history?page=${page + 1}`}>Next</a>
              </Button>
            )}
          </nav>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error fetching history:', error);
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          <h2 className="font-semibold">Error loading history</h2>
          <p className="text-sm mt-1">
            {error instanceof MongoError
              ? "Failed to connect to the database. Please try again later."
              : "An unexpected error occurred. Please try again later."}
          </p>
        </div>
      </div>
    );
  }
}