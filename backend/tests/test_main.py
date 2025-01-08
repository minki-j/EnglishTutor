"""
Run with a conda environment that has required packages installed

example:
conda run -n enlgishtutor pytest tests/ -s

"""

import uuid
import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
import json
import os
import asyncio

from main import app

# from app.db.mongodb import main_db
from motor.motor_asyncio import AsyncIOMotorClient


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    """
    Test the health check endpoint
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "message": "Service is running"}


@pytest.mark.asyncio
async def test_correction_websocket(test_db):
    """
    Test the correction websocket endpoint with mock MongoDB
    """

    with TestClient(app).websocket_connect("/ws/correction") as websocket:
        # Test data
        user_id = uuid.uuid4().hex
        test_data = {
            "type": "correction",
            "input": "I am go to school",
            "user_id": user_id,
        }

        # Send test data
        websocket.send_json(test_data)
        print("Sent test data")

        # Collect all responses
        responses = []
        while True:
            try:
                response = websocket.receive_json()
                print("response: " + str(response))
                responses.append(response)
            except WebSocketDisconnect:
                print("Disconnected from correction websocket")
                break

        # Verify the responses
        assert len(responses) > 0
        first_response = responses[0]
        assert "id" in first_response
        assert first_response["type"] == "correction"
        assert all("error" not in response for response in responses)

        # Verify MongoDB insertion
        result = await test_db.results.find_one({"userId": user_id})
        print("Result from MongoDB: ", result)

        assert result is not None
        assert result["input"] == "I am go to school"
        assert "correctedText" in result
        assert "corrections" in result
        assert isinstance(result["corrections"], list)
