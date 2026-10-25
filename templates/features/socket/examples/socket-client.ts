import { io } from 'socket.io-client';
// Install socket.io-client in the frontend. Keep credentials in its session manager.
const socket = io('http://localhost:__PORT__', { auth: { token: '<access-token>' } });
socket.on('connect', () => socket.emit('system:ping', { nonce: 'connection-check' }, console.log));
socket.on('connect_error', () => { /* Refresh the session if appropriate, update auth.token, then reconnect. */ });
// Register feature listeners here; remove them and disconnect when the owning screen/session ends.
