import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from app.database import init_db
from app.websocket.manager import manager
from app.routers import dashboard, export, ddos, scanner, bruteforce, phishing, sandbox, auth

# Load environment variables
load_dotenv()

app = FastAPI(title="BreachSimu API")

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.routers.phishing import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


from fastapi.staticfiles import StaticFiles

# BASE DIRECTORY LOGIC
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PHISHING_SITE_DIR = os.path.join(BASE_DIR, "..", "..", "phishing-site")

raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

# 🟢 FIX: Handle Root URL (/) to prevent 404 errors
@app.get("/")
async def root():
    return JSONResponse(content={
        "status": "online",
        "module": "BreachSimu Backend",
        "version": "1.0.0"
    })

# 🟢 FIX: Handle Favicon.ico 404 error
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

# SERVING THE PHISHING PAGE
app.mount("/phishing-site", StaticFiles(directory=PHISHING_SITE_DIR), name="phishing-site")



# ROUTERS
app.include_router(ddos.router, prefix="/ddos")
app.include_router(phishing.router, prefix="/phishing")
app.include_router(dashboard.router, prefix="/dashboard")
app.include_router(export.router, prefix="/export")
app.include_router(bruteforce.router, prefix="/bruteforce")
app.include_router(scanner.router, prefix="/scanner", tags=["Scanner"])
app.include_router(sandbox.router, prefix="/sandbox", tags=["Sandbox"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
# Ensure this is included

# WEBSOCKET ENDPOINT
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"[+] WS CONNECTED | Active Connections: {len(manager.active_connections)}")
    try:
        while True:
            data = await websocket.receive_text()
            # Respond to pings to keep Cloudflare tunnel alive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("[-] WS DISCONNECTED")
    except Exception as e:
        manager.disconnect(websocket)
        print(f"[!] WS ERROR: {e}")