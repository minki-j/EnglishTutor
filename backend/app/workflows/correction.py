import os
import sqlite3
from varname import nameof as n
from pydantic import BaseModel, Field
import asyncio

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from langgraph.graph import START, END, StateGraph

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.llm import llm

from langgraph.checkpoint.mongodb import MongoDBSaver
from langgraph.checkpoint.mongodb.aio import AsyncMongoDBSaver
from pymongo import AsyncMongoClient


class OutputState(BaseModel):
    corrected: str = Field(default="")
    explanation: str = Field(default="")


class InputState(BaseModel):
    input: str


class CorrectionState(InputState, OutputState):
    pass


g = StateGraph(CorrectionState, input=InputState, output=OutputState)
g.add_edge(START, "a")
g.add_node("a", lambda x: {"input": "a"})
g.add_node("b", lambda x: {"input": "b"})
g.add_edge("a", "b")
g.add_edge("b", END)


async def compile_graph_with_async_checkpointer():
    print(f"==>> using AsyncMongoDBSaver")
    mongodb_client = AsyncMongoClient(os.getenv("MONGODB_URI"))
    checkpointer = AsyncMongoDBSaver(mongodb_client)
    print(f"==>> checkpointer: {checkpointer}")
    correction_graph = g.compile(checkpointer=checkpointer)

    with open("./app/workflow_diagrams/correction.png", "wb") as f:
        f.write(correction_graph.get_graph(xray=1).draw_mermaid_png())
    return correction_graph
