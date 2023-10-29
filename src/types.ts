import { WebSocket } from "ws"

export type MessageType ={
    type : "match" | "message" | "quit",
    payload : Payload | undefined
}

export type Payload = {
    id: string,
    content: string,
    from : string,
    to: string,
    timestamp: number
}

export type UserConnection = {
    [key: string]: WebSocket
}