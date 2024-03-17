import {pipeline, TaskType, TokenClassificationPipeline, env} from '@xenova/transformers';
import {InferenceRequest, InferenceResponse} from "./interfaces";

// disable fetching models from frontend server. React Dev server just returns an html file for any requests
env.allowLocalModels = false;


class ClassifierWorker {
  static task = "token-classification" as TaskType;
  static model = "xenova/bert-base-NER-uncased";
  static instance?: TokenClassificationPipeline = undefined;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === undefined) {
      console.log("initializing pipeline!")
      this.instance = await pipeline(this.task,  this.model,
        { progress_callback }) as TokenClassificationPipeline;
    }
    return this.instance;
  }
}

// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", async (event) =>{
  const data = event.data as InferenceRequest

  //initialize model if needed
  let classifier = await ClassifierWorker.getInstance(
  // @ts-ignore
    // eslint-disable-next-line no-restricted-globals
    progressUpdate => self.postMessage(progressUpdate))

  // inference step
  let output = await classifier(data.inputStr, {ignore_labels: []})
  // eslint-disable-next-line no-restricted-globals
  self.postMessage({status:"success", tokens: output} as InferenceResponse)
})

