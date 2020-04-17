// JavaScript Document
console.log("begin");

var socket = io.connect();
var Room_ID;

var mediaConstraints = {
	audio: true, 
	video: false
	};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');


var localStream = null;
var pc = null;
//var Disconnected_method;

// var servers = null;


var servers = {"iceServers": 
	    [
            {"url": "stun:stun.l.google.com:19302"}
	    ]
        };

		
navigator.getUserMedia = (
	navigator.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia ||
	navigator.msGetUserMedia
);

var RTCPeerConnection = (
	RTCPeerConnection ||
	webkitRTCPeerConnection ||
	mozRTCPeerConnection ||
	msRTCPeerConnection
);

var RTCSessionDescription = (
	RTCSessionDescription ||
	webkitRTCSessionDescription ||
	mozRTCSessionDescription ||
	msRTCSessionDescription
);

var RTCIceCandidate = (
	RTCIceCandidate ||
	webkitRTCIceCandidate ||
	mozRTCIceCandidate ||
	msRTCIceCandidate
);

if (!!navigator.getUserMedia){document.getElementById('debug').innerHTML += 'browser supports the WebRTC <br>';}
  else document.getElementById('debug').innerHTML += 'browser does not support the WebRTC <br>';

//////////////////////////

// Если в строке браузера есть идентификатор линии, то заносим его в Room_ID
if (getParam('id')) {
	Room_ID = getParam('id');
	console.log ('Room_ID = ' + Room_ID);
	document.getElementById('Line').innerHTML = "Идентификатор линии: " + Room_ID;
	}
	
// Функция вытаскивает иденификатор линии из строки браузера
function getParam(param){
	return new URLSearchParams(window.location.search).get(param);
	}

// Запускается по кнопке Принять звонок. 
function getCall_click(){
	//console.log('getCall is clicked');
	//getCallClicked = true;
	//console.log(getCallClicked);
	
	// Убираем кнопку Принять звонок
	document.getElementById('btn_getCall').style.display='none';
	
	// Пишем сообщение в разделы logs и connection
	document.getElementById('logs').innerHTML = "Принять звонок нажата";
	document.getElementById('connection').innerHTML = "&nbsp";
	
	// Запрашиваем доступ к устройствам
	// После захвата переходим к функции getStream
	navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(getStream)
		.catch(Error);
}

function getStream(stream)
{
	document.getElementById('logs1').innerHTML='&nbsp';
	document.getElementById('connection').innerHTML='Соединение устанавливается ... ';
	document.getElementById('btn_getCall').style.display='none';
	console.log("MediaStream is created");
	console.log(stream);
	
	// Выводим местный медиапоток
	localVideo.autoplay = true;
	localVideo.muted = true;
 
	if ('srcObject' in localVideo){ localVideo.srcObject = stream; } 
		else { localVideo.src = URL.createObjectURL(stream); }			
 
  	// запоминаем местный медиапоток в локальной переменной
	localStream = stream;
	
	// Переходим к фунции, которая создает оъект PeerConnection и описывает обработчики
	PeerConnection();
	
	// Переходим к инициации соединения (раньше было по нажатию кнопки
	//createOffer_click();
	init_Offer();
}


function PeerConnection(){
pc = new RTCPeerConnection(servers);
console.log('pc is created');
console.log(pc);

if (pc) {

   localStream.getTracks().forEach(function(track){pc.addTrack(track, localStream)});
	
	console.log("MediaStream is added");
	document.getElementById('logs').innerHTML="&nbsp";

	pc.onicecandidate = function (e){
		console.log("ICE candidate:");
		console.log(e.candidate);
		socket.emit("message", {type: "Receiver_candidate", candidate: e.candidate, Room_ID : Room_ID});
		};

	pc.onaddstream = function(e) {
		console.log("Stream received!");
		console.log(e.stream);

		remoteVideo.autoplay = true;
		remoteVideo.muted = false;
		
		if ('srcObject' in remoteVideo) { remoteVideo.srcObject = e.stream; } 
			else { remoteVideo.src = URL.createObjectURL(e.stream); }			
		
		}

	pc.oniceconnectionstatechange = function (e){
		console.log('oniceconnectionstatechange');
		console.log(e.target);
		
		if (e.target.iceConnectionState == 'connected'){
			document.getElementById('connection').innerHTML = 'Соединение установлено';
			//document.getElementById('btn_AudioOn').style.display='inline-block';
			//document.getElementById('btn_AudioOff').style.display='inline-block';
			document.getElementById('btn_HangUp').style.display='inline-block';
			socket.emit('message',{type:'connection', value:'Receiver is connected'});
			}
		if (e.target.iceConnectionState == 'disconnected' & e.target.iceGatheringState=='complete'){
			document.getElementById('logs').innerHTML = "&nbsp";
			document.getElementById('connection').innerHTML = 'Связь прервалась';
			//document.getElementById('btn_getCall').style.display='inline-block';
			socket.emit('message',{type:'connection_off', value:'Receiver (' + socket.id + ') is disconnected', Room_ID : Room_ID})
			closeVideoCall();
			}
		};
	
	}
	
	else console.log('Error: pc is not created. please creat pc.');
}



function init_Offer(){	
	console.log("init_Offer");
	socket.emit("message", {type: "init_Offer", Room_ID: Room_ID});
	}


