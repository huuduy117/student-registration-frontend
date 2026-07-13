import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';

let ioServer, ioClient;

export const mockSocket = {
  start: (httpServer) => {
    ioServer = new Server(httpServer);
    ioClient = new Client(ioServer); // Client connects to internal server
  },
  stop: () => {
    if (ioServer) {
      ioServer.close();
    }
    if (ioClient) {
      ioClient.close();
    }
  },
  mockEmit: (event, data) => ioServer.emit(event, data),
  mockListen: (event, cb) => ioClient.on(event, cb),
};