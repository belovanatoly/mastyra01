var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
const PORT = process.env.PORT || 5000;

var app = http.createServer(function (req, res) {
	file.serve(req, res);
}).listen(PORT);
										// Везде массив, потому что для каждой комнаты свой индекс
var Receiver_Socket_ID = []; 			// Сокет оператора, принимающего звонок. Пока один оператор для комнаты
var Request_ID = [];					// Порядковый номер запроса на соединение от пользователя на сайте
var Awaiting_Request_List = [];			// Массив ожидающих соединений	
var	Current_Request_Socket_ID = [];		// Порядковый номер, выбранный для текущего соединения
var Receiver_busy = [];		 			// Состояние "занятости" оператора

var io = require('socket.io').listen(app);
console.log('begin');
console.log('listening on port: ' + PORT + '\n');

//////////////////////////////

io.sockets.on('connection', function (socket){
	
	// Вывдим на консоль, что новый пользователь подсоединился
	console.log('an user connected: ' + socket.id);
	
	// Отправляем подсоединвшемуся пользователся сообщение об успешном подключении
	socket.emit('success');
	
	socket.on('disconnect', function () { 
		
		// Выводим на консоль, что пользователь отсоединился
		console.log('an user disconnected: ' + socket.id + ' room ' + socket.currentRoom);
		
		// Находим позицию сокета в листе ожидания, если сокет в комнате
		if (socket.currentRoom) {
			//console.log(Awaiting_Request_List[socket.currentRoom]);
			pos = Awaiting_Request_List[socket.currentRoom].indexOf(socket.id);
			//console.log('pos=' + pos);

			// Если сокет есть в листе ожидания 
			if (pos !== -1){ 
				
				//Удаляем из списка ожидания
				Awaiting_Request_List[socket.currentRoom].splice(pos,2);
				
				//console.log('Awaiting_Request_ID at disconnected' );
				//console.log(Awaiting_Request_List[socket.currentRoom]);
				
				// Считаем количество в листе ожидания и отпрааляем оператору
				Await_Num_Change(Awaiting_Request_List[socket.currentRoom].length/2, socket.currentRoom, Receiver_busy[socket.currentRoom]); 
				} 
					
				// Если сокет не в листе ожидания (не соединялся или уже поговорил)
				else {
					//console.log('User was absent in Awaiting List');
					}
					
/*
			// Считаем кол-во пользователей в комнате
			if (io.sockets.adapter.rooms[socket.currentRoom]){
			   console.log('Num in room: ' + io.sockets.adapter.rooms[socket.currentRoom].length);
				} else {console.log('Awaiting list is null');}
*/				
			} 
		});
	
	socket.on('message', function (message){
		
	// Если получаем сообщение от оператора при подключении.   
	if (message.type == 'receiver'){
		
		// Заносим значение сокета в массив операторов. Номер комнаты берем из сообщения.
		Receiver_Socket_ID[message.Room_ID] = socket.id;
		
		//console.log('Receiver Socket ID: ' + Receiver_Socket_ID[message.Room_ID]);
		//console.log('Room ID: ' + message.Room_ID);
		
		// Если лист ожидания для этой комнаты еще не создан, то создаем
		if (!Awaiting_Request_List[message.Room_ID]) {Awaiting_Request_List[message.Room_ID] = [];}
		//console.log('Awaiting List Length: ' + Awaiting_Request_List[message.Room_ID].length/2);
		
		// Инициируем новую сесию оператора
		NewSession(Awaiting_Request_List[message.Room_ID].length/2, message.Room_ID );
		}
		
		
	// Если получаем сообщение от пользователя при пдключении
	if (message == 'sender'){
		//console.log('Sender Socket ID: ' + socket.id);
		//socket.emit('message', {type:'Awaiting_Request_ID', number: Awaiting_Request_ID.length/2}); 
		}
		
	// Если пользователь инициирует новый звонок
	if (message.type == 'newcall'){
		//console.log('Sender do new call');
		//console.log('Sender Socket ID: ' + socket.id);
		//console.log('Room ID: ' + message.Room_ID);
		
		// Добавляем пользователя в комнату 
		socket.join(message.Room_ID);
		//console.log ('Room ' + message.Room_ID + ' created or joined');
		
		// Присвиваем номер комнаты, берем номер из сообщения
		socket.currentRoom = message.Room_ID;
		
		// Определяем номер запроса в комнате
		if (!Request_ID[message.Room_ID]){Request_ID[message.Room_ID] = 0;}
		Request_ID[message.Room_ID] = Request_ID[message.Room_ID]+ 1;
		
		// Передаем инициатору номер его запроса
		socket.emit('Request_ID', Request_ID[message.Room_ID]);  
			
		//console.log('Request_ID');
		//console.log(Request_ID);
		//console.log('\n');
		
		// Заполняем лист ожидания
		if (!Awaiting_Request_List[message.Room_ID]){Awaiting_Request_List[message.Room_ID] = [];}
		Awaiting_Request_List[message.Room_ID].push(socket.id,Request_ID[message.Room_ID]);
		
		//console.log('Awaiting_Request_List[message.Room_ID]');
		//console.log(Awaiting_Request_List[message.Room_ID]);
		//console.log(Awaiting_Request_List);
		//console.log('Awaiting List Length: ' + Awaiting_Request_List[message.Room_ID].length/2);
		//console.log('\n');
		
		//console.log('Receiver_busy: ' + Receiver_busy[message.Room_ID]);
		
		// Отправляем оператору новое количество пользователей в листе ожидания
		Await_Num_Change(Awaiting_Request_List[message.Room_ID].length/2, message.Room_ID, Receiver_busy[message.Room_ID]);
			
/*		
		// Считаем кол-во пользователей в комнате
		if (io.sockets.adapter.rooms[message.Room_ID]){
		   console.log('Num in room: ' + io.sockets.adapter.rooms[message.Room_ID].length + '\n');
			}
*/
		}	

	// Оператор инициирует соединение    
	if (message.type == 'init_Offer'){
		//console.log('init_Offer Room_ID :' + message.Room_ID);
		//if (!messageOffer[message.Room_ID]) {messageOffer[message.Room_ID] = message.desc; }
		
		// Устанавливаем статус занятости оператора на "занят"
		Receiver_busy [message.Room_ID] = true;
		
		//console.log('Offer, Receiver_busy = true');
		//console.log('Awaiting_Request_List[message.Room_ID]');
		//console.log(Awaiting_Request_List[message.Room_ID]);
		
		// Присваиваем порядковый номер для соединения
		Current_Request_Socket_ID[message.Room_ID] = Awaiting_Request_List[message.Room_ID][0];
		
		//console.log('Current_Request_Socket_ID '+ Current_Request_Socket_ID[message.Room_ID]);
		//console.log('\n');
		
		// Отправляем порядковый номер для соединения в комнатку, чтобы проверить, что такой номер еще в комнате
		socket.to(message.Room_ID).emit('message', {type: 'Current_Request_Socket_ID', value: Current_Request_Socket_ID[message.Room_ID]}); 
		// добавить, что если не ответят через заданное время, то отсылать следующему
		}


	// Если пришел ответ, что такой номер существует
	if (message.type == 'Current_Request_Socket_ID_existing'){
		if (message.value == 'yes'){
			console.log ('Current_Request_Socket_ID_existing');
	
			// убираем первую строчку из листа ожидания (? проверить, что это именно он)
			Awaiting_Request_List[message.Room_ID].splice(0,2);
			
			// Сообщаем оператору новое значение в листе ожидания
			Await_Num_Change(Awaiting_Request_List[message.Room_ID].length/2, message.Room_ID, true);
	
			
			// сообщаем оператору, чтобы делал оффер
			io.to(Receiver_Socket_ID[message.Room_ID]).emit('message','init_Offer_yes'); 
			}
		}

	if (message.type == 'offer'){
			io.to(Current_Request_Socket_ID[message.Room_ID]).emit('message',message.desc); 
			console.log ('MessageOffer is sended');
		}


	// Отправляем answer от пользователя конкретному оператору по номеру комнаты
	if (message.type == 'answer'){ 
		io.to(Receiver_Socket_ID[socket.currentRoom]).emit('message', message); 
		}
		
	// Отправляем кандидата от оператора текущему пользователю
	if (message.type == "Receiver_candidate"){
		io.to(Current_Request_Socket_ID[message.Room_ID]).emit('message', message); 
		}
		
	// Отправлем кандидата от пользователя конкретному оператору 
	if (message.type == "Sender_candidate"){ // переделать socket.currentRoom, не то
		io.to(Receiver_Socket_ID[socket.currentRoom]).emit('message', message); 
		}

	// При рассоединении
	if (message.type == "connection_off"){
		//console.log(message);
		
		// инициируем новую сессию оператору (  нужно если только не оператор вырубился )
		NewSession(Awaiting_Request_List[message.Room_ID].length/2, message.Room_ID); 
		}


	if (message.type == "HangUpCall_clicked"){
		if (message.value == 'Sender_clicked_HangUpCall'){
			console.log('Sender is disconnected by self');
			io.to(Receiver_Socket_ID[socket.currentRoom]).emit('message', message); 
			NewSession(Awaiting_Request_List[socket.currentRoom].length/2, socket.currentRoom);
			}
		if (message.value == 'Receiver_clicked_HangUpCall'){
			console.log('Receiver is disconnected by self');
			io.to(Current_Request_Socket_ID[message.Room_ID]).emit('message', message);
			NewSession(Awaiting_Request_List[message.Room_ID].length/2, message.Room_ID);
			}
		console.log('Awaiting_Request_List');
		console.log(Awaiting_Request_List);
		}


		
	});

});

////////////////////////////
// FUNCTIONS

// Инициирование новой сессии оператора
function NewSession(Awaiting_List_Length, Room_ID){
	//console.log('\n' + 'newSession' + ' Room ID: ' + Room_ID + '\n');
	
	// Устанавливаем статус занятости оператора в значение "свободен"
	Receiver_busy[Room_ID] = false;  
	
	// Отправляем оператору значение листа ожидания
	io.to(Receiver_Socket_ID[Room_ID]).emit('message', {type:'NewSession', number: Awaiting_List_Length}); 
	}

// Передача оператору количества в листе ожидания без инициирования новой сессии.
function Await_Num_Change(Awaiting_List_Length, Room_ID, Receiver_busy){
	//console.log('Await_Num_Change' + ' Room ID: ' + Room_ID + ' Receiver_busy: ' + Receiver_busy + '\n');  
	
	// Отправляем оператору количество в листе ожидания и статус занятости по данным сервера (статус менялся при прохождении оффера)
	io.to(Receiver_Socket_ID[Room_ID]).emit('message', {type:'Await_Num_Change', number: Awaiting_List_Length, Receiver_busy: Receiver_busy}); 
	}

