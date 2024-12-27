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
from pymongo import AsyncMongoClient


class OutputState(BaseModel):
    corrected: str
    explanation: str


class InputState(BaseModel):
    input: str


class CorrectionState(InputState, OutputState):
    pass


g = StateGraph(CorrectionState, input=InputState, output=OutputState)
g.add_edge(START, "a")
g.add_node("a", lambda x: {"input": x})
g.add_edge("a", END)


mongodb_client = AsyncMongoClient(os.getenv("MONGODB_URI"))
checkpointer = MongoDBSaver(mongodb_client)
correction_graph = g.compile(checkpointer=checkpointer)

with open("./app/workflow_diagrams/correction.png", "wb") as f:
    f.write(correction_graph.get_graph(xray=1).draw_mermaid_png())
