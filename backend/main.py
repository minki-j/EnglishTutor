from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketDisconnect
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import inspect

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

        aboutMe = ""

        if type == "correction":
            graph = correction_graph
            result = Correction(
                userId=user_id,
                input=input,
            )
        elif type == "vocabulary":
            graph = vocabulary_graph
            user = await main_db.users.find_one({"googleId": user_id})
            aboutMe = user.get("aboutMe", "")
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

        print("calling workflow")

        # Stream the intermediate results
        async for stream_mode, data in workflow.astream(
            {"input": input, "thread_id": result_id_str, "aboutMe": aboutMe},
            stream_mode=["custom", "messages"],
            config=config,
        ):
            # print("\n Graph stream: ", data)
            response_data = {
                "id": result_id_str,
                "type": type,
            }

            if stream_mode == "messages":
                message, metadata = data
                if not message.content:
                    continue

                if metadata["langgraph_node"] != "generate_breakdown":
                    continue

                response_data["stream"] = message.content


                result.breakdown = result.breakdown + message.content

                await websocket.send_json(response_data)
                continue


            if "correction" in data and isinstance(data["correction"], CorrectionItem):
                # Serialize CorrectionItem
                result.corrections.append(data["correction"])
                response_data["correction"] = data["correction"].model_dump()
            elif "example" in data and isinstance(data["example"], str):
                result.examples.append(data["example"])
                response_data["example"] = data["example"]
            else:
                print("\n>>> Update data\n", data)
                for k, v in data.items():
                    setattr(result, k, v)
                response_data.update(data)

            # Only send if we haven't already sent in the coroutine streaming loop
            if not any(inspect.iscoroutine(v) for v in data.values()):
                print("\n >>> Send data\n", response_data)
                await websocket.send_json(response_data)

        print("\n\n>>> result: ", result)
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
