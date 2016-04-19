
var pkg               = require('../package.json')
var debug             = require('debug')(pkg.name)
var url               = require('url');
var spawn             = require('child_process').spawn;
var RemotedChildProxy = require('../lib/remoted_child_proxy.js')

debug('argv %j', process.argv);

var argv = [].concat(process.argv);
debug('elevatedRunner argv %j', argv);

argv.shift(); // remove node bin path
argv.shift(); // remove this script bin path

var address = argv.shift();
var cwd = argv.shift();
var env = argv.shift();
var bin = argv.shift();
var args = [].concat(argv);

debug('elevatedRunner env %j', env);
debug('elevatedRunner address %s', address);

address = url.parse(address)
env = JSON.parse(env);

debug('elevatedRunner parsed address %j', address);
debug('elevatedRunner parsed env %j', env);
debug('elevatedRunner bin %s', bin);
debug('elevatedRunner cwd %j', cwd);
debug('elevatedRunner args %j', args);


var remotedChild = new RemotedChildProxy({
  port: address.port,
  host: address.hostname,
  family: 6
});

remotedChild.on('ready', function () {
  remotedChild.connectWith(spawn(bin, args, {stdo: 'pipe', cwd: cwd, env: env}));
})
