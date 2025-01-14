from fastapi import FastAPI, HTTPException, WebSocket, Request, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketDisconnect
from contextlib import asynccontextmanager
import inspect
from bson import ObjectId
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional

from app.workflows.correction import g as correction_graph
from app.workflows.vocabulary import g as vocabulary_graph
from app.workflows.breakdown import g as breakdown_graph

from app.db.mongodb import ping_mongodb, main_db
from app.utils.compile_graph import compile_graph_with_async_checkpointer
from app.models import (
    CorrectionItem,
    Correction,
    Vocabulary,
    Breakdown,
    General,
    ResponseType,
)

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from app.llm import chat_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ping_mongodb()
    yield


class UserMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get user_id from request headers or query parameters
        user_id = request.headers.get("user-id") or request.query_params.get("user_id")

        if user_id:
            # Fetch user info from database
            user = await main_db.users.find_one({"googleId": user_id})
            if user:
                # Add user info to request state
                request.state.user = {
                    "id": user_id,
                    "aboutMe": user.get("aboutMe", ""),
                    "englishLevel": user.get("englishLevel", ""),
                    "motherTongue": user.get("motherTongue", ""),
                }
            else:
                request.state.user = None
        else:
            request.state.user = None

        response = await call_next(request)
        return response


async def get_current_user(websocket: WebSocket) -> Optional[dict]:
    # For WebSocket connections, we'll get the user_id from the query parameters
    user_id = websocket.query_params.get("user_id")
    if user_id:
        user = await main_db.users.find_one({"googleId": user_id})
        if user:
            return {
                "id": user_id,
                "aboutMe": user.get("aboutMe", ""),
                "englishLevel": user.get("englishLevel", ""),
                "motherTongue": user.get("motherTongue", ""),
            }
    return None


app = FastAPI(title="English Tutor API", lifespan=lifespan)

