import { IGeneral } from "./General";
import { ICorrection } from "./Correction";
import { IVocabulary } from "./Vocabulary";
import { IBreakdown } from "./Breakdown";

export type Entry = IGeneral | ICorrection | IVocabulary | IBreakdown;