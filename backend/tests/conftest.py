import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from mongomock_motor import AsyncMongoMockClient
import os
import asyncio

@pytest.fixture
def test_db():
    # Must use the event loop of the one runing the test
    loop = asyncio.get_event_loop()
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI"), io_loop=loop)
    test_db = client.get_database("test")
    return test_db
