
var pkg       = require('../package.json')
var debug     = require('debug')(pkg.name)
var path      = require('path')
var spawn     = require('child_process').spawn;

var invokeElevatedCmd = function (address, bin, args, options, done) {

  debug('invokeElevatedCmd.address %j', address)

  args.unshift(bin)
  args.unshift(JSON.stringify(options.env || {}))
  args.unshift(options.cwd || process.cwd())
  if (address.family==="6")
    args.unshift("http://[" + address.host + "]" + ":" + address.port + "/?family=" + address.family)
  else
    args.unshift("http://" + address.host + ":" + address.port + "/?family=" + address.family)

  args.unshift(path.join(__dirname, '../utils/elevated_runner.js'))

  var bin = process.argv[0]
  if (process.platform.match(/win/)) {
  bin = process.env.comspec || 'cmd.exe'
    args.unshift(process.argv[0])
    args.unshift(path.join(__dirname, '../utils/elevate.cmd'))
    args.unshift('/c')
    args.unshift('/s')
  }

  debug('invokeElevatedCmd %s %s %j', bin, args.join(' '), options);

  var child = spawn(bin, args, options);
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
