
var pkg       = require('../package.json')
var debug     = require('debug')(pkg.name)
var url       = require('url');
var RcpServer = require('@mh-cbon/remote-child_process').RcpServer;

debug('argv %j', process.argv);

var argv = [].concat(process.argv);
debug('elevatedRunner argv %j', argv);

argv.shift(); // remove node bin path
argv.shift(); // remove this script bin path

var maxTimeoutLen = argv.shift();
var address = argv.shift();

debug('elevatedRunner address %s', address);
address = JSON.parse(address)
debug('elevatedRunner parsed address %j', address);

var address = {
  host: address.hostname,
  port: address.port
};

var server = new RcpServer()
var maxTimeout = setTimeout(function () {
  server.close(true);
}, maxTimeoutLen);
server.once('client_connected', function () {
  clearTimeout(maxTimeout);
})
server.open(address, function () {
  debug('elevatedRunner server listening')
  server.once('child_close', function () {
    server.close();
  })
})
