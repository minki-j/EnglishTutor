from varname import nameof as n
from enum import Enum
from pydantic import BaseModel, Field

from langgraph.graph import START, END, StateGraph
from langgraph.types import StreamWriter, Command
from langchain_core.runnables import RunnablePassthrough, RunnableParallel


from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.state import OverallState, InputState, OutputState
from app.llm import chat_model

def check_if_input_is_sentence(state: OverallState, writer: StreamWriter):
    print("\n>>> NODE: check_if_input_is_sentence")

    class IsSentenceResponse(BaseModel):
        is_sentence: bool

    response = (
        ChatPromptTemplate.from_template(
            """Check if the following text is a sentence. Return "True" if it is a sentence. Otherwise, return "False".

---

Here are some examples:

input: The design team staged an **intervention** with you.
is_sentence: True

input: ingratiate oneself with someone
is_sentence: False

input: buoy
is_sentence: False

input: heavy-handed
is_sentence: False

input: This lasted until the mid-twentieth century, when scientists began to question the idea that placebos were merely a **foil** for research—in essence, nothing. 
is_sentence: True

---

input: {input}
"""
        )
        | chat_model.with_structured_output(IsSentenceResponse)
    ).invoke(
        {
            "input": state.vocabulary,
        }
    )

    if response.is_sentence:
        writer(
            {
                "example": state.vocabulary,
                "extracted_word": state.vocabulary.split("**")[1],
            }
        )
        return {"examples": [state.vocabulary]} #! This gets duplicated when rendevous node is reached
    else:
        return {}


def correct_input(state: OverallState, writer: StreamWriter):
    print("\n>>> NODE: correct_input")

    corrected_input = (
        ChatPromptTemplate.from_template(
            """Correct spelling, punctuation, capitalization, and grammar errors. 

Here are some examples:

input: debiliteting
output: debilitating

input: at disposal
output: at one's disposal

input: do we have that **in place**?
output: Do we have that **in place**?

input: the term of endearment wass spoken more **wistfully** than with the cozy affeaction it once hold
output: The term of endearment was spoken more **wistfully** than with the cozy affection it once holds.

input: convei
output: convey

input: it's about **the whole gamut of** things that are required to buiild a home
output: It's about **the whole gamut of** things that are required to build a home.

---

Now it's your turn!
            
input: {input}

---

Important Rules!!

- Don't add "output: " or "certainly, here is the corrected input: ". Only return the corrected input.
- When there is no correction required, then return the original input. Don't add any explanation or preambles such as "This sentence is grammatically correct:" or "(No correction needed)".
- Keep markdown bold styling(**bold text**).
- Only capitalize the first letter of the word if the input is a sentence. For words and phrases, keep it lowercase.
"""
        )
        | chat_model
        | StrOutputParser()
    ).invoke(
        {
            "input": state.input,
        }
    )

    writer({"corrected_input": corrected_input})

    if corrected_input == "":
        raise ValueError("Failed to correct input: received empty string from correction node")

    return {
        "vocabulary": corrected_input,
    }


def get_definition(state: OverallState, writer: StreamWriter):
    print("\n>>> NODE: get_definition")

    definition = (
        ChatPromptTemplate.from_template(
            """
You are an expert in English vocabulary. You are given a word or phrase or a sentence with a word with bold text. Explain the meaning of them in a simple way.

---

input: Buoy
definition: A floating object used to mark the position of a hazard in the water

input: What none of the volunteers knew until they arrived for the study was the method we would be using, one of the most powerful techniques scientists have **<u>at our disposal</u>** for stressing people out in the lab
definition: In this context, "at our disposal" means "available for us to use." It suggests that the scientists have access to this powerful technique and can use it as a tool or resource for their experiments.

input: Blow up at somebody
definition: to become angry with someone

input: He switches into using distanced language to **convey** to himself that he can in fact write his show
definition: In this context, "convey" means to express or communicate an idea, feeling, or message. The writer is describing how the person uses "distanced language" (perhaps more formal or detached wording) as a way to communicate or reinforce to himself the belief or realization that he is capable of writing his show.

input: Indubitable
definition: Something that is unquestionable or impossible to doubt.

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
            "input": state.vocabulary,
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
            "input": state.vocabulary,
            "definition": state.definition,
            "examples": "\n".join(state.examples),
            "aboutMe": state.aboutMe,
        }
    )

    writer({"example": response})

    return Command(
        goto=n(generate_example) if len(state.examples) <= 1 else "__end__",  # stop after 2 examples
        update={"examples": [response]},
    )


g = StateGraph(OverallState, input=InputState, output=OutputState)
g.add_edge(START, n(correct_input))

g.add_node(n(correct_input), correct_input)
g.add_edge(n(correct_input), n(get_definition))
g.add_edge(n(correct_input), n(check_if_input_is_sentence))

g.add_node(n(get_definition), get_definition)
g.add_edge(n(get_definition), "rendevous")

g.add_node(n(check_if_input_is_sentence), check_if_input_is_sentence)
g.add_edge(n(check_if_input_is_sentence), "rendevous")

g.add_node("rendevous", RunnablePassthrough())
g.add_edge("rendevous", n(generate_example))

g.add_node(n(generate_example), generate_example)
