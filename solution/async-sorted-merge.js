"use strict";

// Print all entries, across all of the *async* sources, in chronological order.

const { Heap } = require("heap-js");

async function asyncSortedMerge(logSources, printer) {
  // initiate min heap with custom comporator
  const minHeap = new Heap(
    (a, b) => a.log.date.getTime() - b.log.date.getTime()
  );

  const BATCH_SIZE = 700;
  const bufferMap = new Map();

  // init the buffers with a batch of logs from each source
  await Promise.all(
    logSources.map(async (source) => {
      const logs = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        const log = await source.popAsync();
        if (log) {
          logs.push(log);
        } else {
          break;
        }
      }
      bufferMap.set(source, logs);
    })
  );

  // init the min heap with first log from each buffer
  bufferMap.forEach((logs, source) => {
    if (logs.length > 0) {
      minHeap.push({ log: logs.shift(), source });
    }
  });

  while (!minHeap.isEmpty()) {
    const { log, source } = minHeap.pop();
    printer.print(log);

    // fetch the buffer for the source
    const buffer = bufferMap.get(source);

    // check if buffer is empty
    if (buffer.length > 0) {
      minHeap.push({ log: buffer.shift(), source });
    } else {
      // create and await promises to fetch logs
      const promises = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        promises.push(source.popAsync());
      }
      const logs = await Promise.all(promises);

      // filter out results where all logs were drained
      const newLogs = logs.filter((log) => !!log);

      // update buffer with logs and push first log into the heap
      if (newLogs.length > 0) {
        minHeap.push({ log: newLogs.shift(), source });
        bufferMap.set(source, newLogs);
      }
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
