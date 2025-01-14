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


async def generate_paraphrase(state: OverallState):
    print("\n>>> NODE: generate_paraphrase")

    response = await (
        ChatPromptTemplate.from_template(
            """
Paraphrase the following text for ESL student to understand it better.
- Use simpler vocabulary.
- Change idiomatic expressions in a clear way.
- Use more simple sentence structure.
- The student's English level: {englishLevel}

---

text: {input}

---

Don't include "here is the paraphrased text: " or "Sure, let's paraphrase the text". Just return the paraphrased text.
"""
        )
        | chat_model
    ).ainvoke(
        {
            "input": state.input,
            "englishLevel": state.englishLevel,
        }
    )

    return {
        "paraphrase": response,
    }


async def generate_breakdown(state: OverallState):
    print("\n>>> NODE: generate_breakdown")

    response = await (
        ChatPromptTemplate.from_template(
            """You are a experienced ESL tutor helping your student understand English sentences.

Here are some examples:

<input>
The design team staged an intervention with you.
</input>
<breakdown>
If the design team "staged an intervention" with you, it generally means that the team collectively approached you to address a concern, issue, or situation they felt needed immediate attention or change.
</breakdown>
-> tip: It focuses on the main phrase "staged an intervention" which is obviously the part that the user asks for. It didn't use bullet points since it is not a list.


<input>
Teens admit to brazen Bank street shooting.
</input>
<breakdown>
- admit to: Say openly that they are responsible for something (confess).
- brazen: Very bold or shameless, without showing fear or guilt. Here it is used as an adjective describing the shooting.
- Bank Street shooting: An event where someone used a gun on Bank Street (a specific place).
</breakdown> 


<input>
Not only did the sudden shift in policy undermine long-standing practices, but it also exposed the fragile balance between innovation and tradition
</input>
<breakdown>
- Not only did: "Not only did __" is an inversion of "__ not only...". This inversion is used for emphasis in the sentence.
- the sudden shift in policy: The subject of the first part of the sentence. It refers to a quick or unexpected change in policy.
- undermine long-standing practices: The verb phrase in the first part. "Undermine" means to weaken or erode, and "long-standing practices" refers to established, traditional ways of doing things.
- but it also exposed: This introduces the second part of the sentence, part of the "Not only... but also" construction. It means that the policy shift also revealed something else.
</breakdown>
-> tip: It didn't explain vocabularies that are straightforward such as innovation and tradition. Inversion is always tricky for non-native speakers, so it focues on that.


<input>
Had the committee, in its haste to implement sweeping reforms, fully anticipated the subtle, often imperceptible consequences that would inevitably ripple through the intricate network of policies, perhaps it would have approached the situation with more caution.
</input>
<breakdown>
- Had the committee: This is an inversion used in a conditional structure. It means the same as "If the committee had..."
in its haste to implement sweeping reforms: A parenthetical phrase explaining why the committee acted quickly. "In its haste" means "because it was in a rush," and "to implement sweeping reforms" shows the reason for the rush.
- fully anticipated...: This is the verb for the conditional phrase "Had the committee".
- the subtle, often imperceptible consequences: There are two adjective connected with "," in this sentence. Both describe the consequences.
- that would inevitably ripple through the intricate network of policies: A relative clause explaining what the consequences would do—spread gradually and affect the complex system of policies.
- perhaps it would have approached the situation with more caution: The result of the hypothetical situation. It means that if the committee had known the consequences, it would have acted more carefully.
</breakdown>
-> tip: This sentence is a bit complex, thus the breakdown focuses on the structure of the entire sentence.


<input>
I feel comfortable just walking up to someone you find interesting and start a conversation.
</input>
<breakdown>
- walking up to someone: The phrasal verb "walk up to" implies approaching or getting closer to a person in a direct manner. It gives the sense of moving toward someone with a purpose. The "up" makes the action feel more focused or intentional, as if you’re actively heading toward them to start an interaction.
- you find interesting: This is a relative clause modifying "someone." Here, "find" is used as "to perceive" or "to think of." It is often used when describing how we form opinions or impressions of people, things, or situations.
</breakdown>
-> tip: It didn't explain too obvious things, only focusing on the phrases that non-native speakers might not understand. 


<input>
Did I say anything completely out in left field? 
</input>
<breakdown>
The phrase "out in left field" originates from baseball, where the left field position is distant from the main action, symbolizing being removed or unconventional. It is now used to describe someone or something as eccentric, unusual, or out of touch.
</breakdown>
-> tip: the breakdown includes the origin of the idiomatic phrase which will help the student understand the meaning of the phrase better. It didn't use bullet points since it is not a list.

---

Now it's your turn. Break down and explain the following input:
{input}

---

Important!!
- Don't return "breakdown: ", "here is the breakdown: " or "### Breakdown". Only return the content of the breakdown.
- Don't generate "-> tip: " part. It's just for you to understand examples better.
- Use markdown format.
- Don't explain too obvious things as the examples above demonstrate.
- Try to explain idiomic phrases with its origin or the metaphor it represents.
- The student's English level is {englishLevel}. Take this into account when generating the breakdown.  
"""
        )
        | chat_model
    ).ainvoke(
        {
            "input": state.input,
            "englishLevel": state.englishLevel,
        }
    )

    return {
        "breakdown_stream_msg": response,  # the response is a async generator
    }


g = StateGraph(OverallState, input=InputState, output=OutputState)
g.add_edge(START, n(generate_paraphrase))

g.add_node(n(generate_paraphrase), generate_paraphrase)
g.add_edge(n(generate_paraphrase), n(generate_breakdown))

g.add_node(n(generate_breakdown), generate_breakdown)
g.add_edge(n(generate_breakdown), END)
