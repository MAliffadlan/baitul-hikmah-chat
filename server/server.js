const express = require('express');
const http = require('http')
const socketIO = require('socket.io');
const path = require('path');
const {
  generateMessage,
  generateLocationMessage
} = require('./utils/message');
const {
  isRealString
} = require('./utils/validation');
const {Users} = require('./utils/users');
const {Room} = require('./utils/room');

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app)
const io = socketIO(server)
const users = new Users();
const rooms = new Room()

app.use(express.static(publicPath));

io.on('connection', (socket) => {
  console.log('Ada akun masuk');

  socket.on('join', (params, callback) => {
    if (!isRealString(params.name) || !isRealString(params.room)) {
      return  callback('Name and Room name are required');
    };

    const room = params.room.toLowerCase()
    // const usersList = users.getUserList(params.room);
    
    socket.join(room);
    rooms.addRoom(room);

    // socket.leave('Room Name');
    users.removeUser(socket.id);

    const xyz = users.addUser(socket.id, params.name, room);
    if (!xyz) {
      return callback('User with the name exits')
    }

    io.to(room).emit('updateUserList', users.getUserList(room));
    
    socket.emit('newMessage', generateMessage('Admin', 'Welcome to the Baitul Hikmah Chat'));

    socket.broadcast.to(room).emit('newMessage', generateMessage('Admin', `${params.name} has joined`));
    callback();
  })

  socket.emit('getRoomList' , rooms.getRoomList())

  socket.on('createMessage', (message, callback) => {
    // console.log('Message created');
    // console.log(message);
    const user = users.getUser(socket.id);

    if (user && isRealString(message.text)) {
      io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
    }

    callback();
  });

  socket.on('createLocationMessage', (coords) => {

    const user = users.getUser(socket.id);
    if (user) {
      io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude))
    }
  })

  socket.on('disconnect', () => {
    // console.log('user was disconnected')
    const user = users.removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('updateUserList', users.getUserList(user.room))
      io.to(user.room).emit('newMessage', generateMessage('Admin', user.name + ' has left the room'));
    }
  });
});

server.listen(port, () => {
  console.log('Node server running on ' + port)
})