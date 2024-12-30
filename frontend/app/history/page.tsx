import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ResultCard } from "@/components/result-card";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import { CorrectionModel } from "@/models/Correction";
import type { WritingEntry } from "@/types/writingEntry";

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

  await connectDB();
  const [corrections, totalCount] = await Promise.all([
    CorrectionModel.find({ userId: session.user?.id })
      .select({ 
        id: { $toString: '$_id' },
        ...Object.fromEntries(Object.keys(CorrectionModel.schema.paths).map(key => [key, 1])),
        _id: 0
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CorrectionModel.countDocuments({ userId: session.user?.id }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);


  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="space-y-4">
        {corrections.map((correction) => (
          <ResultCard key={correction.id} entry={correction} />
        ))}
        {corrections.length === 0 && (
          <p className="text-muted-foreground">No history found.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <a
                key={pageNum}
                href={`/history?page=${pageNum}`}
                className={`px-4 py-2 border rounded ${
                  pageNum === page
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {pageNum}
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}