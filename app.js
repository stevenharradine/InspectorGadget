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
    var url_folders   = req.originalUrl.split ('/'),
        enviroment    = url_folders[1],
        project       = url_folders[2],
        role          = url_folders[3],
        ssh           = "ssh -o StrictHostKeyChecking=no " + CONFIG.USERID + "@" + role + "." + project + "-" + enviroment + "." + CONFIG.DOMAIN;
        netstat       = sh.exec ("echo 'netstat -lnt' | " + ssh + " | grep LISTEN").stdout,
        netstat_lines = netstat.split("\n"),
        open_ports    = []

    if (enviroment != "favicon.ico") {
      for (nl in netstat_lines) {
        if (nl >= 1) {
          netstat_line_parts = netstat_lines[nl].replace(/\s+/g, " ").split (" ")

          if (netstat_line_parts[0] == "tcp") {
            var local_address      = netstat_line_parts[3].split(":"),
                local_address_ip   = local_address[0],
                local_address_port = local_address[1]

            open_ports.push ({
              "listen": local_address_ip,
              "port": local_address_port
            })
          }
        }
      }

      var all_expected_ports_found   = true,
          expected_ports             = [],
          expected_inbound_ports     = [{
            "listen": "0.0.0.0",
            "port": "22"
          },{
            "listen": "0.0.0.0",
            "port": "443"
          },{
            "listen": "0.0.0.0",
            "port": "80"
          }],
          expected_application_ports = [{
            "listen": "0.0.0.0",
            "port": "22"
          },{
            "listen": "0.0.0.0",
            "port": "80"
          }]


      if (role == "inbound") {
        expected_ports = expected_application_ports
      } else if (role == "application") {
        expected_ports = expected_application_ports
      }

      for (index_ep in expected_ports) {
        var this_port_found = false

        for (index_op in open_ports) {
          if (compareExpectedPorts (expected_ports[index_ep], open_ports[index_op])) {
            this_port_found = true
          }
        }

        if (!this_port_found) {
          all_expected_ports_found = false
          console.log (expected_ports[index_ep])
        }
      }

      res.send(JSON.stringify ("[{'system_state':'" + (all_expected_ports_found ? "pass" : "fail") + "'}]"))
    }
  })

  webserver.listen(CONFIG.PORT, 'localhost')
  console.log('Inspector Gadget is running')
}

function compareExpectedPorts (obj1, obj2) {
  if (obj1.listen == obj2.listen && obj1.port == obj2.port)
    return true
  else
    return false
}