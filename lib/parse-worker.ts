/// <reference lib="webworker" />

import { loadFiles, type FileInput, type LoadResult } from "./load";

export type ParseWorkerRequest = {
  type: "parse";
  files: FileInput[];
};

export type ParseWorkerResponse = LoadResult;

self.addEventListener("message", (event: MessageEvent<ParseWorkerRequest>) => {
  const msg = event.data;
  if (msg?.type !== "parse") return;
  const result = loadFiles(msg.files);
  (self as unknown as Worker).postMessage(result satisfies ParseWorkerResponse);
});

export {};
