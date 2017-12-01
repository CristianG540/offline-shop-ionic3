import PouchDB from "pouchdb";

self.onmessage = e => {
  //debugger;
  let d = e.data;
  let localDB = new PouchDB(d.local.name, d.local.options);
  let remoteDB = new PouchDB(d.remote.name, d.remote.options);

  localDB.replicate.from(remoteDB, { batch_size : 500 })
  .on('change', info => {
    self.postMessage({ event : "change", info : info })
  })
  .on("complete", info => {
    self.postMessage({ event : "complete", info : info })
  })
  .on("error", err => {
    self.postMessage({ event : "error", info : err })
  });

}
