import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import app from "express";
import { MessageType, UserConnection } from '@/types';
import { v4 as uuid } from 'uuid';
import Filter from 'bad-words';
import { matchMaking, notifyOpponentLeft } from '@/utils';

const badWords = new Filter();

const SERVER_PORT = process.env.PORT || 3000;

const server = createServer(app);
export const wss = new WebSocketServer({ server });

const globalConnections: UserConnection = {};
const waitingConnections: UserConnection = {};
const chats: { [key: string]: string[] } = {};


wss.on('connection', function connection(ws) {
  ws.on('error', console.error);
  console.log("New connection");
  const userId = uuid();
  globalConnections[userId] = ws;
  waitingConnections[userId] = ws;
  // Start matchmaking
  matchMaking(globalConnections, waitingConnections, chats);
  // Handle messages
  ws.on('message', function message(data) {
    try {
      const message: MessageType = JSON.parse(data.toString()) as MessageType;
      if (message.type === "message") {
        const to = message.payload?.to;
        if (to && globalConnections[to]) {
          globalConnections[to].send(JSON.stringify({
            type: "message",
            message: badWords.clean(message.payload.content ?? ""),
          }));
        }
      }
      if (message.type === "quit") {
        const from = message.payload?.from;
        if (from && globalConnections[from]) {
          globalConnections[from ?? ""].close();
        }
      }
    }
    catch (e: unknown) {
      console.log("Error parsing message.", (e.toString().substring(0, 100) + "..."));
    }
  });

  ws.on('close', function close() {
    console.log('disconnected');
  });

});

server.listen(SERVER_PORT, () => {
  console.log('Listening on %d', SERVER_PORT);
});

// periodic check for closed connections and delete them from globalConnections and waitingConnections
// notify the opponent that the user left the chat
setInterval(() => {
  for (const user of Object.keys(globalConnections)) {
    if (globalConnections[user].readyState === globalConnections[user].CLOSED) {
      delete globalConnections[user];
      delete waitingConnections[user];
      const opponentId = notifyOpponentLeft(user, chats, globalConnections);
      console.log("Closed connection");
      if (opponentId) {
        waitingConnections[opponentId] = globalConnections[opponentId];
      }
    }
  }
}, 1000);