function init_Offer_yes(){
	console.log("init_Offer_yes");
if (pc)	{

		pc.createOffer(
			function(desc)
			{
				console.log('createOffer');
				pc.setLocalDescription(desc);
				console.log('setLocalDescription');
				console.log(desc);
				socket.emit("message", {type: 'offer', Room_ID: Room_ID, desc: desc});
			},
			function(err)
			{
				console.error(err);
			}
		);
		}
		else console.log('Error: pc is not created. please creat pc.');

		
}

function AudioOff_click(){
	document.getElementById('remoteVideo').muted = true;
	document.getElementById('btn_AudioOn').style.color='green';
	document.getElementById('logs').innerHTML= 'Звук выключен';

}

function AudioOn_click(){
	document.getElementById('remoteVideo').muted = false;
	document.getElementById('btn_AudioOn').style.color='black';
	document.getElementById('logs').innerHTML=  'Звук включен';
}

function HangUpCall(){
	console.log('HangUpCall is clicked');
	document.getElementById('connection').innerHTML= 'Разъединено Вами';
	socket.emit("message", {type:'HangUpCall_clicked', value:'Receiver_clicked_HangUpCall', Room_ID: Room_ID });
	closeVideoCall();
}


function closeVideoCall() {
	document.getElementById('btn_getCall').style.display='none';
	getCallClicked = "false";
  //document.getElementById('logs').innerHTML= "&nbsp";

	document.getElementById('btn_AudioOn').style.display='none';
	document.getElementById('btn_AudioOff').style.display='none';
	document.getElementById('btn_HangUp').style.display='none';


  if (pc) {
    pc.ontrack = null;
    pc.onremovetrack = null;
    pc.onremovestream = null;
    pc.onicecandidate = null;
    pc.oniceconnectionstatechange = null;
    pc.onsignalingstatechange = null;
    pc.onicegatheringstatechange = null;
    pc.onnegotiationneeded = null;

    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach(function(track){track.stop()});
	  remoteVideo.srcObject = null;
    }

    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(function(track){track.stop()});
      localVideo.srcObject = null;
    }

    pc.close();
    pc = null;
  }


  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localStream = null

}


function Error(err)
{
	console.log('Error:');
	console.error(err);
}


///////////////////
socket.on('success', function ()
{
	console.log("socket.on connected");
	//socket.emit('message','receiver');
	socket.emit('message', {type: 'receiver', Room_ID: Room_ID});
});

/*
socket.on('Current_Request_ID', function (Current_Request_ID)
{
	console.log("Current_Request_ID " + Current_Request_ID);
	//document.getElementById('debug').innerHTML= 'Current_Request_ID: ' + Current_Request_ID;
});
*/
			
socket.on('message', function(message)
{
	console.log("Message from server:");
	console.log(message);

		if (message == 'init_Offer_yes'){
			init_Offer_yes();
			}

		if (message.type == 'NewSession'){
			document.getElementById('Awaiting_List').innerHTML="Лист ожидания: " + message.number;
			if (message.number){
				document.getElementById('btn_getCall').style.display='inline-block';
				document.getElementById('logs1').innerHTML="Вам звонят";
				document.getElementById('Awaiting_List').style.color='red';
				} else {
					document.getElementById('btn_getCall').style.display='none';
					document.getElementById('logs1').innerHTML='&nbsp';
					document.getElementById('Awaiting_List').style.color='grey';
					}
			}

		if (message.type == 'Await_Num_Change'){
			document.getElementById('Awaiting_List').innerHTML="Лист ожидания: " + message.number;
			//console.log(message);
		
			if (message.number &&  message.Receiver_busy == false){
				document.getElementById('btn_getCall').style.display='inline-block';
				document.getElementById('logs1').innerHTML="Вам звонят";
				}

			if (!message.number &&  message.Receiver_busy == false){
				document.getElementById('btn_getCall').style.display='none';
				document.getElementById('logs1').innerHTML="&nbsp";
				document.getElementById('connection').innerHTML="&nbsp";
				}

				
			if (message.number){ document.getElementById('Awaiting_List').style.color='red'; }
				else { document.getElementById('Awaiting_List').style.color='grey'; } 

				
			}

	
	if (message.type == "answer")
	{
		if (pc){
			pc.setRemoteDescription(new RTCSessionDescription(message));
			console.log('setRemoteDescription');
			//console.log(message);
			//document.getElementById('logs').innerHTML="Aswer is received";

			}
	}

	if (message.type == "Sender_candidate")
	{
			if (message.candidate)
			{
				console.log('IceCandidate is received:');
				//console.log(message.candidate);
				if (pc) {
					pc.addIceCandidate(new RTCIceCandidate(message.candidate));
					console.log('new IceCandidate is added');
					}
			}
	}

	if (message.type == "HangUpCall_clicked"){
		document.getElementById('logs').innerHTML= "&nbsp";
		document.getElementById('connection').innerHTML= 'Разъединено другой стороной';
		socket.emit('message','Receiver is disconnected by Sender')
		//document.getElementById('btn_getCall').style.display='inline-block';
		closeVideoCall();
		}

	if (message == "user_leave_browser"){
		console.log(message);
		document.getElementById('logs').innerHTML= "&nbsp";
		document.getElementById('connection').innerHTML= 'Пользователь закрыл вкладку';
		Disconnected_method='user_leave_browser';
		closeVideoCall();
		}
		
	});




socket.on('error', function(err)
{
	console.log("Error!");
	console.error(err);
});

