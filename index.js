
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis= require('redis');
var client= redis.createClient();
var name="Agent-Patron";
var userName = '';

//connect to the redis server
client.on('connect', function(){
	console.log('connected to the redis server');
});

//redner the html file and send it to the browser
app.get('/', function(req, res){
  res.sendfile('index.html');
console.log(req.query.name+" has logged in");
userName = req.query.name;
});

//listen to the node.js request from the browser on port 3000
http.listen(3000, function(){
  console.log('socket.io established on:3000');
	});

//once the connection is established, receive and emit events
io.on('connection', function(socket){

 	client.set(socket.id, userName);
	console.log('Registered socket id : '+socket.id);
	console.log('With name  : '+userName);
	client.lrange(name,0,-1, function(err, reply){
					reply.forEach(function(listItem, i){
				client.GET(listItem, function(err, value){
				socket.emit('chat message', listItem);
				});
			});

	});

	//event to receive a chat message from the client
	socket.on('chat message', function(msg){
		var uName;
		client.get(socket.id, function(err, reply){
			uName = reply;

			//persist the message to redis
			client.rpush([name,uName+" : "+msg], function(err, reply){
			 console.log("Chat message persisted. Total chat messages : "reply);//returns the count of items in the list
				});
			io.emit('chat message', uName+" : "+msg);
			uName = '';

		});

  });

	//event to receive a typing.. event from the client
	socket.on('patron typing', function(){
		//console.log('received patron typing');
		var uName;
		client.get(socket.id, function(err, reply){
			uName = reply;
			io.emit('patron typing',uName);
				});
			uName = '';

		});


	//on disconnect, delete the list
	socket.on('end chat', function(){
	        console.log('one of the parties disconnected, deleting the redis list');
		client.del(name);
		client.del(socket.id);
		io.emit('end chat');

  });

});
