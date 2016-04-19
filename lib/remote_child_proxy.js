
var pkg       = require('../package.json')
var debug     = require('debug')(pkg.name)
var async     = require('async')
var streams   = require('stream')
var split     = require('split')
var through2  = require('through2')
var net       = require('net');
var EventEmitter = require('events');
var util = require('util');

function RemoteChildProxy(options){

  var that = this;

  debug('child_client.options %j', options)
  var stdio = options.stdio;

  var channels = {
    stdout:     null,
    stderr:     null,
    stdin:      null,
    controlout: null,
    controlin:  null,
  }

  if([null, false].indexOf(stdio)>-1 || (stdio && (stdio==='pipe' || stdio[1]==='pipe')))
    that.stdout = makeAPipe('child_client.pipe.stdout')
  if([null, false].indexOf(stdio)>-1 || (stdio && (stdio==='pipe' || stdio[2]==='pipe')))
    that.stderr = makeAPipe('child_client.pipe.stderr')
  if([null, false].indexOf(stdio)>-1 || (stdio && (stdio==='pipe' || stdio[0]==='pipe')))
    that.stdin = makeAPipe('child_client.pipe.stdin')
  that.controlin = makeAPipe('child_client.pipe.controlin')
  that.controlout = makeAPipe('child_client.pipe.controlout')

  that.stdout && that.stdout.pause()
  that.stderr && that.stderr.pause()
  that.stdin && that.stdin.pause()
  that.controlout && that.controlout.pause()
  that.controlin && that.controlin.pause()

  that.controlout
    .pipe(split())
    .pipe(through2(function (chunk, enc, cb) {
      if (chunk.length) { // empty value gives us an empty Buffer
        try{
          chunk = JSON.parse(chunk);
          if (chunk.action === 'emit') {
            chunk.args.unshift(chunk.name)
            that.emit.apply(that, chunk.args)
          } else if (chunk.action === 'set') {
            that[chunk.name] = chunk.value;

            // emit ready event when pid is received
            if (chunk.name==='pid') {
              that.emit('ready')
            }
          }
        }catch(ex) {
          console.log("unparsable data %s\n%s", ex, ex.stack);
        }
      }
      cb()
    }))


  this.pid = 'not implemented';
  this.kill = function () {
    that.controlin.write(JSON.stringify({
      action: 'call',
      name: 'kill',
      args: [].slice.call(arguments)
    }) + '\n')
  };


  that.open = function (bridgeAddress) {

    debug('bridgeAddress %j', bridgeAddress)

    async.parallel([
      function (next) {
        if(that.stdout) channels.stdout =
          writeSocketToPipe('child_client.socket.stdout', that.stdout, bridgeAddress)
          .on('connect', function () {
            channels.stdout.write(JSON.stringify({from: 'client', channel: 'stdout'}));
            next()
          })
      },
      function (next) {
        if (that.stderr) channels.stderr =
          writeSocketToPipe('child_client.socket.stderr', that.stderr, bridgeAddress)
          .on('connect', function () {
            channels.stderr.write(JSON.stringify({from: 'client', channel: 'stderr'}));
            next()
          })
      },
      function (next) {
        if(that.stdin) channels.stdin =
          writePipeToSocket('child_client.socket.stdin', that.stdin, bridgeAddress)
          .on('connect', function () {
            channels.stdin.write(JSON.stringify({from: 'client', channel: 'stdin'}));
            channels.stdin.once('data', function () {
              next()
            })
          })
      },
      function (next) {
        if(that.controlin) channels.controlin =
          writePipeToSocket('child_client.socket.controlin', that.controlin, bridgeAddress)
          .on('connect', function () {
            channels.controlin.write(JSON.stringify({from: 'client', channel: 'controlin'}));
            channels.controlin.once('data', function () {
              next()
            })
          })
      },
      function (next) {
        if(that.controlout) channels.controlout =
          writeSocketToPipe('child_client.socket.controlout', that.controlout, bridgeAddress)
          .on('connect', function () {
            channels.controlout.write(JSON.stringify({from: 'client', channel: 'controlout'}));
            next()
          })
      }
    ], function () {
      //- void
    })

    that.once('ready', function () {
      that.controlout && that.controlout.resume()
      that.controlin && that.controlin.resume()
      that.stdin && that.stdin.resume()
      that.stderr && that.stderr.resume()
      that.stdout && that.stdout.resume()
    })

  }

  that.close = function () {
    debug('RemoteChildClient.close');
    channels.stdout && channels.stdout.end();
    channels.stderr && channels.stderr.end();
    channels.stdin && channels.stdin.end();
    channels.controlout && channels.controlout.end();
    channels.controlin && channels.controlin.end();
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
  return pipe;
}
function writePipeToSocket (name, pipe, address) {

  var pipeEnded = false;
  var socketEnded = false;

  var socket = net.connect(address, () => {
    debug('%s connected', name)
    pipe.on('data', function(d){
      debug('%s.pipe.data %s', name, d)
      socket.write(d.toString())
    })
  }).on('error', (err) => {
    debug('%s err %s', name, err)
  });

  socket.on('close', function (err) {
    debug('%s.socket.close', name)
    socketEnded = true;
    err && pipe.emit(new Error('transmission error'));
    if(!pipeEnded) pipe.end();
  })
  pipe.on('end', function () {
    debug('%s.pipe.close', name)
    pipeEnded = true;
    if(!socketEnded) socket.end();
  })

  return socket;
}
function writeSocketToPipe(name, pipe, address) {
  var pipeEnded = false;
  var socketEnded = false;
  var socket = net.connect(address, () => {
    debug('%s connected', name)
  }).on('error', (err) => {
    debug('%s err %s', name, err)
  });
  socket.on('data', function (d){
    debug('%s.socket.data %s', name, d)
    pipe.write(d.toString())
  })
  pipe.resume()

  socket.on('close', function (err) {
    debug('%s.socket.close', name)
    err && pipe.emit(new Error('transmission error'));
    socketEnded = true;
    if(!pipeEnded) pipe.end();
  })
  pipe.on('end', function () {
    debug('%s.pipe.close', name)
    pipeEnded = true;
    if(!socketEnded) socket.end();
  })

  return socket;
}

util.inherits(RemoteChildProxy, EventEmitter);

module.exports = RemoteChildProxy;
