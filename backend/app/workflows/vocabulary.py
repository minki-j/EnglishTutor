import os
from varname import nameof as n
from pydantic import BaseModel, Field
from langgraph.graph import START, END, StateGraph
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.llm import chat_model


class OutputState(BaseModel):
    corrected: str = Field(default="")
    explanation: str = Field(default="")


class InputState(BaseModel):
    thread_id: str
    input: str


class CorrectionState(InputState, OutputState):
    pass


g = StateGraph(CorrectionState, input=InputState, output=OutputState)
g.add_edge(START, "a")
g.add_node("a", lambda x: {"corrected": "a"})
g.add_node("b", lambda x: {"explanation": "b"})
g.add_edge("a", "b")
g.add_edge("b", END)
