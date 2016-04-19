
var pkg       = require('../package.json')
var debug     = require('debug')(pkg.name)
var async     = require('async')
var streams   = require('stream')
var net       = require('net');
var EventEmitter = require('events');
var util = require('util');


function RemotedChildProxy(address){

  debug('child_remote.address %j', address)

  var that = this;
  var channels = {
    stdout:     null,
    stderr:     null,
    stdin:      null,
    controlout: null,
    controlin:  null,
  }

  async.parallel([
    function (next) {
      channels.stdout = makeASocket('child_remote.socket.stdout', address)
        .on('connect', function () {
          channels.stdout.write(JSON.stringify({from: 'remote', channel: 'stdout'}));
          next();
        })
    },
    function (next) {
      channels.stderr = makeASocket('child_remote.socket.stderr', address)
        .on('connect', function () {
          channels.stderr.write(JSON.stringify({from: 'remote', channel: 'stderr'}));
          next();
        })
    },
    function (next) {
      channels.controlout = makeASocket('child_remote.socket.controlout', address)
        .on('connect', function () {
          channels.controlout.write(JSON.stringify({from: 'remote', channel: 'controlout'}));
          channels.controlout.once('data', function (){
            next();
          })
        })
    },
    function (next) {
      channels.stdin = makeASocket('child_remote.socket.stdin', address)
        .on('connect', function () {
          channels.stdin.write(JSON.stringify({from: 'remote', channel: 'stdin'}));
          next();
        })
    },
    function (next) {
      channels.controlin = makeASocket('child_remote.socket.controlin', address)
        .on('connect', function () {
          channels.controlin.write(JSON.stringify({from: 'remote', channel: 'controlin'}));
          next();
        })
    },
  ], function () {
    that.emit('ready')
  })



  that.connectWith = function (child) {
    debug('child_remote.connectWith')
    writeSocketToPipe ('stdin', channels.stdin, child.stdin)
    writePipeToSocket ('stderr', child.stderr, channels.stderr)
    writePipeToSocket ('stdout', child.stdout, channels.stdout)

    channels.controlout.write(JSON.stringify({action: 'set', name: 'pid', value: child.pid}) + '\n')
    child.on('error', function () {
      channels.controlout.write(JSON.stringify({action: 'emit', name: 'error', args: [].slice.call(arguments)}) + '\n')
    })
    child.on('exit', function () {
      channels.controlout.write(JSON.stringify({action: 'emit', name: 'exit', args: [].slice.call(arguments)}) + '\n')
    })
    child.on('close', function () {
      channels.controlout.write(JSON.stringify({action: 'emit', name: 'close', args: [].slice.call(arguments)}) + '\n')
      that.close();
    })
    channels.controlin.on('data', function (d) {
      try{
        d = JSON.parse(d)
        if (d.action==='call') {
          if (child[d.name] && typeof(child[d.name])==='function') {
            debug('invoking %s %j', d.name, d.args)
            child[d.name].apply(child, d.args)
          }
        }
      }catch(ex){
        console.error(d)
      }
    })

  }

  that.close = function () {
    debug('child.remote close')
    process.stderr.removeAllListeners('data')
    process.stdout.removeAllListeners('data')
    channels.stdout.end()
    channels.stderr.end()
    channels.stdin.end()
    channels.controlout.end()
    channels.controlin.end()
  }
}

function makeASocket(name, address){
  return net.connect(address, () => {
    debug('%s connected', name)
  }).on('error', (err) => {
    debug('%s err %s', name, err)
  }).on('end', () => {
    debug('%s end', name)
  }).on('data', function (d) {
    debug('%s data %s', name, d.toString())
  });
}
function writePipeToSocket (name, pipe, socket) {
  pipe.on('data', socket.write.bind(socket))
  var pipeEnded = false;
  var socketEnded = false;
  pipe.on('data', function (d) {
    debug('child_remote.pipe.%s data %s', name, d.toString())
  })
  socket.on('close', function (err) {
    debug('child_remote.socket.%s close', name)
    socketEnded = true;
    err && pipe.emit(new Error('transmission error'));
    if(!pipeEnded) pipe.end();
  })
  pipe.on('end', function () {
    debug('child_remote.pipe.%s close', name)
    pipeEnded = true;
    if(!socketEnded) socket.end();
  })
}
function writeSocketToPipe(name, socket, pipe) {
  socket.on('data', pipe.write.bind(pipe))
  var pipeEnded = false;
  var socketEnded = false;
  pipe.on('data', function (d) {
    debug('child_remote.pipe.%s data %s', name, d.toString())
  })
  socket.on('close', function (err) {
    debug('child_remote.socket.%s close', name)
    socketEnded = true;
    err && pipe.emit(new Error('transmission error'));
    if(!pipeEnded) pipe.end();
  })
  pipe.on('end', function () {
    debug('child_remote.pipe.%s close', name)
    pipeEnded = true;
    if(!socketEnded) socket.end();
  })
}

util.inherits(RemotedChildProxy, EventEmitter);

module.exports = RemotedChildProxy;
