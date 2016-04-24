
var pkg                 = require('./package.json')
var debug               = require('debug')(pkg.name)
var getPort             = require('get-port');
var invokeElevatedCmd   = require('./lib/invoke_elevated_cmd.js')
var Rcp                 = require('@mh-cbon/remote-child_process');
var FakeChild           = Rcp.FakeChild;
var RcpClient           = Rcp.RcpClient;

var executeRemoteChildProcess = function (runOpts, options) {
  if(!options) options = {};
  if(!options.cwd) options.cwd = process.cwd();
  var child = new FakeChild(options.stdio);
  var client = new RcpClient();

  getPort().then(port => {
    runOpts.address = {
      hostname: '127.0.0.1',
      port: port
    };

    var maxTimeoutLen = options.bridgeTimeout || 1000 * 60 * 3;

    invokeElevatedCmd(runOpts.address, maxTimeoutLen);

    var mustFinish = false;
    var maxTimeout = setTimeout(function () {
      mustFinish = true;
    }, maxTimeoutLen);

    var openAndConnectChild = function () {
      client.open(runOpts.address, function (err) {
        if (err) {
          if (!mustFinish && err.code && err.code==='ECONNREFUSED') {
            return setTimeout(openAndConnectChild, 100);
          }
          clearTimeout(maxTimeout);
          child.emit('error', err);
          return child.emit('close')
        }
        clearTimeout(maxTimeout);
        delete options.bridgeTimeout;
        client.runRemote(child, runOpts, options)
      })
    }
    openAndConnectChild();
  });

  return child;
}
var spawn = function (bin, args, options) {
  var runOpts = {
    mode: 'spawn',
    bin:  bin,
    args: args
  }
  return executeRemoteChildProcess(runOpts, options);
}

var exec = function (cmd, options, done) {
  var runOpts = {
    mode: 'exec',
    cmd:  cmd
  }
  return executeRemoteChildProcess(runOpts, options);
}

module.exports = {
  spawn:  spawn,
  exec:   exec
};
