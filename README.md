# aghfabsowecwn - aka wtf

A Giant Hack For A Better Support Of Windows Elevated Commands With Node

## Introduction

This module gives you a more complete support to run windows commands with elevated privileges.

## What s the problem

Running windows elevated command with node is not simple,

- loss of `FD[0,1,2]`
- loss of `return codes`
- loss of control over the elevated process

Solutions exists on `npm`, but they all have drawbacks such as,

- provide only a mimic of `child_process.exec`,
- no support of `child_process.spawn`
- poorly reports about `UAC` validation
- poorly reports about exit codes
- no support to call methods on elevated process such as `kill`
- no support to listen emitted evens by the elevated process

Find out more at
- https://github.com/coreybutler/node-windows/issues/46
- https://github.com/ChristopherHaws/node-windows-elevate
- https://github.com/tehsenaus/windosu/issues/2

It s also more than possible that alternatives solution using binaries exists,

I m not aware of them / I wish not to use a black box.

## What s this module enhancements

This module provides

- support for `child_process.spawn`
- support for commons fds : `stdin`, `stdout`, `stderr`
- support for methods call : `kill`
- support to detect unvalidated `UAC`
- support for `return codes`
- support of elevated process `events`
- does not need any sort of binary
- automatic fix of `cwd` for the elevated process

# Install

```sh
npm i @mh-cbon/aghfabsowecwn --save
```

# Usage

### spawn

```js
var spawn = require('@mh-cbon/aghfabsowecwn').spawn;

var opts = {
  bridgeTimeout: 5000,    // a timeout to detect that UAC was not validated, defaults to 3 minutes
  stdio: 'pipe',          // How do you want your pipes ?
  env:{
    'FORCE_COLOR':1,  // example, enable chalk coloring  
    'DEBUG': '*'      // example, enable visionmedia/debug output
  }
}

var child = spawn(process.argv[0], [__dirname + '/test/utils/stdin.js'], opts);

child.on('started', function () {
  console.log('===> child pid=%s', child.pid)
})

child.on('close', function (code) {
  console.log('===> child close code=%s', code)
})

child.on('exit', function (code) {
  console.log('===> child exit code=%s', code)
})

// if UAC is not validated, or refused, an error is emitted
child.on('error', function (error) {
  console.log('===> child error=%s', error)
  console.log('===> child error=%j', error)
  if (error.code==='ECONNREFUSED') console.log('UAC was probably not validated.')
})

child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)

child.stdin.write('some');
// child.stdin.end();
child.once('started', function () {
  setTimeout(function () {
    child.kill();
  }, 1000)
})
```

### exec

```js
var exec = require('@mh-cbon/aghfabsowecwn').exec;

var opts = {
  bridgeTimeout: 5000,    // a timeout to detect that UAC was not validated, defaults to 3 minutes
  stdio: 'pipe',          // How do you want your pipes ?
  env:{
    'FORCE_COLOR':1,  // example, enable chalk coloring  
    'DEBUG': '*'      // example, enable visionmedia/debug output
  }
}

var child = exec('ls -al', opts, function (err, stdout, stderr) {
  console.log('===> child error=%s', error)
  console.log('===> child error=%j', error)
  if (err.code==='ECONNREFUSED') console.log('UAC was probably not validated.')
  console.log("stdout=%s", stdout);
  console.error("stderr=%s", stderr);
});

child.on('started', function () {
  console.log('===> child pid=%s', child.pid)
})

child.on('close', function (code) {
  console.log('===> child close code=%s', code)
})

child.on('exit', function (code) {
  console.log('===> child exit code=%s', code)
})

// if UAC is not validated, or refused, an error is emitted
child.on('error', function (error) {
  console.log('===> child error=%s', error)
  console.log('===> child error=%j', error)
  if (err.code==='ECONNREFUSED') console.log('UAC was probably not validated.')
})

```

# Internals

This modules is a giant hack because it uses overkill techniques to achieve something which seems rather simple.

The short story is,
- the module spawns a server on a random address with an elevated process,
- a client is spawned and wait for the server to be alive,
- the client throws an `ECONNREFUSED` error when `UAC` was not accepted
- the client create an instance of `FakeChild`,
- the client connects multiple sockets with the server to emulate `pipes, events, methods, FD`
- the client sends the command to run to the elevated server process
- the server runs the command and exports any signal to the client
- the client forwards the signals to the fake child instance

The server help to escape signals and data
from the elevated child to the userland
(socket to pipe / pipe to socket).

```
FD[0,1,2]
stderr        [user] <=== [server] <=== [elevated]
stdout        [user] <=== [server] <=== [elevated]
stdin         [user] ===> [server] ===> [elevated]

Method calls
controlin     [user] ===> [server] ===> [elevated]

emitted events && set properties
controlout    [user] <=== [server] <=== [elevated]
```

#### Other notes

- remember that the remote child is not running with a `TTY`,
so the behavior may be a bit different (no color support for example)
- spawn child properties/methods call are available only once `started` event is emitted.

# Todos

- write the tests


# Read more
- http://digitaldrummerj.me/vagrant-fixing-opentable-basebox/
- https://github.com/coreybutler/node-windows
- https://github.com/ChristopherHaws/node-windows-elevate
- https://github.com/tehsenaus/windosu
