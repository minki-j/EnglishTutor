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
    print("\n>>> NODE: correct_input")

    corrected_input = (
        ChatPromptTemplate.from_template(
            """You are a experienced ESL tutor. Your student asked you to look at their Enlglish expression or writing. Here is what they showed you: {input}
As an ESL teacher and a native English speaker, think if there is any grammatical errors or awkward expressions. If so, correct them and return it without any explanation or preambles such as "This sentence is grammatically correct:". Only return the corrected text."""
        )
        | chat_model
        | StrOutputParser()
    ).invoke(
        {
            "input": state.input,
        }
    )

    # Stream the output via StreamWriter
    writer({"correctedText": corrected_input})

    return {
        "correctedText": corrected_input,
    }


def generate_explanation(state: OverallState, writer: StreamWriter):
    print("\n>>> NODE: generate_explanation")

    class Goto(str, Enum):
        END = "__end__"
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
Here it your corrected version: {correctedText}

Now you have to give explanations for your corrections one by one.

Here is the explanations that you have already given: 
{corrections}

If you don't have any more explanations, return END for 'goto' field with empty string for 'explanation' field.
If there is more explanations, then return generate_explanation for 'goto' field with the explanation for 'explanation' field.

---

Example:

input: However I go store everyday

corrected version: However, I go to the store every day.

explanation:

    correction: go → go to
    explanation: **to** must come after the verb **go** to show direction or a destination. 

    correction: store → the store
    explanation: add **the** before **store** because it shows we’re talking about a specific store, not just any store. In English, **the** helps make it clear which place we mean.

---

Important!!
- Don't explain corrections related to minor spelling errors, capitalizations, and punctuations.
- Explain more important corrections first
"""
        )
        | chat_model.with_structured_output(ExplanationResponse)
    ).invoke(
        {
            "input": state.input,
            "correctedText": state.correctedText,
            "corrections": (
                "\n".join(
                    [
                        f"{item.correction}: {item.explanation}"
                        for item in state.corrections
                    ]
                )
                if len(state.corrections) > 0
                else "There is no correction yet. This is your first correction."
            ),
        }
    )

    writer({"correction": response.explanation})

    return Command(
        update={"corrections": [response.explanation]},
        goto=response.goto.value,
    )


g = StateGraph(OverallState, input=InputState, output=OutputState)
g.add_edge(START, n(correct_input))

g.add_node(n(correct_input), correct_input)
g.add_edge(n(correct_input), n(generate_explanation))

g.add_node(n(generate_explanation), generate_explanation)
