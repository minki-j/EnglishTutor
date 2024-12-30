import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ResultCard } from "@/components/result-card";
import { redirect } from "next/navigation";
import client from "@/lib/mongodb";

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

  const db = client.db("test");
  const collection = db.collection('results');

  console.time('MongoDB Query');
  const [corrections, totalCount] = await Promise.all([
    collection
      .find({ userId: session.user?.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments({ userId: session.user?.id }),
  ]);
  console.timeEnd('MongoDB Query');

  const formattedCorrections = corrections.map((correction) => ({
    ...correction,
    id: correction._id.toString(),
    _id: undefined
  }));

  const totalPages = Math.ceil(totalCount / limit);


  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="space-y-4">
        {formattedCorrections.map((correction) => (
          <ResultCard key={correction.id} entry={correction} />
        ))}
        {formattedCorrections.length === 0 && (
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