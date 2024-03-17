import {TokenClassificationOutput, TokenClassificationPipeline} from "@xenova/transformers";

export interface InferenceRequest {
  inputStr: string
}

export interface InferenceResponse {
  status: "success" | "error",
  tokens?: TokenClassificationOutput
}