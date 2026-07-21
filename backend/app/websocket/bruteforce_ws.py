from fastapi import WebSocket

class WSManager:
    def __init__(self):
        self.connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.remove(websocket)

    async def broadcast(self, data):
        for conn in self.connections[:]:
            try:
                await conn.send_json(data)
            except:
                self.connections.remove(conn)

ws_manager = WSManager()