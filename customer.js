// JavaScript Document
console.log("begin");

var socket = io.connect();
var User_Request_ID;
var Room_ID;

var mediaConstraints = {
  audio: true, 
  video: true 
};

var localStream = null;
var pc = null;
var servers = null;

/*
var servers = {"iceServers": 
	    [
            {"url": "stun:stun.l.google.com:19302"}
	    ]
        };
*/
		
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

if (getParam('id')) {
	Room_ID = getParam('id');
	console.log ('Room_ID = ' + Room_ID);
	}

	
pc = new RTCPeerConnection(servers);
console.log('pc is created');
console.log(pc);


navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(newStream)
    .catch(Error);

function getParam(param){
	return new URLSearchParams(window.location.search).get(param);
	}


function newStream(stream)
{
		//socket.emit('join', 'room1');
		console.log("MediaStream is created");
		console.log(stream);
		
		localVideo = document.getElementById('localVideo');
		localVideo.srcObject = stream; 
		localVideo.autoplay = true;
		localVideo.muted = true;
	  
		localStream = stream;
		console.log('we do newcall');

		socket.emit('message', {type: 'newcall', Room_ID: Room_ID});
		console.log('Sender do new call');
		document.getElementById('logs').innerHTML="&nbsp";
		document.getElementById('connection').innerHTML="Запрос на соединение отправлен ...";

}


function PeerConnection(){

if (pc) {
		
		pc.onicecandidate = function (e)  // добавить прекратить при установке соединения
		{
			console.log("ICE candidate:");
			console.log(e.candidate);
			socket.emit("message", {type: "Sender_candidate", candidate: e.candidate});
		};

		pc.onaddstream = function(e) {
		console.log("Stream received!");
		console.log(e.stream);

		var video = document.getElementById('remoteVideo');
		video.autoplay = true;
		video.muted = false;
		video.srcObject = e.stream; 
		};

		pc.oniceconnectionstatechange = function (e)
		{
			console.log('oniceconnectionstatechange');
			console.log(e.target);
			//document.getElementById('connection').innerHTML = e.target.iceConnectionState + " ... " + e.target.iceGatheringState;
			if (e.target.iceConnectionState == 'connected'){
				document.getElementById('connection').innerHTML = 'Соединение установлено';
				document.getElementById('btn_AudioOn').style.display='inline-block';
				document.getElementById('btn_AudioOff').style.display='inline-block';
				document.getElementById('btn_HangUp').style.display='inline-block';
				socket.emit('message',{type:'connection', value:'Sender (' + socket.id + ') is connected'});
				}
			if (e.target.iceConnectionState == 'disconnected' & e.target.iceGatheringState=='complete'){
				document.getElementById('connection').innerHTML = 'Связь прервалась';
				socket.emit('message',{type:'connection_off', value:'Sender (' + socket.id + ') is disconnected', Room_ID : Room_ID})
				closeVideoCall();
				}
		};
	
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
	socket.emit("message", {type:'HangUpCall_clicked', value:'Sender_clicked_HangUpCall' });
	closeVideoCall();
}


function closeVideoCall() {
  var remoteVideo = document.getElementById("remoteVideo");
  var localVideo = document.getElementById("localVideo");
  
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
	console.log('Error:');;
	console.error(err);
	console.log(err);
}


///////////////////
socket.on('success', function ()
{
	console.log("socket.on connected");
	socket.emit('message', 'sender');

});

socket.on('Request_ID', function (Request_ID)
{
	console.log("Request_ID " + Request_ID);
	User_Request_ID = Request_ID;
	document.getElementById('debug').innerHTML= 'User_Request_ID: ' + User_Request_ID + '<br>' + 'User_Socket_ID: ' + socket.id; 
});


socket.on('message', function(message)
{
	console.log("Message from server:");
	console.log(message);

	if (message.type == "Current_Request_Socket_ID"){
		console.log('Current_Request_Socket_ID: ', message.value);
		if (socket.id == message.value){ 
			console.log('Current_Request_Socket_ID is equil');
			socket.emit('message', {type: 'Current_Request_Socket_ID_existing', value: 'yes', Room_ID: Room_ID});
			} 
			else {
				console.log('Current_Request_Socket_ID is not equil');
				}
		}


	if (message.type == "offer")
	{
		  console.log('Offer is received:');
		  PeerConnection();
		  localStream.getTracks().forEach(function(track){pc.addTrack(track, localStream)});
		  console.log("MediaStream is added");
			
			if(pc){
				pc.setRemoteDescription(new RTCSessionDescription(message));
				console.log('setRemoteDescription');
				console.log(message);
				console.log('createAnswer');
				pc.createAnswer
				(function(desc)
				{
					pc.setLocalDescription(desc)
					console.log('setLocalDescription');
					console.log(desc);
					socket.emit("message", desc);
				}, 
				function(err)
				{
					console.error(err);
				}
			);
			}
	}

	if (message.type == "Receiver_candidate")
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
		socket.emit('message','Sender is disconnected by Receiver')
		closeVideoCall();}
	});


socket.on('error', function(err)
{
	console.log("Error!");
	console.error(err);
});

