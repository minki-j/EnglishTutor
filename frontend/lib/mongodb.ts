import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI
if (!uri) {
  throw new Error("MONGODB_URI is not set");
}


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connect() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

connect().catch(console.error);

export default client;
