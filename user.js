// JavaScript Document
console.log("begin");

var socket = io.connect();

var mediaConstraints = {
  audio: true, 
  video: true 
};

var localStream = null;
var pc = null;
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



function getUserMedia_click(){
	document.getElementById('logs').innerHTML="getUserMedia is clicked";
	PeerConnection();
	getUserMedia();
}


function PeerConnection(){
pc = new RTCPeerConnection(servers);
if (pc) {
	console.log('pc is created');
	console.log(pc);

		pc.onicecandidate = function (e)
		{
			console.log("ICE candidate:");
			console.log(e.candidate);
			//console.log(e.type);
			socket.emit("message", {type: "candidate", candidate: e.candidate});
			//socket.emit("message", e);
		};

		pc.onaddstream = function(e) {
		console.log("Stream received!");
		console.log(e.stream);

		var video = document.getElementById('remoteVideo');
		video.autoplay = true;
		video.muted = true;
		video.srcObject = e.stream; 
		};

		pc.oniceconnectionstatechange = function (e)
		{
			console.log('oniceconnectionstatechange');
			console.log(e.target);
			document.getElementById('connection').innerHTML = e.target.iceConnectionState;
		};
	
		}
	else console.log('error: pc is not created. please creat pc.');
}

function getUserMedia(){
	navigator.getUserMedia(mediaConstraints,
		function (stream)
		{
			
			console.log("MediaStream is created");
			console.log(stream);
			
			video = document.getElementById('localVideo');
			video.srcObject = stream; 
			video.autoplay = true;
   			video.muted = true;

			localStream = stream;
			//console.log(stream.getTracks()[0]);
			//console.log(stream.getTracks()[1]);
			pc.addStream(localStream);
			//localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
				
				console.log("MediaStream is added");
				logs = document.getElementById('logs');
				logs.innerHTML="MediaStream is added";

		},
		function (err)
		{
			console.error(err);
		}
	);
}


function createOffer_click(){	
if (pc)	{
		document.getElementById('logs').innerHTML="Offer is sended";
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
}

function AudioOn_click(){
	document.getElementById('remoteVideo').muted = false;
}


///////////////////
socket.on('success', function ()
{
	console.log("socket.on connected");

});


socket.on('message', function(message)
{
	console.log("Message from server:");
	console.log(message);
	if (message.type == "answer")
	{
		if (pc){
			pc.setRemoteDescription(new RTCSessionDescription(message));
			console.log('setRemoteDescription');
			console.log(message);
			document.getElementById('logs').innerHTML="Aswer is received";

			}
	}
	
	if (message.type == "offer")
	{
			console.log('Offer is received:');
			document.getElementById('logs').innerHTML="Offer is received";

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
					document.getElementById('logs').innerHTML="Answer is sended";

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
				console.log('IceCandidate is receved:');
				console.log(message.candidate);
				if (pc) {
					pc.addIceCandidate(new RTCIceCandidate(message.candidate));
					console.log('new IceCandidate is added');
					}
			}
	}
	
});


socket.on('error', function(err)
{
	console.log("Error!");
	console.error(err);
});

