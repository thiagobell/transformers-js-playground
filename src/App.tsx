import React from 'react';
import {InferenceResponse, InferenceRequest} from "./interfaces";
import { Title1, Text, Button, Field, Textarea, makeStyles, mergeClasses, shorthands } from "@fluentui/react-components";

import './App.css';
import {TokenClassificationSingle} from "@xenova/transformers/types/pipelines";


const tokenStyles = makeStyles({
  entitySpan: {
    ...shorthands.borderRadius("1em"),
    ...shorthands.padding("0.3em"),
  },
  labelSpan : {
    ...shorthands.marginInline("3px"),
    backgroundColor: "white"
  },
  misc: {
    backgroundColor: "rgba(210,39,39,0.76)",
    ...shorthands.borderColor("rgba(210,39,39,1)")
  },
  per: {
    backgroundColor: "rgba(39,99,210,0.76)",
    ...shorthands.borderColor("rgba(39,99,210,1)")
  },
  org: {
    backgroundColor: "rgba(39,210,79,0.76)",
    ...shorthands.borderColor("rgba(39,210,79,1)")
  },
  loc: {
    backgroundColor: "rgba(222,215,91,0.76)",
    ...shorthands.borderColor("rgba(222,215,91,1)")
  },

})

const Token: React.FC<TokenClassificationSingle> = (token) => {

  /**
   * Renders a span of tokens all from the same entity and label
   */

  const styles = tokenStyles()
  // label viz config
  const label2ClassName = {
      "B-LOC": styles.loc,
      "B-MISC": styles.misc,
      "B-ORG": styles.org,
      "B-PER": styles.per,
      "I-LOC": styles.loc,
      "I-MISC": styles.misc,
      "I-ORG": styles.org,
      "I-PER": styles.per,
  }
  // @ts-ignore
  const labelStyle = label2ClassName[token.entity]
  if (token.entity === "O"){
    return <span>{token.word}</span>
  } else {
    return <span className={mergeClasses(styles.entitySpan, labelStyle)}>
      {token.word}
      <span className={mergeClasses(styles.labelSpan)}>{token.entity}</span>
    </span>
  }
}


const taggedResponseViewStyles = makeStyles({
  tokenContainer: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    ...shorthands.gap("10px"),
    ...shorthands.border("3px", "solid", "black"),
    ...shorthands.borderRadius("12px"),
    ...shorthands.padding("10px"),
  },
})

const TaggedResponseView: React.FC<InferenceResponse> = (response) => {
  const styles = taggedResponseViewStyles()
  return <div className={styles.tokenContainer}>
    {response?.tokens?.map(tk => <Token {...tk} />)}
  </div>
}

const AppStyles = makeStyles({
  body: {
    maxWidth: "1000px",
    display: "flex",
    flexDirection: "column",
    ...shorthands.margin("30px", "auto" ),
    ...shorthands.gap("30px"),
  }
})


function App() {
  const [modelIsReady, setModelIsReady] = React.useState(false);
  const [modelBusy, setModelBusy] = React.useState(false)

  // have to use `any` type bc hugging face is a sad joke
  const [progressItems, setProgressItems] = React.useState<any>([])
  const [modelResponse, setModelResponse] = React.useState<InferenceResponse | undefined>(undefined)
  const [textInput, setTextInput] = React.useState("")

  const worker = React.useRef<Worker>(null);

  React.useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      // @ts-ignore
      worker.current = new Worker(new URL('./classifier.ts', import.meta.url), {
        type: 'module'
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: any) => {
      console.log(`message received ${e.data.status}`)
      console.log(e.data)
      switch (e.data.status) {
        case 'initiate':
          // Model file start load: add a new progress item to the list.
          setModelIsReady(false);
          // @ts-ignore
          setProgressItems(prev => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems(
              // @ts-ignore
            prev => prev.map(item => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress }
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems(
            // @ts-ignore
            prev => prev.filter(item => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setModelIsReady(true);
          break;

        case 'success':
          // Generation complete: re-enable the "Translate" button
          setModelResponse(e.data as InferenceResponse)
          setModelBusy(false);
          break;
      }
    };
    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current?.removeEventListener('message', onMessageReceived);

  }, [])

  // run inference
  const requestInference = (text: string) => {
    if (modelBusy) {return}
    setModelBusy(true)
    worker.current?.postMessage({inputStr: text} as InferenceRequest)
  }
  const styles = AppStyles()

  return (
    <div className={styles.body}>
      <Title1>NER with BERT in the Browser</Title1>
      <Text>Using transformers.js and model <a
        href="https://huggingface.co/Xenova/bert-base-NER-uncased">Xenova/bert-base-NER-uncased</a></Text>
      <Text>Entities Available:
        <ul>
          <li>LOC</li>
          <li>ORG</li>
          <li>MISC</li>
          <li>PER</li>
        </ul>
      </Text>

      <div>
        <Field label="Enter some text you wish to classify">
          <Textarea size={"large"} resize="vertical" disabled={modelBusy} onChange={(_, data) => setTextInput(data.value)}/>
        </Field>
        <Button disabled={modelBusy} onClick={() => requestInference(textInput)}>Find Named Entities</Button>
      </div>
      {modelResponse && (
        <TaggedResponseView {...modelResponse} />
      )}
    </div>
  );
}

export default App;
