var CONFIG  = require("./config"),
    cluster = require('cluster')

if (cluster.isMaster) {
  var cpuCount        = require('os').cpus().length,
      numberOfThreads = cpuCount * CONFIG.CPU_MULTIPLIER

  for (var i = 0; i < numberOfThreads; i++) {
    cluster.fork()
  }

  cluster.on('exit', function (worker) {
    console.log('Worker ' + worker.id + ' died :(')
    cluster.fork()
  })

// Code to run if we're in a worker process
} else {
  var express   = require('express'),
      webserver = express()

  webserver.use (function (req, res) {
      res.send("Hello World!")
  })

  webserver.listen(CONFIG.PORT)
  console.log('Webserver is running')
}
