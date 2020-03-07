var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
const PORT = process.env.PORT || 5000;

var app = http.createServer(function (req, res) {
	file.serve(req, res);
}).listen(PORT);

var Request_ID = 0;
	Current_Request_ID = 0;
var Awaiting_Request_ID = new Array (); 


var io = require('socket.io').listen(app);
console.log('begin');
console.log('listening on port: ' + PORT );


io.sockets.on('connection', function (socket){
	console.log('an user connected');
	socket.emit('success');

	socket.on('disconnect', function (socket) {
		console.log('an user disconnected');
	});

	socket.on('message', function (message) {
		console.log(message);
		socket.broadcast.emit('message', message); // временно комментить для обработки
		
		
		if (message == 'newcall'){
			//socket.broadcast.emit('message', message); // раскомментить временно для сокращения обработки 
			Request_ID = Request_ID + 1;
			console.log('Request_ID '+ Request_ID);
			socket.emit('Request_ID', Request_ID); 
			Awaiting_Request_ID.push(Request_ID);
			console.log('Awaiting_Request_ID: ' + Awaiting_Request_ID);
			}	

		if (message.type == 'offer'){
			Current_Request_ID = Awaiting_Request_ID.shift();
			console.log('Current_Request_ID '+ Current_Request_ID);
			socket.broadcast.emit('message', {type: 'Current_Request_ID', value: Current_Request_ID});
			}

		if (message.type == 'Current_Request_ID_existing'){
			if (message.value == 'yes'){console.log ('OK!');}
			
			}
			
			
	});

});


function searchIndex(massive, figure){
for (index = 0; index < massive.length; index++){
	if (massive[index] == figure){
		return index;
		break;
		}
	}
	return (-1);	
}


