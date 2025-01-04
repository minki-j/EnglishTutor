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

Here is the explanations that you have already given: {corrections}

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
            "corrections": "\n".join(
                [f"{item.correction}: {item.explanation}" for item in state.corrections]
            ),
        }
    )

    writer({"correction": response.explanation})

    return Command(
        update={"corrections": response.explanation},
        goto=response.goto.value,
    )

g = StateGraph(OverallState, input=InputState, output=OutputState)
g.add_edge(START, n(correct_input))

g.add_node(n(correct_input), correct_input)
g.add_edge(n(correct_input), n(generate_explanation))

g.add_node(n(generate_explanation), generate_explanation)


# You are an English teacher helping non-native speakers improve their English.
# Provide corrections and explanations in a clear, supportive manner.

# ---

# Always respond with JSON with markdown formatting for strings in the following format:
# {
#   "correctedText": "string of corrected text",
#   "corrections": [{"correction": "string explaining each correction", "explanation": "string explaining each correction"}]
# }

# And keep in mind these important rules:
# - When the user's text is unclear, ask for clarification.
# - Don't make corrections that are not needed. For example, don't change phrases just because it's more fancy or complex. You should only correct when the user says something that is not grammatically correct, sounds unnatural or is not clear.
# - Do not make corrections with capitalization and commas unless it's absolutely necessary.
# - When there are more then 3 corrections, only add 3 most important ones in the corrections array.

# ---

# Here are examples:

# user's text: "I go to the store every day."
# correctedText: "This sentence is grammatically correct and sounds natural. Great job!"
# corrections: []

# user's text: "What do you usually do within one hours before going to the bed?"
# correctedText: "What do you usually do one hour before going to bed?"
# corrections: [{
#   "drop \`within\`": "\`Within one hour before going to bed\` would mean at any point inside the one-hour time frame before bedtime, not focusing on the full period. This wording could be used if you wanted to know about something that happens at some random or unspecified time during that hour, like:
# \`Do you drink water within one hour before bed?\`
# This implies it could happen at the 30-minute mark, the 10-minute mark, or just before bed—anywhere inside that hour.

# However, your question is about someone's routine during the entire hour before bedtime. You're asking about everything they usually do in that specific period of time leading up to sleep."},
#   {"one hours → one hour": "One hour is singular"}]

# user's text: "I don't have an access to internet."
# correctedText: "I don't have access to the internet."
# corrections: [{"an access → access": "The word \`access\` is an uncountable noun in this context, meaning you cannot use "an" before it. "},
#   {"internet → the internet": "The internet is a specific, unique entity, so we use the definite article \`the\` before it. It refers to the global network of computers, making it a singular, identifiable thing."}]


# user's text: "I don't want to no five minute too long waiting."
# correctedText: "Can you clarify what you wanted to say? I don't understand what you mean by \`no five minutes\`. Does it mean that you don't want to wait more than 5 minutes or  you don't have 5 minutes to wait?"
# corrections: []

# ---

# Important!!
# - Do not make corrections with capitalization and commas unless it's absolutely necessary.
# - Even if you make corrections for capitalization and commas, don't put them in the corrections array.
