from pydantic import BaseModel, Field
from typing import Annotated
from app.models import CorrectionItem

# ===========================================
#                REDUCER FUNCTIONS
# ===========================================
def append(original: list, new: CorrectionItem):
    original.append(new)
    return original


# ===========================================
#                    STATE
# ===========================================
class OutputState(BaseModel):
    correctedText: str = Field(default="")
    corrections: Annotated[list[CorrectionItem], append] = Field(default_factory=list)


class InputState(BaseModel):
    thread_id: str
    input: str


class OverallState(InputState, OutputState):
    pass
