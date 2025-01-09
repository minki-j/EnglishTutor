"""
Run with a conda environment that has required packages installed

example:
conda run -n enlgishtutor pytest tests/ -s

"""

import pytest
from fastapi.websockets import WebSocketDisconnect


# @pytest.mark.skip(reason="Temporarily disabled")
def test_health_check(client):
    """
    Test the health check endpoint
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "message": "Service is running"}


# @pytest.mark.skip(reason="Temporarily disabled")
@pytest.mark.asyncio
async def test_correction_websocket(cleanup_db, client, user_id, mock_main_db):
    """
    Test the correction websocket endpoint with mock MongoDB
    """

    with client.websocket_connect("/ws/correction") as websocket:
        # Test data
        input = "I am go to school"
        test_data = {
            "input": input,
            "user_id": user_id,
        }

        # Send test data
        websocket.send_json(test_data)

        # Collect all responses
        responses = []
        while True:
            try:
                response = websocket.receive_json()
                responses.append(response)
            except WebSocketDisconnect:
                break

        # Verify the responses
        assert len(responses) > 0
        assert all("error" not in response for response in responses)
        assert responses[0]["type"] == "correction"

        # Verify MongoDB insertion
        result = await mock_main_db.results.find_one({"userId": user_id})
        assert result is not None
        assert result["input"] == input
        assert "correctedText" in result
        assert "corrections" in result
        assert isinstance(result["corrections"], list)


# @pytest.mark.skip(reason="Temporarily disabled")
@pytest.mark.asyncio
async def test_vocabulary_websocket(cleanup_db, client, user_id, mock_main_db):
    """
    Test the vocabulary websocket endpoint with mock MongoDB
    """

    with client.websocket_connect("/ws/vocabulary") as websocket:
        # Test data
        input = "buoy"
        test_data = {
            "input": input,
            "user_id": user_id,
        }

        # Send test data
        websocket.send_json(test_data)

        # Collect all responses
        responses = []
        while True:
            try:
                response = websocket.receive_json()
                responses.append(response)
            except WebSocketDisconnect:
                break

        # Verify the responses
        assert len(responses) > 0
        assert all("error" not in response for response in responses)
        assert responses[0]["type"] == "vocabulary"

        # Verify MongoDB insertion
        result = await mock_main_db.results.find_one({"userId": user_id})
        assert result is not None
        assert result["input"] == input
        assert "definition" in result
        assert "examples" in result
        assert isinstance(result["examples"], list)


# @pytest.mark.skip(reason="Temporarily disabled")
@pytest.mark.asyncio
async def test_breakdown_websocket(cleanup_db, client, user_id, mock_main_db):
    """
    Test the breakdown websocket endpoint with mock MongoDB
    """

    with client.websocket_connect("/ws/breakdown") as websocket:
        # Test data
        input = "I'm going to cut myself some slack"
        test_data = {
            "input": input,
            "user_id": user_id,
        }

        # Send test data
        websocket.send_json(test_data)

        # Collect all responses
        responses = []
        while True:
            try:
                response = websocket.receive_json()
                responses.append(response)
            except WebSocketDisconnect:
                break

        # Verify the responses
        assert len(responses) > 0
        assert all("error" not in response for response in responses)
        assert responses[0]["type"] == "breakdown"

        # Verify MongoDB insertion
        result = await mock_main_db.results.find_one({"userId": user_id})
        assert result is not None
        assert result["input"] == input
        assert "paraphrase" in result
        assert "breakdown" in result
        assert isinstance(result["breakdown"], str)
