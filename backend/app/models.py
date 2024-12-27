from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from bson import ObjectId


class CorrectionItem(BaseModel):
    correction: str = Field(
        description="A short title for the correction. Examples: 'one hours → one hour', 'restructure the sentence', 'an access → access', 'drop `within`', 'is a good idea → was a good idea'"
    )
    explanation: str = Field(
        description="A detailed explanation for the correction."
    )


class Correction(BaseModel):
    id: ObjectId = Field(default_factory=ObjectId)
    userId: str
    originalText: str
    correctedText: str
    corrections: List[CorrectionItem]
    createdAt: datetime = Field(default_factory=datetime.now)

    class Config:
        arbitrary_types_allowed = True


class WritingRequest(BaseModel):
    text: str

class WritingCorrection(BaseModel):
    input: str
    corrected: str
    explanation: str

class VocabularyExplanation(BaseModel):
    word: str
    definition: str
    examples: list[str]
    synonyms: list[str]

class SentenceBreakdown(BaseModel):
    sentence: str
    subject: str
    predicate: str
    grammar_points: list[str]
    structure_explanation: str 
