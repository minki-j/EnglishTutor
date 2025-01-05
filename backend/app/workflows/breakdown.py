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


async def generate_breakdown(state: OverallState, writer: StreamWriter):
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

Meaning: The design team came together to talk to you about an important issue.
</breakdown>


<input>
Teens admit to brazen Bank street shooting.
</input>
<breakdown>
- Admit to: Say openly that they are responsible for something (confess).
- Brazen: Very bold or shameless, without showing fear or guilt. Here it is used as an adjective describing the shooting.
- Bank Street shooting: An event where someone used a gun on Bank Street (a specific place).

Meaning: A group of teenagers said they were responsible for a bold and shocking shooting that happened on Bank Street.
</breakdown>


<input>
Not only did the sudden shift in policy undermine long-standing practices, but it also exposed the fragile balance between innovation and tradition
</input>
<breakdown>
- Not only did: "Not only did __" is an inversion of "__ not only...". This inversion is used for emphasis in the sentence.
- the sudden shift in policy: The subject of the first part of the sentence. It refers to a quick or unexpected change in policy.
- undermine long-standing practices: The verb phrase in the first part. "Undermine" means to weaken or erode, and "long-standing practices" refers to established, traditional ways of doing things.
- but it also exposed: This introduces the second part of the sentence, part of the "Not only... but also" construction. It means that the policy shift also revealed something else.

Meaning: The sudden change in policy not only weakened established practices, but it also revealed how delicate the relationship between new ideas and old traditions is.
</breakdown>


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

Meaning: If the committee had fully understood the potential small and unnoticed consequences of their reforms, which would affect the entire policy system, they would have acted more cautiously.
</breakdown>


<input>
I feel comfortable just walking up to someone you find interesting and start a conversation.
</input>
<breakdown>
- walking up to someone: The phrasal verb "walk up to" implies approaching or getting closer to a person in a direct manner. It gives the sense of moving toward someone with a purpose. The "up" makes the action feel more focused or intentional, as if you’re actively heading toward them to start an interaction.
- you find interesting: This is a relative clause modifying "someone." Here, "find" is used as "to perceive" or "to think of." It is often used when describing how we form opinions or impressions of people, things, or situations.

Meaning: I feel comfortable approaching someone you think is interesting and starting a conversation.
</breakdown>


<input>
Did I say anything completely out in left field? 
</input>
<breakdown>
The phrase "out in left field" is an idiom that means something is unusual, unexpected, or far from the main idea. It's often used to describe ideas, comments, or actions that seem random, strange, or disconnected from the current topic.

Meaning: Did I say anything that is unusual or far from the main idea?
</breakdown>

---

Now it's your turn. Break down and explain the following input:
{input}

---

Important!!
- Don't return "breakdown: ", "here is the breakdown: " or "### Breakdown". Only return the content of the breakdown.
- Use markdown format.
"""
        )
        | chat_model
    ).ainvoke(
        {
            "input": state.input,
        }
    )

    # # Stream the output via StreamWriter
    # writer({"breakdown": response})

    return {
        "breakdown_stream_msg": response,
    }

g = StateGraph(OverallState, input=InputState, output=OutputState)
g.add_edge(START, n(generate_breakdown))

g.add_node(n(generate_breakdown), generate_breakdown)
g.add_edge(n(generate_breakdown), END)
