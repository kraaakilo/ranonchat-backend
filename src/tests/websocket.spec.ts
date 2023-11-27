import { wss } from "@/app";
import WebSocket, { WebSocketServer } from "ws";
let server: WebSocketServer;
let client: WebSocket;

describe("Websocket", () => {
  beforeAll(() => {
    server = wss;
  });
  afterAll(() => {
    server.close();
  });
  it("should connect to websocket", async () => {
    client = new WebSocket("ws://localhost:3000");
    client.on("open", () => {
      expect(client.readyState).toBe(WebSocket.OPEN);
    });
  });
});
