:: use call so if a program fails, the bat continues to run
:: dld node with wget
call C:\vagrant\utils\wget.exe https://nodejs.org/dist/v5.9.1/node-v5.9.1-x64.msi --no-check-certificate -O C:\node-v5.9.1-x64.msi
:: silent install node
call msiexec.exe /i C:\node-v5.9.1-x64.msi INSTALLDIR="C:\nodejsx64" /quiet
:: a small check
call C:\nodejsx64\node.exe -v
:: install mocha
call C:\nodejsx64\npm.cmd i mocha -g
