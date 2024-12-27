from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.websockets import WebSocketDisconnect
import asyncio
from datetime import datetime
from app.models import WritingRequest, WritingCorrection, VocabularyExplanation, SentenceBreakdown, Correction
from app.workflows.correction import compile_graph_with_async_checkpointer
from bson import ObjectId
from app.db.mongodb import connect_to_mongo, db
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown (if you need cleanup)
    # Add cleanup code here if needed

app = FastAPI(title="English Tutor API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Service is running"}

@app.websocket("/ws/tutor")
async def tutor_ws(websocket: WebSocket):
    """
    correct the provided input and provide explanations for corrections.
    """
    await websocket.accept()

    try:
        data = await websocket.receive_json()
        print(f"==>> data: {data}")

        action = data.get("action")
        input = {"input": data.get("input")}
        user_id = data.get("user_id")

        if not action:
            await websocket.send_json({"error": "No action provided"})
            return

        if not input:
            await websocket.send_json({"error": "No text provided"})
            return
        
        if not user_id:
            await websocket.send_json({"error": "No user ID provided"})
            return

        if action == "correction":
            graph = await compile_graph_with_async_checkpointer()
        # elif action == "vocabulary":
        #     graph = vocabulary_graph
        # elif action == "breakdown":
        #     graph = breakdown_graph
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

        correction_id = ObjectId()
        config = {"configurable": {"thread_id": user_id + "-" + str(correction_id)}}

        print(f"==>> async stream")
        async for data in graph.astream(input, stream_mode="values", config=config):
            await websocket.send_json(data)
            result = data
        print(f"==>> async stream done with result: {result}")    

        await db.corrections.insert_one({
            "_id": correction_id,
            "userId": user_id,
            "originalText": input["input"],
            "correctedText": result.get("corrected"),
            "corrections": result.get("corrections"),
            "createdAt": datetime.now()
        })

    except WebSocketDisconnect:
        print("Client disconnected")
        pass
    except Exception as e:
        print(f"==>> error: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        print("==>> closing websocket")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
