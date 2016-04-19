# aghfabsowecwn - aka wtf

A Giant Hack For A Better Support Of Windows Elevated Commands With Node

__WIP__

## Introduction

This module gives you a better support to run windows commands with elevated privileges.

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

## What s this module enhances

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

```js
var spawn = require('@mh-cbon/aghfabsowecwn').spawn;

var opts = {
  bridgeTimeout: 5000,    // a timeout to detect that UAC was not validated, defaults to 3 minutes
  stdio: 'pipe',          // How do you want your pipes ?
  // sends environment variables, by default they are not propagated
  env:{
    'FORCE_COLOR':1,  // example, enable chalk coloring  
    'DEBUG': '*'      // example, enable visionmedia/debug output
  }
}

var child = spawn(process.argv[0], [__dirname + '/test/utils/stdin.js'], opts);

// var child = spawn('nop no such thing', [__dirname + '/test/utils/stdin.js'], opts);

// for debugging purpose, it s also compatible with *nux
// var child = spawn('sh', ['-c', 'ls -al && echo "stderr" >&2'], opts);

child.on('ready', function () {
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
})

child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)

child.stdin.write('some');
// child.stdin.end();
setTimeout(function () {
  child.kill();
}, 1000)
```

# Internals

This modules is a giant hack because it uses overkill techniques to achieve something which seems rather simple.

The short story is,
- the module spawns a server on a random address,
- connects a client on this server to expose a fake child_process API to your script
- invoke a windows command elevator to run your commands with elevated privileges,
- spawns your command with elevated privileges and connects it to the server

The server help to escape signals and data
from the elevated child to the userland via the server
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
- spawn child properties/methods call are available only once `ready` event is emitted.
- `ENV` variables __are not__ automatically sent to the elevated process, you got to do it

# Todos

- write the tests


# Read more
- http://digitaldrummerj.me/vagrant-fixing-opentable-basebox/
- https://github.com/coreybutler/node-windows
- https://github.com/ChristopherHaws/node-windows-elevate
- https://github.com/tehsenaus/windosu
