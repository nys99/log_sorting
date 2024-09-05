"use strict";

// Print all entries, across all of the sources, in chronological order.

const { Heap } = require("heap-js");

function syncSortedMerge(logSources, printer) {
  // initiate min heap with custom comporator
  const minHeap = new Heap(
    (a, b) => a.log.date.getTime() - b.log.date.getTime()
  );

  // init the min heap with first log from each source
  logSources.forEach((source, _index) => {
    const log = source.pop();
    if (log) {
      console.log("Adding to heap:", log.date);
      minHeap.push({ log, source });
    }
  });

  // process the heap
  while (!minHeap.isEmpty()) {
    const { log, source } = minHeap.pop();
    printer.print(log);

    const nextLog = source.pop();
    if (nextLog) {
      console.log("Adding to heap:", nextLog.date);
      minHeap.push({ log: nextLog, source });
    }
  }

  printer.done();
  console.log("Synchronous log sorting complete.");
}

module.exports = syncSortedMerge;
