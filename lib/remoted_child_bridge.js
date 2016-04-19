
var pkg       = require('../package.json')
var debug     = require('debug')(pkg.name)
var streams   = require('stream')
var net       = require('net');
var EventEmitter = require('events');
var util = require('util');

function RemotedChildBridge (options) {

  debug('bridge.options %j', options)

  var that = this;

  var serverChannels = {
    stdout:     null,
    stderr:     null,
    stdin:      null,
    controlout: null,
    controlin:  null,
  }
  var clientChannels = {
    stdout:     null,
    stderr:     null,
    stdin:      null,
    controlout: null,
    controlin:  null,
  }

  var pipes = {
    stdout:       makeAPipe('bridge.pipes.stdout'),
    stderr:       makeAPipe('bridge.pipes.stderr'),
    stdin:        makeAPipe('bridge.pipes.stdin'),
    controlout:   makeAPipe('bridge.pipes.controlout'),
    controlin:    makeAPipe('bridge.pipes.controlin'),
  }

  var timeout = options.bridgeTimeout || 1000 * 60 * 3;
  var clientHasSubscribed = false;
  var clientHasNotSubscribed = setTimeout(function (){
    that.emit('client_not_subscribed')
  }, timeout);
  var serverHasSubscribed = false;
  var serverHasNotSubscribed = setTimeout(function (){
    that.emit('remote_not_subscribed')
  }, timeout);


  var server = net.createServer()
  .on('error', (err) => {
    debug('bridge.server.err %s', err);
    throw err;
  })
  .on('connection', (socket) => {
    debug('bridge.server got socket');
    socket.on('error', function (err) {
      debug('bridge.socket.err %s', err);
    })
    socket.on('data', function (data) {
      debug('bridge.socket.data %s', data.toString());
    })
    socket.once('data', function (hello) {
      debug('bridge.socket hello %s', hello);
      try {
        var oHello = JSON.parse(hello.toString())
        /* {
          from: 'server|client',
          channel: 'controlout|controlin|stdout|stdin|stderr',
        } */
        if (oHello.from==='client' && oHello.channel in clientChannels) {
          clientChannels[oHello.channel] = socket;
          if (oHello.channel==='stdin') {
            socket.write('ok');
            writeSocketToPipe('stdin', socket, pipes.stdin);
          } else if (oHello.channel==='controlin'){
            socket.write('ok');
            writeSocketToPipe('controlin', socket, pipes.controlin);
          } else {
            writePipeToSocket(oHello.channel, pipes[oHello.channel], socket)
          }
          socket.resume();
          clientHasSubscribed = true;
          clearTimeout(clientHasNotSubscribed);

        } else if (oHello.from==='remote' && oHello.channel in serverChannels){
          serverChannels[oHello.channel] = socket;
          if (oHello.channel==='stdin') {
            writePipeToSocket('stdin', pipes.stdin, socket)
            pipes[oHello.channel].resume();
          } else if (oHello.channel==='controlin') {
            writePipeToSocket('controlin', pipes.controlin, socket)
            pipes[oHello.channel].resume();
          } else {
            if (oHello.channel==='controlout') socket.write('ok');
            writeSocketToPipe(oHello.channel, socket, pipes[oHello.channel])
            pipes[oHello.channel].resume();
          }
          socket.resume();
          serverHasSubscribed = true;
          clearTimeout(serverHasNotSubscribed);

        } else {
          debug('bridge.socket hello invalid %s', hello)
          socket.end();
        }
      }catch(ex){
        debug('bridge.socket hello parse error %s', hello)
      }
    })
  });

  server.listen({host: '127.0.0.1', port: 0}, function () {
    var address = {
      port:   server.address().port,
      host:   server.address().address,
      family: server.address().family.replace(/ipv/i, ''),
    }
    debug('listen %j', address)
    that.emit('ready', address)
  });

  that.close = function () {
    debug('bridge.close');
    server.close(function () {
      debug('bridge.server.close');
      // pipes.stdout && pipes.stdout.end();
      // pipes.stderr && pipes.stderr.end();
      // pipes.stdin && pipes.stdin.end();
    })
  }
}

function makeAPipe(name) {
  var pipe = new streams.Transform({
    transform: function(chunk, encoding, next) {
      this.push(chunk)
      next();
    },
    flush: function(done) {
      done();
    }
  })
  pipe.on('data', function (d) {
    debug('%s.data %j', name, d.toString())
  })
  pipe.on('error', function (err) {
    debug('%s.error %j', name, err)
  })
  pipe.pause();
  return pipe;
}
function writePipeToSocket (name, pipe, socket) {
  pipe.on('data', function (d){
    debug('bridge.pipe.%s data %s', name, d.toString())
    socket.write(d.toString())
  })
  socket.on('data', function (d) {
    debug('bridge.socket.%s data %s', name, d.toString())
  })
  var pipeEnded = false;
  var socketEnded = false;
  socket.on('close', function (err) {
    debug('bridge.socket.%s close', name)
    socketEnded = true;
    err && pipe.emit(new Error('transmission error'));
    if(!pipeEnded) pipe.end();
  })
  pipe.on('end', function () {
    debug('bridge.pipe.%s close', name)
    pipeEnded = true;
    if(!socketEnded) socket.end();
  })
}
function writeSocketToPipe(name, socket, pipe) {
  socket.on('data', function (d) {
    debug('bridge.socket.%s data %s', name, d.toString())
    pipe.write(d.toString())
  })
  var pipeEnded = false;
  var socketEnded = false;
  socket.on('close', function (err) {
    debug('bridge.socket.%s close', name)
    err && pipe.emit(new Error('transmission error'));
    if(!pipeEnded) pipe.end();
  })
  pipe.on('end', function () {
    debug('bridge.pipe.%s close', name)
    pipeEnded = true;
    if(!socketEnded) socket.end();
  })
}

util.inherits(RemotedChildBridge, EventEmitter);

module.exports = RemotedChildBridge;
