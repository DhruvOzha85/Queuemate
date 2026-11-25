require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');
const queueRoutes = require('./routes/queue');
const providerRoutes = require('./routes/provider');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT'] },
});

app.set('io', io);
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'queuemate-server' });
});

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/provider', providerRoutes);

io.on('connection', (socket) => {
  socket.on('queue:joinRoom', (businessId) => {
    if (businessId) socket.join(`business:${businessId}`);
  });
  socket.on('queue:leaveRoom', (businessId) => {
    if (businessId) socket.leave(`business:${businessId}`);
  });
});

app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate record' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
