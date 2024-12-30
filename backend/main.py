from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketDisconnect
from contextlib import asynccontextmanager

from app.workflows.correction import g as correction_graph
from app.workflows.vocabulary import g as vocabulary_graph
from app.workflows.breakdown import g as breakdown_graph

from app.db.mongodb import ping_mongodb, main_db
from app.utils.compile_graph import compile_graph_with_async_checkpointer
from app.models import CorrectionItem, Correction, Vocabulary, Breakdown


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ping_mongodb()
    yield


app = FastAPI(title="English Tutor API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://backend-production-c134.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Service is running"}

@app.get("/correction", response_model=Correction)
async def get_corrections():
    return Correction(
        userId="123",
        input="Hello, world!",
        correctedText="Hello, world!",
        corrections=[CorrectionItem(correction="Hello, world!", explanation="Hello, world!")],
    )


@app.websocket("/ws/tutor")
async def tutor_ws(websocket: WebSocket):
    """
    correct the provided input and provide explanations for corrections.
    """
    try:
        await websocket.accept()
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
            graph = correction_graph
            result = Correction(
                userId=user_id,
                input=input,
            )
        elif type == "vocabulary":
            graph = vocabulary_graph
            result = Vocabulary(
                userId=user_id,
                input=input,
            )
        elif type == "breakdown":
            graph = breakdown_graph
            result = Breakdown(
                userId=user_id,
                input=input,
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid type")

        workflow = await compile_graph_with_async_checkpointer(graph, type)

        result_id = result.id
        result_id_str = str(result_id)
        config = {"configurable": {"thread_id": result_id_str}}

        # Stream the intermediate results
        # TODO: Not working for Vocabulary and Breakdown
        async for data in workflow.astream(
            {"input": input, "thread_id": result_id_str},
            stream_mode="custom",
            config=config,
        ):
            print("\n Graph stream: ", data)
            # Serialize CorrectionItem
            if "correction" in data and isinstance(data["correction"], CorrectionItem):
                result.corrections.append(data["correction"])
                data["correction"] = data["correction"].model_dump()
            elif "example" in data and isinstance(data["example"], str):
                result.examples.append(data["example"])
            else:
                for key, value in data.items():
                    if hasattr(result, key):
                        setattr(result, key, value)

            print("\n >>> Send data\n", data)
            await websocket.send_json(
                {
                    "id": result_id_str,
                    "type": type,
                    **data,
                }
            )

        print("\n >>> result: ", result)
        # Convert Pydantic model to dictionary before inserting
        result_dict = result.model_dump()
        result_dict['_id'] = result_dict.pop('id')
        await main_db.results.insert_one(result_dict)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected")
    except ValueError as e:
        print(f"JSON parsing error: {str(e)}")
        await websocket.send_json({"error": f"Invalid JSON format: {str(e)}"})
    except HTTPException as e:
        print(f"HTTP error {e.status_code}: {e.detail}")
        await websocket.send_json({"error": e.detail})
    except Exception as e:
        # Get detailed error information
        import traceback
        error_trace = traceback.format_exc()
        print(f"Unexpected error: {str(e)}")
        print(f"Traceback:\n{error_trace}")
        await websocket.send_json({
            "error": str(e),
            "details": error_trace if app.debug else "Internal server error"
        })
    finally:
        print("Closing WebSocket connection")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
