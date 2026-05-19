const app = require('./app');
const PORT = process.env.PORT || 8000;
const connectDB = require('./config/db');
const initSocket = require('../src/config/socket');
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// initialize socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PATCH'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

initSocket(io);
app.set('io', io); 

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();