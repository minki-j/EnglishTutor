from bson import ObjectId
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketDisconnect
from contextlib import asynccontextmanager

from app.workflows.correction import g as correction_graph
from app.workflows.vocabulary import g as vocabulary_graph
from app.workflows.breakdown import g as breakdown_graph

from app.db.mongodb import ping_mongodb, main_db
from app.utils.compile_graph import compile_graph_with_async_checkpointer
from app.models import CorrectionItem

@asynccontextmanager
async def lifespan(app: FastAPI):
    await ping_mongodb()
    yield


app = FastAPI(title="English Tutor API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://backend-production-c134.up.railway.app"],
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

        type = data.get("type")
        input = data.get("input")
        user_id = data.get("user_id")

        if not type or not input or not user_id:
            error_msg = (
                "No type provided"
                if not type
                else "No text provided" if not input else "No user ID provided"
            )
            await websocket.send_json({"error": error_msg})
            return

        if type == "correction":
            workflow = await compile_graph_with_async_checkpointer(correction_graph, type)
        elif type == "vocabulary":
            workflow = await compile_graph_with_async_checkpointer(vocabulary_graph, type)
        elif type == "breakdown":
            workflow = await compile_graph_with_async_checkpointer(breakdown_graph, type)
        else:
            raise HTTPException(status_code=400, detail="Invalid type")

        correction_id = ObjectId()
        correction_id_str = str(correction_id)

        config = {"configurable": {"thread_id": correction_id_str}}
        result = {
            "_id": correction_id,
            "userId": user_id,
            "originalText": input,
            "correctedText": "",
            "corrections": [],
            "createdAt": datetime.now(),
        }

        # Stream the intermediate results from the workflow via websocket connection
        async for data in workflow.astream(
            {"input": input, "thread_id": correction_id_str},
            stream_mode="custom",
            config=config,
        ):
            # Serialize CorrectionItem
            if "correction" in data and isinstance(data["correction"], CorrectionItem):
                data["correction"] = data["correction"].model_dump()
                result["corrections"].append(data["correction"])
            elif "corrected" in data:
                result["correctedText"] = data["corrected"]
            else:
                result.update(data)

            await websocket.send_json({"id": correction_id_str, "type": type, **data})

        await main_db.corrections.insert_one(result)

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
