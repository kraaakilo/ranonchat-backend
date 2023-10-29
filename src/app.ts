/* eslint-disable @typescript-eslint/no-var-requires */
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import app from "express";
import { MessageType, UserConnection } from './types';
import { v4 as uuid } from 'uuid';
import { generateUsername } from 'unique-username-generator';
import Filter from 'bad-words';

const badWords = new Filter();

const SERVER_PORT = 8080;

const server = createServer(app);
const wss = new WebSocketServer({ server });

const globalConnections: UserConnection = {};
const waitingConnections: UserConnection = {};
const chats: { [key: string]: string[] } = {};


wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    console.log("New connection");


    const userId = uuid();
    globalConnections[userId] = ws;
    waitingConnections[userId] = ws;

    matchMaking();

    ws.on('message', function message(data) {
        try {
            const message: MessageType = JSON.parse(data.toString()) as MessageType;
            if (message.type === "message") {
                const to = message.payload?.to;
                if (to && globalConnections[to]) {
                    globalConnections[to].send(JSON.stringify({
                        type: "message",
                        message: badWords.clean(message.payload!.content),
                    }));
                }
            }
            if (message.type === "quit") {
                const from = message.payload?.from;
                if (from && globalConnections[from]) {
                    globalConnections[from!].close();
                }
            }

        }
        catch (e: unknown) {
            console.error(e);
        }
    });

    ws.on('close', function close() {
    });
});

server.listen(SERVER_PORT, () => {
    console.log('Listening on %d', SERVER_PORT);
});


// match making with chats objects
function matchMaking() {

    const waitingUsers = Object.keys(waitingConnections);

    if (waitingUsers.length > 1) {
        const user1 = waitingUsers[0];
        const user2 = waitingUsers[1];

        // capitalizing the first letter of the username
        const username1 = generateUsername(" ")
            .split(" ")
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(" ");
        const username2 = generateUsername(" ")
            .split(" ")
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(" ");

        delete waitingConnections[user1];
        delete waitingConnections[user2];

        const chatId = uuid();
        chats[chatId] = [];
        chats[chatId].push(user1);
        chats[chatId].push(user2);

        globalConnections[user1].send(JSON.stringify({
            type: "match",
            payload: {
                chatId: chatId,
                username: username1,
                from: user1,
                to: user2,
                timestamp: Date.now()
            }
        }));
        globalConnections[user2].send(JSON.stringify({
            type: "match",
            payload: {
                chatId: chatId,
                username: username2,
                from: user2,
                to: user1,
                timestamp: Date.now()
            }
        }));
    }
}

// notifing the user that opponent left the chat after checking for solo chats and return the opponent id
function notifyOpponentLeft(userId: string): string | undefined {
    const chatId = Object.keys(chats).find((chatId) => chats[chatId].includes(userId));
    if (chatId) {
        const opponentId = chats[chatId].find((id) => id !== userId);
        if (opponentId) {
            globalConnections[opponentId].send(JSON.stringify({
                type: "quit",
                payload: {
                    from: opponentId,
                    timestamp: Date.now()
                }
            }));
        }
        delete chats[chatId];

        return opponentId;
    }
}

// periodic check for closed connections and delete them from globalConnections and waitingConnections
// notify the opponent that the user left the chat
setInterval(() => {
    for (const user of Object.keys(globalConnections)) {
        if (globalConnections[user].readyState === globalConnections[user].CLOSED) {
            delete globalConnections[user];
            delete waitingConnections[user];

            const opponentId = notifyOpponentLeft(user);


            console.log("Closed connection");

            if (opponentId) {
                waitingConnections[opponentId] = globalConnections[opponentId];
            }

        }
    }
}, 1000);