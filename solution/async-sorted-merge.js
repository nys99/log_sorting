"use strict";

// Print all entries, across all of the *async* sources, in chronological order.

const { Heap } = require("heap-js");

async function asyncSortedMerge(logSources, printer) {
  // initiate min heap with custom comporator
  const minHeap = new Heap(
    (a, b) => a.log.date.getTime() - b.log.date.getTime()
  );

  // asynchronously init the min heap with first log from each source
  await Promise.all(
    logSources.map(async (source) => {
      const log = await source.popAsync();
      if (log) {
        console.log("Adding to heap:", log.date);
        minHeap.push({ log, source });
      }
    })
  );

  // process the heap
  while (!minHeap.isEmpty()) {
    const { log, source } = minHeap.pop();
    printer.print(log);

    const nextLog = await source.pop();
    if (nextLog) {
      console.log("Adding to heap:", nextLog.date);
      minHeap.push({ log: nextLog, source });
    }
  }

  printer.done();
  console.log("Asynchronous log sorting complete.");
}

module.exports = asyncSortedMerge;

/*
  The time complexity of each run is broken down into the initialization and the processing.
  The initialization takes s log (s) where s is the number of sources. Since each insert 
  operation takes log (s) and ther are s number of sources.

  The processing takes n log (s) where n is the number of logs. Since for each log we must 
  remove and insert into the heap which take log (s).

  If we consider the the scale of processing millions of sources and logs, the I/O operations
  of reading from the source could be a significant cost. To improve this we can batch the 
  operations where we are pulling from the source and store it in memory. As the in memory
  store for each source begins to decrease we could then lazy load more logs from the source.
*/
