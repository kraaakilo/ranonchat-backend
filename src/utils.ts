import { UserConnection } from "@/types";
import { v4 as uuid } from "uuid";
import { generateUsername } from 'unique-username-generator';

export function matchMaking(globalConnections: UserConnection,
  waitingConnections: UserConnection,
  chats: { [key: string]: string[] }) {

  const waitingUsers = Object.keys(waitingConnections);

  if (waitingUsers.length > 1) {
    const user1 = waitingUsers[0];
    const user2 = waitingUsers[1];

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

export function notifyOpponentLeft(userId: string,
  chats: { [key: string]: string[] },
  globalConnections: UserConnection): string | undefined {
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
