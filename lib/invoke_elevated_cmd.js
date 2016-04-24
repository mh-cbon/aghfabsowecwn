
var pkg       = require('../package.json')
var debug     = require('debug')(pkg.name)
var path      = require('path')
var spawn     = require('child_process').spawn;

var invokeElevatedCmd = function (address, maxTimeoutLen, done) {

  debug('invokeElevatedCmd.address %j', address)

  var args = [];
  args.unshift(JSON.stringify(address))
  args.unshift(maxTimeoutLen);
  args.unshift(path.join(__dirname, '../lib/elevated_runner.js'))

  var bin = process.argv[0]
  if (process.platform.match(/win/)) {
    bin = process.env.comspec || 'cmd.exe'
    args.unshift(process.argv[0])
    args.unshift(path.join(__dirname, '../utils/elevate.cmd'))
    args.unshift('/c')
    args.unshift('/s')
  }

  debug('invokeElevatedCmd %s %s', bin, args.join(' '));

  var child = spawn(bin, args, {stdio: 'pipe'});
  child.on('close', function () {
    debug('invokeElevatedCmd child closed')
    done && done(); // note, under windows it is totally useless as elvated command quits immediately.
  })
  child.stdout.on('data', function (d) {
    debug('invokeElevatedCmd.child.stdout %s', d.toString())
  })
  child.stderr.on('data', function (d) {
    debug('invokeElevatedCmd.child.stderr %s', d.toString())
  })
  return child;
}

module.exports = invokeElevatedCmd;
