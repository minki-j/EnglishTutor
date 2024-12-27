import motor.motor_asyncio
from decouple import config

MONGODB_URL = config("MONGODB_URL", default="mongodb://localhost:27017/english-tutor")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.get_database()


async def connect_to_mongo():
    try:
        await client.admin.command("ping")
        print("Successfully connected to MongoDB")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        raise e
