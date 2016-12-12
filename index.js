root@NodeJS:~/socket.io/examples/chat# cat index.js 
// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;
var redisKey = 'KH_messages';

// Configure Redis client connection
var redis = require('redis');
var credentials;
credentials = { "host": "10.xx.xx.247", "port": 6379, "password":"xxxxxx" }
var redisClient = redis.createClient(credentials.port, credentials.host);
redisClient.auth(credentials.password);

//initial MongoDB using mongoose
var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/xxxxx');

console.log(new Date());

// create a schema for chat
var ChatSchema = mongoose.Schema({
  created: Date,
  content: String,
  username: String,
  room: String,
  mediadata: String
});

// create a model from the chat schema
var Chat = mongoose.model('Chat', ChatSchema);
server.listen(port, function () {
  console.log('Bismillahirrahmanirrahim\nServer listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {


      var storeData = {
      username: socket.username,
      message: data,
      date:new Date()
       }; 

	var chatData = {
    	created: new Date(),
   	content: data,
    	username: socket.username,
    	room: 'Genel'
	};
	var newChat = new Chat(chatData);

	newChat.save(function(err, savedChat) {
      	console.log(savedChat);
    	});

      //added for redis 
      redisClient.lpush(redisKey, JSON.stringify(storeData));
      redisClient.ltrim(redisKey, 0, 99);
      // we tell the client to execute 'new message'   
      socket.broadcast.emit('new message', {
      username: socket.username,
      message: data,
      date: new Date()
    });

//nofiyuser
var message = {
  app_id: "833ae655-2e45-40f5-8901-3197f1e2a999",
  contents: {"en": data},
  data : {"action": "openfragment",
          "id" : "8"},
  included_segments: ["CHATNOTIFYON"],
  android_group: "kiraathaneGenel",
  headings:{"en": socket.username },
  android_sound: "kiraathane3",
  android_accent_color : "35b0d4",
  large_icon: "https://static.otodyo.com/images/chat.png",
  android_group_message:{"en" : "$[notif_count] Kıraathane mesajın var."}
};


sendNotification(message);

    
  });


//when user send image
socket.on('user image', function(data) {

    socket.broadcast.emit('user image', {
      username: socket.username,
      message: data,
      date: new Date()
    });
        var storeData = {
      username: socket.username,
      message: 'Resim gonderildi',
      date:new Date(),
      mediadata:data
       };

   
     redisClient.lpush(redisKey, JSON.stringify(storeData));
  

        var chatData = {
        created: new Date(),
        content: 'Resim gonderildi',
        username: socket.username,
        room: 'Genel',
	mediadata:data
        };
        var newChat = new Chat(chatData);

        newChat.save(function(err, savedChat) {
        console.log(savedChat);
        });

//nofiyuser
var message = {
  app_id: "833ae655-2e45-40f5-8901-3197f1e2a999",
  contents: {"en":"📷 gönderildi" },
  included_segments: ["CHATNOTIFYON"],
  data : {"action": "openfragment",
          "id" : "8"},
  android_group: "kiraathaneGenel",
  headings:{"en": socket.username },
  android_sound: "kiraathane3",
  android_accent_color : "35b0d4",
  large_icon: "https://static.otodyo.com/images/chat.png",
  android_group_message:{"en" : "$[notif_count] Kıraathane mesajın var."}
};


sendNotification(message);

 //	console.log('Image data send to all user'+data);
});



  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;
      
      var messages = redisClient.lrange(redisKey, 0, 99, function(err, reply) {
        if(!err) {        
          var result = [];
//       //   console.log('StringSonuc: '+reply);

          for(var msg in reply) result.push(JSON.parse(reply[msg]));

          var latest = result.reverse();  
          for(var i=0,ln=latest.length;i<ln;i++)
          {
//               console.log(JSON.parse(reply[i]).username);
          
                socket.emit('new message', {
                    username: latest[i].username,
                    message: latest[i].message,
	            mediadata: latest[i].mediadata,
                    date: latest[i].date
                });
          }


        }
      });

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

var sendNotification = function(data) {
  var headers = {
    "Content-Type": "application/json",
    "Authorization": "Basic ahsdkahgkfjsdhfkjghjksdhfjkghjskdfhgkjhskjdfgds"
  };
  
  var options = {
    host: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: headers
  };
  
  var https = require('https');
  var req = https.request(options, function(res) {  
    res.on('data', function(data) {
      console.log("Response:");
      console.log(JSON.parse(data));
    });
  });
  
  req.on('error', function(e) {
    console.log("ERROR:");
    console.log(e);
  });
  
  req.write(JSON.stringify(data));
  req.end();
};
