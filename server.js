var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
const PORT = process.env.PORT || 5000;

var app = http.createServer(function (req, res) {
	file.serve(req, res);
}).listen(PORT);

var Receiver_Socket_ID; 				// Сокет оператора, принимающего звонок
var Request_ID = 0;						// Порядковый номер запроса на соединение от пользователя на сайте
var	Current_Request_Socket_ID;			// Порядковый номер, выбранный для текущего соединения
var Awaiting_Request_ID = [];			// Массив ожидающих соединений
var messageOffer;						// Переменная для сохранения оффера в памяти
var Receiver_busy = false				// Состояние "занятости" оператора

var io = require('socket.io').listen(app);
console.log('begin');
console.log('listening on port: ' + PORT );

io.sockets.on('connection', function (socket){
	console.log('an user connected: ' + socket.id);
	socket.emit('success');
	
	socket.on('disconnect', function () {
		console.log('an user disconnected: ' + socket.id);
/*		
		if(socket.id == Current_Request_Socket_ID){
			io.to(Receiver_Socket_ID).emit('message', 'user_leave_browser'); 
			newSession();
			}
*/	
	
		pos = Awaiting_Request_ID.indexOf(socket.id);
		console.log('pos=' + pos);
		if (pos !== -1){
			Awaiting_Request_ID.splice(pos,2);
			console.log('Awaiting_Request_ID at disconnected' );
			console.log(Awaiting_Request_ID);
			NewSession();
			}
		
		if (io.sockets.adapter.rooms['room1']){
		   console.log('Num in room: ' + io.sockets.adapter.rooms['room1'].length);
			} else {console.log('Awaiting list is null');}
			});
	
	socket.on('message', function (message){
	//console.log('Message:');
	//console.log(message);
	//socket.broadcast.emit('message', message); // закрываем сквозной обмен
	
	if (message == 'receiver'){
		Receiver_Socket_ID = socket.id;
		console.log('Receiver_Socket_ID ' + Receiver_Socket_ID);
		NewSession();
		}

	if (message == 'sender'){
		console.log('Sender Socket ID ' + socket.id);
		socket.emit('message', {type:'Awaiting_Request_ID', number: Awaiting_Request_ID.length/2}); 
		}

	if (message.type == 'newcall'){
		console.log('Sender do new call');
		Request_ID = Request_ID + 1;
		console.log('Awaiting_Request_ID');
		console.log(Awaiting_Request_ID);
		Awaiting_Request_ID.push(message.Socket_ID,Request_ID);
		console.log(Awaiting_Request_ID);
		socket.emit('Request_ID', Request_ID);  // можно сделать сразу на стороне сендера при отправке запроса
		console.log('Receiver_busy :' + Receiver_busy);
		Await_Num_Change();
			
		socket.join('room1');
	
		if (io.sockets.adapter.rooms['room1']){
		   console.log('Num in room: ' + io.sockets.adapter.rooms['room1'].length);
			}
		}	

	if (message.type == 'offer'){
		if (!messageOffer) {messageOffer = message; }
		Receiver_busy = true;
		console.log('Offer, Receiver_busy = true');
		console.log(Awaiting_Request_ID);
		Current_Request_Socket_ID = Awaiting_Request_ID[0];
		console.log('Current_Request_Socket_ID '+ Current_Request_Socket_ID);
		console.log(Awaiting_Request_ID);

		socket.broadcast.emit('message', {type: 'Current_Request_Socket_ID', value: Current_Request_Socket_ID}); 
		// добавить, что если не ответят через заданное время, то отсылать следующему
		}

	if (message.type == 'Current_Request_Socket_ID_existing'){
		if (message.value == 'yes'){
			console.log ('Current_Request_Socket_ID_existing');
			console.log('Awaiting_Request_ID before');
			console.log(Awaiting_Request_ID);
			Awaiting_Request_ID.splice(0,2);
			console.log('Awaiting_Request_ID after');
			console.log(Awaiting_Request_ID);
			io.to(Current_Request_Socket_ID).emit('message',messageOffer); 
			console.log ('MessageOffer is sended');
			messageOffer = null;
			Await_Num_Change();
			}
		}


	if (message.type == 'answer'){
		io.to(Receiver_Socket_ID).emit('message', message); 
		}

	if (message.type == "Receiver_candidate"){
		io.to(Current_Request_Socket_ID).emit('message', message); 
		}

	if (message.type == "Sender_candidate"){
		io.to(Receiver_Socket_ID).emit('message', message); 
		}

	if (message.type == "connection_off"){
		console.log(message);
		NewSession();
		}


	if (message.type == "HangUpCall_clicked"){
		if (message.value == 'Sender_clicked_HangUpCall'){
			console.log('Sender is disconnected by self');
			io.to(Receiver_Socket_ID).emit('message', message); 
			}
		if (message.value == 'Receiver_clicked_HangUpCall'){
			console.log('Receiver is disconnected by self');
			io.to(Current_Request_Socket_ID).emit('message', message); 
			}
		console.log('Awaiting_Request_ID');
		console.log(Awaiting_Request_ID);
		NewSession();
		}


		
	});

});

function NewSession(){
	console.log('newSession');
	Receiver_busy = false;  
	io.sockets.emit('message', {type:'NewSession', number: Awaiting_Request_ID.length/2}); 
	}

function Await_Num_Change(){
	console.log('Await_Num_Change');  
	io.sockets.emit('message', {type:'Await_Num_Change', number: Awaiting_Request_ID.length/2, Receiver_busy:Receiver_busy}); 
	}

