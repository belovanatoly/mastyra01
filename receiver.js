// JavaScript Document
console.log("begin");

var socket = io.connect();

var mediaConstraints = {
  audio: true, 
  video: true 
};

var localStream = null;
var pc = null;
var getCallClicked = false;

//var servers = null;


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

RTCPeerConnection = (
	RTCPeerConnection ||
	webkitRTCPeerConnection ||
	mozRTCPeerConnection ||
	msRTCPeerConnection
);

RTCSessionDescription = (
	RTCSessionDescription ||
	webkitRTCSessionDescription ||
	mozRTCSessionDescription ||
	msRTCSessionDescription
);

RTCIceCandidate = (
	RTCIceCandidate ||
	webkitRTCIceCandidate ||
	mozRTCIceCandidate ||
	msRTCIceCandidate
);

if(!RTCPeerConnection) {console.log ('Your browser doesn\'t support WebRTC');}


function getCall_click(){
console.log('getCall is clicked');
getCallClicked = true;
console.log(getCallClicked);
document.getElementById('btn_getCall').style.display='none';
document.getElementById('connection').innerHTML = "Принять звонок нажата";

navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(getStream)
    .catch(Error);
}

function getStream(stream)
{
  document.getElementById('logs1').innerHTML='&nbsp';
  document.getElementById('btn_getCall').style.display='none';
  console.log("MediaStream is created");
  console.log(stream);
  
  localVideo = document.getElementById('localVideo');
  localVideo.srcObject = stream; 
  localVideo.autoplay = true;
  localVideo.muted = true;

  localStream = stream;
  //console.log(stream.getTracks()[0]);
  //console.log(stream.getTracks()[1]);

PeerConnection();
createOffer_click();

}


function PeerConnection(){
pc = new RTCPeerConnection(servers);
if (pc) {
	console.log('pc is created');
	console.log(pc);

	  pc.addStream(localStream);
 	 //localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
	  
	  console.log("MediaStream is added");
	  //logs = document.getElementById('logs');
	  logs.innerHTML="&nbsp";


		pc.onicecandidate = function (e)
		{
			//console.log("ICE candidate:");
			//console.log(e.candidate);
			//socket.emit("message", {type: "candidate", candidate: e.candidate});
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

				}
			if (e.target.iceConnectionState == 'disconnected' & e.target.iceGatheringState=='complete'){
				document.getElementById('logs').innerHTML = "&nbsp";
				document.getElementById('connection').innerHTML = 'Связь прервалась';
				document.getElementById('btn_getCall').style.display='inline-block';
				closeVideoCall();
				}
		};
	
		}
	else console.log('error: pc is not created. please creat pc.');
}



function createOffer_click(){	
if (pc)	{

		pc.createOffer(
			function(desc)
			{
				console.log('createOffer');
				pc.setLocalDescription(desc);
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
		else console.log('error: pc is not created. please creat pc.');

		
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
	socket.emit("message", 'HangUpCall');
	closeVideoCall();
}


function closeVideoCall() {
	document.getElementById('btn_getCall').style.display='none';
	getCallClicked = "false";
   remoteVideo = document.getElementById("remoteVideo");
   localVideo = document.getElementById("localVideo");
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
	console.log('Ошибка:');
	console.error(err);
}


///////////////////
socket.on('success', function ()
{
	console.log("socket.on connected");
});


socket.on('Current_Request_ID', function (Current_Request_ID)
{
	console.log("Current_Request_ID " + Current_Request_ID);
	document.getElementById('debug').innerHTML= 'Current_Request_ID: ' + Current_Request_ID;
});

			
socket.on('message', function(message)
{
	console.log("Message from server:");
	console.log(message);
	
		if (message == 'newcall'){
		document.getElementById('logs1').innerHTML="Вам звонят";
		document.getElementById('logs1').style.color = 'red';
		document.getElementById('btn_getCall').style.display='inline-block';
		}

	
	if (message.type == "answer")
	{
		if (pc){
			pc.setRemoteDescription(new RTCSessionDescription(message));
			console.log('setRemoteDescription');
			console.log(message);
			//document.getElementById('logs').innerHTML="Aswer is received";

			}
	}
	
	if (message.type == "offer")
	{
			console.log('Offer is received:');
			console.log(message);
			
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
					document.getElementById('btn_getCall').style.display='none';
					

					//document.getElementById('logs').innerHTML="Answer is sended";

				}, 
				function(err)
				{
					console.error(err);
				}
			);
			}
	}

	if (message.type == "candidate")
	{
			if (message.candidate)
			{
				console.log('IceCandidate is received:');
				console.log(message.candidate);
				if (pc) {
					pc.addIceCandidate(new RTCIceCandidate(message.candidate));
					console.log('new IceCandidate is added');
					}
			}
	}


	

	if (message == 'HangUpCall'){
		document.getElementById('logs').innerHTML= "&nbsp";
		document.getElementById('connection').innerHTML= 'Разъединено другой стороной';
		document.getElementById('btn_getCall').style.display='inline-block';
		closeVideoCall();}
	
	});

socket.on('error', function(err)
{
	console.log("Error!");
	console.error(err);
});

