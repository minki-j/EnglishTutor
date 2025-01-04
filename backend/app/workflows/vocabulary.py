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


def get_definition(state: OverallState, writer: StreamWriter):
    print("\n>>> NODE: get_definition")

    definition = (
        ChatPromptTemplate.from_template(
            """
You are an expert in English vocabulary. You are given a word or phrase or a sentence with a word with bold text. Explain the meaning of them in a simple way.

---

input: buoy
definition: a floating object used to mark the position of a hazard in the water

input: What none of the volunteers knew until they arrived for the study was the method we would be using, one of the most powerful techniques scientists have **<u>at our disposal</u>** for stressing people out in the lab
definition: In this context, "at our disposal" means "available for us to use." It suggests that the scientists have access to this powerful technique and can use it as a tool or resource for their experiments.

input: blow up at somebody
definition: to become angry with someone

input: He switches into using distanced language to **convey** to himself that he can in fact write his show
definition: In this context, "convey" means to express or communicate an idea, feeling, or message. The writer is describing how the person uses "distanced language" (perhaps more formal or detached wording) as a way to communicate or reinforce to himself the belief or realization that he is capable of writing his show.

input: indubitable
output: something that is unquestionable or impossible to doubt.

input: {input}

---

Important!!
- Don't add "definition: " or "here is the definition: ". Only return the definition.
- Use simple language so that non-native speakers can understand the definition.
"""
        )
        | chat_model
        | StrOutputParser()
    ).invoke(
        {
            "input": state.input,
        }
    )

    writer({"definition": definition})

    return {
        "definition": definition,
    }


def generate_example(state: OverallState, writer: StreamWriter):
    print("\n>>> NODE: generate_example")

    response = (
        ChatPromptTemplate.from_template(
            """You are a experienced ESL tutor. Your student asked the meaning of the following word or phrase. (If the question is a full sentence, then the bolded part of the sentence is the word or phrase that the student asked the meaning of.)
Student Question: {input}

You answered back to the student with the following explanation: 
{definition}

Now you have to give an example sentence.

Here are the example sentences that you have already given: 
{examples} 

Create a new example sentence that doesn't overlap with the example sentences that you have already given.

Make sure the example sentence is related to the word or phrase or bolded part of a sentence.

Also try to generate an example setence that is realted to the student. Here is the student's information: 
{aboutMe}

Don't generate "output: " or "here is the example sentence: ". Only return the example sentence.
            """
        )
        | chat_model
        | StrOutputParser()
    ).invoke(
        {
            "input": state.input,
            "definition": state.definition,
            "examples": "\n".join(state.examples),
            "aboutMe": state.aboutMe,
        }
    )

    writer({"example": response})

    return Command(
        goto=n(generate_example) if len(state.examples) <= 1 else "__end__",  # stop after 2 examples
        update={"examples": response},
    )


g = StateGraph(OverallState, input=InputState, output=OutputState)
g.add_edge(START, n(get_definition))

g.add_node(n(get_definition), get_definition)
g.add_edge(n(get_definition), n(generate_example))

g.add_node(n(generate_example), generate_example)
