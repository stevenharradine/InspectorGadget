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
        netstat     = sh.exec ("echo 'netstat -lnt' | " + ssh + " | grep LISTEN").stdout,
        netstat_lines = netstat.split("\n")

    if (enviroment != "favicon.ico") {
      for (nl in netstat_lines) {
        if (nl >= 1) {
          netstat_line_parts = netstat_lines[nl].replace(/\s+/g, " ").split (" ")

          if (netstat_line_parts[0] == "tcp") {
            var local_address      = netstat_line_parts[3].split(":"),
                local_address_ip   = local_address[0],
                local_address_port = local_address[1]

            console.log (local_address_ip + " " + local_address_port)
          }
        }
      }

      res.send()
    }
  })

  webserver.listen(CONFIG.PORT, 'localhost')
  console.log('Inspector Gadget is running')
}
