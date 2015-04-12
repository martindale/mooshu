var util = require('util');
var telnet = require('telnet');

function Server() {
  this._players = [];
}

util.inherits( Server , require('events').EventEmitter );

var RESET                 = '\u001B[c';
var CLEAR_SCREEN          = '\u001B[2J';
var ERASE_LINE            = '\u001B[2K';
var QUERY_CURSOR_POSITION = '\u001B[6n';

Server.prototype.start = function( done ) {
  var self = this;

  self._server = telnet.createServer(function(client) {
    client.do.transmit_binary();
    client.do.window_size();
    
    self._players.push( client );
    
    client.clear = function() {
      client.write( CLEAR_SCREEN );
    }
    
    client.drawPrompt = function() {
      client.inputBuffer = '';
      client.write( ERASE_LINE );
      client.write('\nHealth: 100/100\n');
      client.write('> ');
    }
    
    client.cursorPosition = function() {
      client.write( QUERY_CURSOR_POSITION );
    }
    
    client.initiateLogin = function() {
      client.write('\nGreetings, loremaster.\n');
      client.write('What is your name?');
      client.write('\n> ');
      
      client.on('input', function(input) {
        console.log('WE ARE COOKING WITH FIRE', input);
      });
    }
    
    client.isPlaying = false;
    
    client.on('data', function(b) {
      console.log('data received:', b );
      
      var hex = b.toString('hex');
      console.log('hex', hex );
      if (hex === '7f') {
        // backspace
        if (client.inputBuffer.length === 0) return;
        client.write('\u001B[3D'); // move back 3 characters
        client.write('\u001B[J'); // erase rest of line
        
        client.inputBuffer = client.inputBuffer.substring(0, -1);
        
      } else if (hex === '0d') {
        // enter
        if (client.inputBuffer.length === 0) {
          client.write('\u001B[2D'); // move back 2 characters
          client.write('\u001B[J') // erase rest of line
          return;
        }
        
        client.write('\u001B[' + client.height + ';3H'); // jump to last line, 3rd column
        client.write('\u001B[J');
        
        client.emit('input', client.inputBuffer);
        
        console.log('enter pressed, input:', client.inputBuffer );
        console.log('input length:', client.inputBuffer.length );
        
      } else {
        client.inputBuffer += b.toString('ascii');
        console.log('INPUT:', client.inputBuffer);
      }
      //client.write(b);
    });
    
    client.on('window size', function (e) {
      if (e.command === 'sb') {
        console.log('telnet window resized to %d x %d', e.width, e.height);
        client.width = e.width;
        client.height = e.height;
        
        if (client.isPlaying) {
          client.clear();
          client.drawPrompt();
        }
      }
    });
    
    client.clear();
    client.initiateLogin();
    
  });
  
  self._server.on('listening', function() {
    self.emit('ready');
  });
  
  self._server.listen(23);
}

module.exports = Server;
