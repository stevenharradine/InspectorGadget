var CONFIG      = require("./config"),
    sh          = require('execSync'),
    cluster     = require('cluster')

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
    var url_folders = req.originalUrl.split ('/'),
        enviroment  = url_folders[1],
        project     = url_folders[2],
        role        = url_folders[3],
        ssh         = "ssh " + CONFIG.USERID + "@" + role + "." + project + "-" + enviroment + "." + CONFIG.DOMAIN;
        netstat     = sh.exec ("echo 'netstat -lnt' | " + ssh).stdout

    res.send(netstat)
  })

  webserver.listen(CONFIG.PORT)
  console.log('Inspector Gadget is running')
}
