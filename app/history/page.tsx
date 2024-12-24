import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CorrectionCard } from "@/components/correction-card";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Correction from "@/models/Correction";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/");
  }

  await connectDB();
  const corrections = await Correction.find({ 
    userId: session.user?.id 
  }).sort({ createdAt: -1 }).lean();

  const formattedCorrections = corrections.map((correction: any) => ({
    id: correction._id.toString(),
    original: correction.originalText,
    corrected: correction.correctedText,
    corrections: correction.corrections,
  }));

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Your Correction History</h1>
      <div className="space-y-4">
        {formattedCorrections.map((correction) => (
          <CorrectionCard key={correction.id} entry={correction} />
        ))}
        {formattedCorrections.length === 0 && (
          <p className="text-muted-foreground">No history found.</p>
        )}
      </div>
    </div>
  );
}
