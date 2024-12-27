from varname import nameof as n
from enum import Enum
from pydantic import BaseModel, Field

from langgraph.graph import START, END, StateGraph
from langgraph.types import StreamWriter, Command

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.state import OverallState, InputState, OutputState
from app.llm import chat_model
from app.models import CorrectionItem


def correct_input(state: OverallState, writer: StreamWriter):
    corrected_input = (
        ChatPromptTemplate.from_template(
            """You are a experienced ESL tutor. Improve the following text: {input}"""
        )
        | chat_model
        | StrOutputParser()
    ).invoke(
        {
            "input": state.input,
        }
    )

    # Stream the output via StreamWriter
    writer(corrected_input)

    return {
        "corrected": corrected_input,
    }


def generate_explanation(state: OverallState, writer: StreamWriter):
    class Goto(str, Enum):
        END = "END"
        GENERATE_EXPLANATION = "generate_explanation"

    class ExplanationResponse(BaseModel):
        explanation: CorrectionItem
        goto: Goto = Field(
            description="If there is no more explanation, return END. Otherwise, return generate_explanation"
        )

    response = (
        ChatPromptTemplate.from_template(
            """You are a experienced ESL tutor. Your student asked you to look at their Enlglish expression or writing and improve it.
            Here is their original: {input}
            Here it your corrected version: {corrected}
            
            Now you have to give explanations for your corrections.  """
        )
        | chat_model.with_structured_output(ExplanationResponse)
    ).invoke(
        {
            "input": state.input,
        }
    )

    return Command(
        update={"corrections": response.explanation},
        goto=response.goto,
    )


g = StateGraph(OverallState, input=InputState, output=OutputState)
g.add_edge(START, n(correct_input))

g.add_node(n(correct_input), correct_input)
g.add_edge(n(correct_input), n(generate_explanation))

g.add_node(n(generate_explanation), generate_explanation)
