const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3001;

const users = [];

// Map to store messages for each room
const roomMessages = new Map();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for joining a room
socket.on('joinRoom', async (room) => {
  socket.join(room);

  // Ensure the roomMessages map has an entry for the room
  if (!roomMessages.has(room)) {
    roomMessages.set(room, await loadMessages(room)); // Load messages for the room
  }

  // Send existing messages to the new user in the specific room
  socket.emit('allMessages', roomMessages.get(room) || []);

  // Emit room information to the client
  io.to(room).emit('roomInfo', {
    room: room,
    users: getUsersInRoom(room),
  });
});

function getUsersInRoom(room) {
  return Array.from(io.sockets.adapter.rooms.get(room) || []).map((socketId) => {
    const user = users.find((u) => u.id === socketId);
    return user ? user.username : "Unknown";
  });
}


    // Listen for new messages in a specific room
    socket.on('message', async (data) => {
    const room = data.room;

    // Ensure the roomMessages map has an entry for the room
    if (!roomMessages.has(room)) {
      roomMessages.set(room, await loadMessages(room)); // Load messages for the room
    }

    data.username = getUsernameById(socket.id); // Include the username in the message data
    roomMessages.get(room).push(data);
    io.to(room).emit('message', data); // Broadcast the message to all clients in the room
    saveMessagesToFile(room); // Save messages specifically for the room
  });

  function getUsernameById(socketId) {
    const user = users.find((u) => u.id === socketId);
    return user ? user.username : "Unknown";
  }

  // Function to check if a username is available
    function isUsernameAvailable(username) {
        return !users.some((user) => user.username === username);
    }

    function saveUsers() {
        const usersFilePath = 'users/users.json';

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2))
          .then(() => console.log('Users saved'))
          .catch((error) => console.error('Error saving users:', error));
      }

  // Listen for user account creation
  socket.on('createAccount', (username) => {
    if (isUsernameAvailable(username)) {
      const user = {
        id: socket.id,
        username: username,
      };
      users.push(user);
      saveUsers();
      socket.emit('accountCreated', user);
    } else {
      socket.emit('accountCreationError', 'Username is not available.');
    }
  });

    function removeUser(socketId) {
        const index = users.findIndex((user) => user.id === socketId);
        if (index !== -1) {
          users.splice(index, 1);
          saveUsers();
          console.log(`User removed with socket ID ${socketId}`);
        }
      }

  // Listen for disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
    removeUser(socket.id);
  });

  // Asynchronous function to load messages for a room
async function loadMessages(room) {
  const roomFolderPath = `rooms/${room}`;
  const messagesFilePath = `${roomFolderPath}/messages.json`;

  try {
    await fs.mkdir(roomFolderPath, { recursive: true }); // Create room folder if it doesn't exist

    if (!roomMessages.has(room)) {
      roomMessages.set(room, []);
    }

    const fileContent = await fs.readFile(messagesFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading messages for room ${room}:`, error);
    return [];
  }
}

// Function to save messages for a room
function saveMessagesToFile(room) {
  const messagesFilePath = `rooms/${room}/messages.json`;

  const messagesToSave = roomMessages.get(room) || []; // Get messages for the specific room

  fs.writeFile(messagesFilePath, JSON.stringify(messagesToSave, null, 2))
    .then(() => console.log(`Messages saved for room ${room}`))
    .catch((error) => console.error(`Error saving messages for room ${room}:`, error));
}

});


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});