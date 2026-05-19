const jwt = require('jsonwebtoken');
const cookie = require('cookie');

function initSocket(io) {
  io.use((socket, next) => {

    try {
      const cookies = cookie.parse(
        socket.handshake.headers.cookie || ''
      );

      const token = cookies.accessToken;

      if (!token) {
        return next(
          new Error('Authentication required')
        );
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;

    if (role === 'author') {
      socket.join(`author:${id}`);
      console.log(`🔌 Author ${id} connected via socket`);
    } else {
      socket.join('admins');
      console.log(`🔌 Admin ${id} connected via socket`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${id}`);
    });
  });
}

module.exports = initSocket;