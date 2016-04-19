
var pkg                 = require('./package.json')
var debug               = require('debug')(pkg.name)
var RemotedChildBridge  = require('./lib/remoted_child_bridge.js')
var RemoteChildProxy    = require('./lib/remote_child_proxy.js')
var invokeElevatedCmd   = require('./lib/invoke_elevated_cmd.js')

var spawn = function (bin, args, options) {

  var bridge = new RemotedChildBridge({bridgeTimeout: options.bridgeTimeout})
  var client = new RemoteChildProxy({stdio: options.stdio})

  bridge.on('ready', function (address) {
    client.open(address)
    invokeElevatedCmd(address, bin, args, options)
  })
  bridge.on('client_not_subscribed', function () {
    client.emit('error', new Error('Client did not subscribed'))
    client.emit('exit', 1)
    client.emit('close', 1)
  })
  bridge.on('remote_not_subscribed', function () {
    client.emit('error', new Error('Remote did not subscribed'))
    client.emit('exit', 1)
    client.emit('close', 1)
  })
  client.on('close', function () { //child_process close event.
    client.close();
    bridge.close();
  })

  return client;
}

var exec = function (cmd, options, done) {
}

module.exports = {
  spawn: spawn,
  exec: function () {
    throw 'not implemented'
  }
};