app.add_middleware(UserMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://backend-production-c134.up.railway.app",
        "https://englishtutor-production.up.railway.app",
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
        user = await get_current_user(websocket)
        if not user:
            await websocket.send_json(
                {"error": "No user ID provided or user not found"}
            )
            return

        data = await websocket.receive_json()

        type = ResponseType.CORRECTION.value
        input = data.get("input")

        if not input:
            error_msg = "No text provided"
            await websocket.send_json({"error": error_msg})
            return

        graph = correction_graph
        result = Correction(userId=user["id"], input=input)
        workflow = await compile_graph_with_async_checkpointer(graph, type)

        result_id = result.id
        result_id_str = str(result_id)

        async for stream_mode, data in workflow.astream(
            {
                "input": input,
                "thread_id": result_id_str,
                "aboutMe": user.get("aboutMe", ""),
                "englishLevel": user.get("englishLevel", ""),
                "motherTongue": user.get("motherTongue", ""),
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
    Process vocabulary for the provided input.
    """
    try:
        await websocket.accept()
        user = await get_current_user(websocket)
        if not user:
            await websocket.send_json(
                {"error": "No user ID provided or user not found"}
            )
            return

        data = await websocket.receive_json()

        type = ResponseType.VOCABULARY.value
        input = data.get("input")

        if not input:
            error_msg = "No text provided"
            await websocket.send_json({"error": error_msg})
            return

        graph = vocabulary_graph
        result = Vocabulary(userId=user["id"], input=input)
        workflow = await compile_graph_with_async_checkpointer(graph, type)

        result_id = result.id
        result_id_str = str(result_id)

        async for stream_mode, data in workflow.astream(
            {
                "input": input,
                "thread_id": result_id_str,
                "aboutMe": user.get("aboutMe", ""),
                "englishLevel": user.get("englishLevel", ""),
                "motherTongue": user.get("motherTongue", ""),
            },
            stream_mode=["custom"],
            config={"configurable": {"thread_id": result_id_str}},
        ):
            response_data = {
                "id": result_id_str,
                "type": type,
            }
            if "extracted_word" in data.keys():
                extracted_word = data["extracted_word"]
                result.input = extracted_word
                response_data["input"] = extracted_word
            elif "corrected_input" in data.keys():
                corrected_input = data["corrected_input"]
                result.input = corrected_input
                response_data["input"] = corrected_input

            if "definition" in data.keys():
                definition = data["definition"]
                result.definition = definition
                response_data["definition"] = definition

            if "translated_vocabulary" in data.keys():
                translated_vocabulary = data["translated_vocabulary"]
                result.translated_vocabulary = translated_vocabulary
                response_data["translated_vocabulary"] = translated_vocabulary

            if "examples" in data.keys():
                streaming_examples = data["examples"]  # streaming the whole list
                result.examples = streaming_examples  # update with the lastest value
                response_data["examples"] = streaming_examples

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
    Process text breakdown for the provided input.
    """
    try:
        await websocket.accept()
        user = await get_current_user(websocket)
        if not user:
            await websocket.send_json(
                {"error": "No user ID provided or user not found"}
            )
            return

        data = await websocket.receive_json()

        type = ResponseType.BREAKDOWN.value
        input = data.get("input")

        if not input:
            error_msg = "No text provided"
            await websocket.send_json({"error": error_msg})
            return

        graph = breakdown_graph
        result = Breakdown(userId=user["id"], input=input)
        workflow = await compile_graph_with_async_checkpointer(graph, type)

        result_id = result.id
        result_id_str = str(result_id)

        async for stream_mode, data in workflow.astream(
            {
                "input": input,
                "thread_id": result_id_str,
                "aboutMe": user.get("aboutMe", ""),
                "englishLevel": user.get("englishLevel", ""),
                "motherTongue": user.get("motherTongue", ""),
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


@app.websocket("/ws/general")
async def general_ws(websocket: WebSocket):
    """
    Process general questions.
    """
    try:
        await websocket.accept()
        user = await get_current_user(websocket)
        if not user:
            await websocket.send_json(
                {"error": "No user ID provided or user not found"}
            )
            return

        data = await websocket.receive_json()

        type = ResponseType.GENERAL.value
        input = data.get("input")

        if not input:
            error_msg = "No text provided"
            await websocket.send_json({"error": error_msg})
            return

        streaming = (
            ChatPromptTemplate.from_messages(
                [
                    (
                        "system",
                        "You are a helpful assistant in AI English Tutor app which helps users to learn English. Most of the users in this platform are not native Enlgish speaker. When you answer to the users, you should explain with easy vocabulary and grammar. Giving an example or explain the history of the word or phrase would be a good practice. Try to make your response concise so that the user can read it quickly. You can use Markdown format in your response.",
                    ),
                    ("human", "{input}"),
                ]
            )
            | chat_model
        ).astream({"input": input})

        result = General(userId=user["id"], input=input)
        result_id = result.id
        result_id_str = str(result_id)

        full_response = ""
        async for chunk in streaming:
            full_response += chunk.content
            await websocket.send_json(
                {
                    "id": result_id_str,
                    "type": type,
                    "answer": chunk.content,
                }
            )

        result.answer = full_response

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


@app.post("/further-questions")
async def further_questions(data: dict):
    async def update_db(result_id: str, question: str, response_text: str):
        result_id_obj = ObjectId(result_id)
        result = await main_db.results.find_one({"_id": result_id_obj})

        if not result:
            raise HTTPException(
                status_code=404, detail=f"Result with id {result_id} not found"
            )

        if "extraQuestions" not in result:
            result["extraQuestions"] = []
        result["extraQuestions"].append(
            {
                "question": question,
                "answer": response_text,
            }
        )
        update_result = await main_db.results.update_one(
            {"_id": result_id_obj},
            {"$set": {"extraQuestions": result["extraQuestions"]}},
        )
        if not update_result.matched_count:
            raise HTTPException(
                status_code=404,
                detail=f"Result with id {result_id} not found during update",
            )
        if not update_result.modified_count:
            raise HTTPException(
                status_code=400, detail=f"Result with id {result_id} not updated"
            )

    streaming = (
        ChatPromptTemplate.from_template(
            """
You are a experienced ESL tutor. Your student asked {type} question. 

Question: {input}. 

You answered back to the student with the following explanation: 
{context}

Then the student asked you another question: {question}

Now, it's your turn to answer back to the student about the latest question.

Don't include "output: " or "here is the answer: ". Only return the answer.
"""
        )
        | chat_model
        | StrOutputParser()
    ).astream(
        {
            "type": data.get("type"),
            "input": data.get("input"),
            "context": data.get("context"),
            "question": data.get("question"),
        }
    )

    # collect the response and update the DB
    async def response_and_update():
        response_text = ""
        try:
            async for chunk in streaming:
                response_text += chunk
                yield chunk

            # After streaming is complete, update the database
            await update_db(data.get("resultId"), data.get("question"), response_text)
        except Exception as e:
            # Log the error but don't interrupt the stream
            print(f"Error updating database: {str(e)}")
            raise

    return StreamingResponse(response_and_update(), status_code=200)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
