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

input: "buoy"
output: "a floating object used to mark the position of a hazard in the water"

input: "blow up at somebody"
output: "to become angry with someone"

input: "What none of the volunteers knew until they arrived for the study was the method we would be using, one of the most powerful techniques scientists have **at our disposal** for stressing people out in the lab"
ouput: "**available for us to use** or **within our control or possession**". It indicates that the scientists have access to this powerful technique and can use it whenever they need for their experiments.

input: {input}

---

Don't generate "output: " or "here is the definition: ". Only return the definition.
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
            """You are a experienced ESL tutor. Your student asked you about the meaning of the following word or phrase or bolded part of a sentence.
            question: {input}
             
            You answered back to the student with the following explanation: {definition}
            
            Now you have to give an example sentence for the word or phrase or bolded part of a sentence. Here are the example sentences that you have already given: {examples} 

            Make sure your new example sentence is not overlapping with the example sentences that you have already given.
            
            Make sure the example sentence is related to the word or phrase or bolded part of a sentence.

            Don't generate "output: " or "here is the example sentence: ". Only return the example sentence.
            """
        )
        | chat_model
        | StrOutputParser()
    ).invoke(
        {
            "input": state.input,
            "definition": state.definition,
            "examples": "\n".join(state.examples)
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
