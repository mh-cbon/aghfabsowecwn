var aghfabsowecwn = require('./index.js');
var spawn = aghfabsowecwn.spawn;

var opts = {
  stdio: 'pipe',
  env:{'FORCE_COLOR':1, 'DEBUG': '*'}
}
// var child = spawn('sh', ['-c', 'ls -al && echo "stderr" >&2'], opts);

var child = spawn(process.argv[0], [__dirname + '/test/utils/stdin.js'], opts);

// var child = spawn('nop no such thing', [__dirname + '/test/utils/stdin.js'], opts);

child.on('close', function (code) {
  console.log(arguments);
  console.log('===> child close code=%s', code)
})

child.on('exit', function (code) {
  console.log(arguments);
  console.log('===> child exit code=%s', code)
})

child.on('error', function (error) {
  console.log('===> child error=%s', error)
  console.log('===> child error=%j', error)
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
