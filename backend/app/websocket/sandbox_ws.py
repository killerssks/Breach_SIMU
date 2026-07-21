from fastapi import WebSocket

class WSManager:
    def __init__(self):
        self.connections = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)

    async def broadcast(self, data):
        for conn in self.connections:
            await conn.send_json(data)


ws_manager = WSManager()