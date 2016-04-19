var chalk = require('chalk');
process.stdin.on('data', function (d){
  process.stdout.write(
    "colored " + chalk.blue(d.toString())
  )
  // process.stdin.end();
});
process.stdin.resume();
