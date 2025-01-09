from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketDisconnect
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


@app.websocket("/ws/correction")
async def correction_ws(websocket: WebSocket):
    """
    correct the provided input and provide explanations for corrections.
    """
    try:
        await websocket.accept()
        data = await websocket.receive_json()

        type = "correction"
        input = data.get("input")
        user_id = data.get("user_id")

        if not input or not user_id:
            error_msg = (
                "No text provided" if not input else "No user ID provided"
            )
            await websocket.send_json({"error": error_msg})
            return

        graph = correction_graph
        result = Correction(userId=user_id, input=input)
        workflow = await compile_graph_with_async_checkpointer(graph, type)

        result_id = result.id
        result_id_str = str(result_id)

        async for stream_mode, data in workflow.astream(
            {
                "input": input,
                "thread_id": result_id_str,
            },
            stream_mode=["custom"],
            config={"configurable": {"thread_id": result_id_str}},
        ):
            response_data = {
                "id": result_id_str,
                "type": type,
            }
            if "correctedText" in data.keys():
                correctedText = data["correctedText"]
                result.correctedText = correctedText
                response_data["correctedText"] = correctedText

            if "correction" in data.keys():
                correction = data["correction"]
                result.corrections.append(correction)
                response_data["correction"] = correction.model_dump()

            await websocket.send_json(response_data)


        result_dict = result.model_dump()
        result_dict["_id"] = result_dict.pop("id")
        await main_db.results.insert_one(result_dict)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("Error on ws/correction: ", error_trace)
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()


@app.websocket("/ws/vocabulary")
async def vocabulary_ws(websocket: WebSocket):
    """
    correct the provided input and provide explanations for corrections.
    """
    try:
        await websocket.accept()
        data = await websocket.receive_json()

        type = "vocabulary"
        input = data.get("input")
        user_id = data.get("user_id")

        if not input or not user_id:
            error_msg = (
                "No text provided" if not input else "No user ID provided"
            )
            await websocket.send_json({"error": error_msg})
            return

        graph = vocabulary_graph
        user = await main_db.users.find_one({"googleId": user_id})
        aboutMe = user.get("aboutMe", "")
        result = Vocabulary(
            userId=user_id,
            input=input,
            aboutMe=aboutMe,
        )
        workflow = await compile_graph_with_async_checkpointer(graph, type)

        result_id = result.id
        result_id_str = str(result_id)

        async for stream_mode, data in workflow.astream(
            {
                "input": input,
                "thread_id": result_id_str,
                "aboutMe": aboutMe,
            },
            stream_mode=["custom"],
            config={"configurable": {"thread_id": result_id_str}},
        ):
            response_data = {
                "id": result_id_str,
                "type": type,
            }
            if "definition" in data.keys():
                definition = data["definition"]
                result.definition = definition
                response_data["definition"] = definition

            if "example" in data.keys():
                example = data["example"]
                result.examples.append(example)
                response_data["example"] = example

            await websocket.send_json(response_data)

        result_dict = result.model_dump()
        result_dict["_id"] = result_dict.pop("id")
        await main_db.results.insert_one(result_dict)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("Error on ws/vocabulary:", error_trace)
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()


@app.websocket("/ws/breakdown")
async def breakdown_ws(websocket: WebSocket):
    """
    correct the provided input and provide explanations for corrections.
    """
    try:
        await websocket.accept()
        data = await websocket.receive_json()

        type = "breakdown"
        input = data.get("input")
        user_id = data.get("user_id")

        if not input or not user_id:
            error_msg = (
                "No text provided" if not input else "No user ID provided"
            )
            await websocket.send_json({"error": error_msg})
            return

        graph = breakdown_graph
        result = Breakdown(userId=user_id, input=input)
        workflow = await compile_graph_with_async_checkpointer(graph, type)

        result_id = result.id
        result_id_str = str(result_id)

        async for stream_mode, data in workflow.astream(
            {
                "input": input,
                "thread_id": result_id_str,
            },
            stream_mode=["messages"],
            config={"configurable": {"thread_id": result_id_str}},
        ):
            if stream_mode == "messages":
                message, metadata = data
                if not message.content:
                    continue

                if metadata["langgraph_node"] == "generate_paraphrase":
                    result.paraphrase = result.paraphrase + message.content
                    await websocket.send_json(
                        {
                            "id": result_id_str,
                            "type": type,
                            "paraphrase": message.content,
                        }
                    )
                elif metadata["langgraph_node"] == "generate_breakdown":
                    result.breakdown = result.breakdown + message.content
                    await websocket.send_json(
                        {
                            "id": result_id_str,
                            "type": type,
                            "breakdown": message.content,
                        }
                    )

            else:
                pass

        result_dict = result.model_dump()
        result_dict["_id"] = result_dict.pop("id")
        await main_db.results.insert_one(result_dict)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("Error on ws/breakdown: ", error_trace)
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
