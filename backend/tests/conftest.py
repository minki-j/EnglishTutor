import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from mongomock_motor import AsyncMongoMockClient
import os
import asyncio
import uuid
from main import app
from fastapi.testclient import TestClient

global_user_id = str(uuid.uuid4())


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_db():
    # Must use the event loop of the one runing the test
    loop = asyncio.get_event_loop()
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI"), io_loop=loop)
    test_db = client.get_database("test")
    return test_db


@pytest.fixture
def user_id():
    return global_user_id


@pytest.fixture
def mock_main_db(
    results=[{}],
    users=[
        {
            "userId": global_user_id,
            "googleId": global_user_id,
            "name": "mock name",
            "email": "mock_email@gmail.com",
            "image": "https://mock_image_url",
            "aboutMe": "I'm a jazz pianist living in New York.",
            "createdAt": "2022-01-01T00:00:00.000Z",
            "updatedAt": "2022-01-01T00:00:00.000Z",
        }
    ],
):

    class MockCollection:
        def __init__(self, items):
            self.items = items

        async def insert_one(self, item):
            self.items.append(item)
            return type("ObjectId", (), {"inserted_id": "mock_id"})()

        async def find_one(self, query):
            for item in self.items:
                if all(item.get(k) == v for k, v in query.items()):
                    return item
            return None

        async def delete_one(self, query):
            for item in self.items:
                if all(item.get(k) == v for k, v in query.items()):
                    self.items.remove(item)

        async def print_all(self):
            for item in self.items:
                print(item)

    class MockDB:
        def __init__(self, results, users):
            self.results = MockCollection(results)
            self.users = MockCollection(users)

    return MockDB(results=results, users=users)


@pytest.fixture
def cleanup_db(mock_main_db, user_id):
    yield # Run the test first

    # Run after the test is done
    asyncio.run(mock_main_db.results.delete_one({"userId": user_id}))
    result = asyncio.run(mock_main_db.results.find_one({"userId": user_id}))
    assert result is None


@pytest.fixture(autouse=True)
def patch_main_db(monkeypatch, mock_main_db):
    """
    Automatically patch main_db for all tests
    """
    import main

    monkeypatch.setattr(main, "main_db", mock_main_db)
