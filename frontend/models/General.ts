import mongoose from "mongoose";

import { IExtraQuestion } from "./ExtraQuestions";
import { EntryType } from "./EntryType";

export interface IGeneral {
    id: string;
    type: EntryType;
    userId: string;
    input: string;
    answer: string;
    extraQuestions: IExtraQuestion[];
    createdAt: Date;
}

const GeneralSchema = new mongoose.Schema<IGeneral>({
    type: {
        type: String,
        enum: [EntryType.GENERAL],
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    input: {
        type: String,
        required: true,
    },
    answer: {
        type: String,
        required: true,
    },
    extraQuestions: {
        type: [
            {
                question: String,
                answer: String,
            },
        ],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const GeneralModel = mongoose.model<IGeneral>("General", GeneralSchema);
