from pydantic import BaseModel, Field
from typing import List, Any
from datetime import datetime
import pytz
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema: Any) -> Any:
        field_schema.update(type="string")
        return field_schema

class CorrectionItem(BaseModel):
    correction: str
    explanation: str

class Correction(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    type: str = "correction"
    userId: str
    input: str
    correctedText: str = Field(default="")
    corrections: List[CorrectionItem] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=lambda: datetime.now(pytz.timezone('US/Eastern')), frozen=True)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class Vocabulary(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    type: str = "vocabulary"
    userId: str
    input: str
    definition: str = Field(default="")
    examples: List[str] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=lambda: datetime.now(pytz.timezone('US/Eastern')), frozen=True)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class Breakdown(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    type: str = "breakdown"
    userId: str
    input: str
    paraphrase: str = Field(default="")
    breakdown: str = Field(default="")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(pytz.timezone('US/Eastern')), frozen=True)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
