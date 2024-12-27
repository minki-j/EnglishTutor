from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from bson import ObjectId


class CorrectionItem(BaseModel):
    correction: str
    explanation: str


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
    original: str
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
