# BreachSimu 🛡️

> **A full-stack cybersecurity simulation platform for ethical hacking training, red team demos, and security awareness.**

BreachSimu provides a controlled environment to simulate real-world cyber attacks — phishing campaigns, SSH brute-force attacks, DDoS floods, malware sandbox analysis, and network reconnaissance — all from a single web dashboard.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Directory Structure](#-directory-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Configuration](#-environment-configuration)
- [Running the Application](#-running-the-application)
- [Module Documentation](#-module-documentation)
  - [Authentication](#-authentication)
  - [Phishing Simulator](#-phishing-simulator)
  - [Brute-Force Engine](#-brute-force-engine)
  - [DDoS Engine](#-ddos-engine)
  - [Network Scanner](#-network-scanner)
  - [Malware Sandbox](#-malware-sandbox)
  - [Dashboard & Reporting](#-dashboard--reporting)
- [API Reference](#-api-reference)
- [WebSocket Events](#-websocket-events)
- [Frontend Pages](#-frontend-pages)
- [Key Dependencies](#-key-dependencies)
- [Security Disclaimer](#-security-disclaimer)

---

## 🌐 Project Overview

BreachSimu is composed of three sub-applications:

| Component | Technology | Purpose |
|---|---|---|
| **backend** | FastAPI (Python) | REST API + WebSocket server, all attack engines |
| **frontend** | React + Vite + TailwindCSS | Main dashboard UI for operators |
| **landing-page** | React + Vite | Public-facing marketing/landing page |
| **phishing-site** | Static HTML + JS | Cloned login portal served to phishing targets |

---

## 🏗️ Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │              Browser / Operator               │
                  └──────────┬───────────────────────────────────┘
                             │ HTTP + WebSocket
         ┌───────────────────▼───────────────────┐
         │         FastAPI Backend (Port 8000)    │
         │  ┌────────────┐  ┌──────────────────┐  │
         │  │ REST APIs  │  │  WebSocket /ws   │  │
         │  └─────┬──────┘  └────────┬─────────┘  │
         │        │                  │             │
         │  ┌─────▼──────────────────▼──────────┐  │
         │  │         Attack Engines             │  │
         │  │  Phishing | BruteForce | DDoS     │  │
         │  │  Scanner  | Sandbox   | Export    │  │
         │  └─────────────────┬──────────────────┘  │
         │                    │                      │
         │         ┌──────────▼──────────┐           │
         │         │   SQLite Database   │           │
         │         │   (app.db)          │           │
         │         └─────────────────────┘           │
         └──────────────────────────────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │      Cloudflare Tunnel (optional)      │
         │  Makes phishing links publicly reachable│
         └───────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
breach-simu/
├── backend/                     # FastAPI Python backend
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point, router registration
│   │   ├── database.py          # SQLAlchemy engine, session, Base
│   │   ├── settings.py          # Environment variable loading
│   │   ├── core/
│   │   │   ├── security.py      # JWT creation, password hashing
│   │   │   └── dependencies.py  # DB session injection, auth middleware
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── organization.py  # Multi-tenant org model
│   │   │   ├── campaign.py      # Attack campaign model
│   │   │   ├── credential.py    # Captured credentials model
│   │   │   ├── event.py         # Tracking events model
│   │   │   └── user.py          # User model
│   │   ├── routers/             # FastAPI route handlers
│   │   │   ├── auth.py          # Register / Login / Me
│   │   │   ├── phishing.py      # Phishing campaign engine
│   │   │   ├── bruteforce.py    # SSH brute-force engine
│   │   │   ├── ddos.py          # SYN/UDP/HTTP flood engine
│   │   │   ├── scanner.py       # ARP network scan + port audit
│   │   │   ├── sandbox.py       # Malware detonation simulation
│   │   │   ├── dashboard.py     # Stats, timeline, campaign details
│   │   │   └── export.py        # PDF/Excel report export
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic services
│   │   │   ├── email_service.py # SMTP email sending + templates
│   │   │   ├── ddos_engine.py   # Low-level SYN/UDP/HTTP flood sockets
│   │   │   ├── port_scanner.py  # TCP port scanner
│   │   │   └── sandbox_engine.py# Sandbox simulation helpers
│   │   └── websocket/
│   │       └── manager.py       # WebSocket connection manager + broadcast
│   ├── .env                     # Active environment variables
│   ├── .env.example             # Template for environment variables
│   ├── package.json             # Node deps (jsPDF for PDF export)
│   ├── requirements.txt         # Python dependencies
│   ├── reset_db.py              # Script to wipe and recreate the database
│   ├── app.db                   # SQLite database (auto-created)
│   └── venv/                    # Python virtual environment
│
├── frontend/                    # React dashboard (Vite)
│   ├── src/
│   │   ├── App.jsx              # Root app, routing, protected routes
│   │   ├── main.jsx             # ReactDOM entry point
│   │   ├── index.css            # Global TailwindCSS styles
│   │   ├── pages/               # Full page components
│   │   │   ├── Landing.jsx      # Marketing landing page
│   │   │   ├── OrgLogin.jsx     # Organization login page
│   │   │   ├── OrgRegister.jsx  # Organization registration
│   │   │   ├── Login.jsx        # User login
│   │   │   ├── Home.jsx         # Dashboard home
│   │   │   ├── Phishing.jsx     # Phishing campaign management
│   │   │   ├── Bruteforce.jsx   # SSH brute-force control panel
│   │   │   ├── Ddos.jsx         # DDoS attack control panel
│   │   │   ├── Sandbox.jsx      # Malware sandbox UI
│   │   │   └── Hardware.jsx     # Hardware/network info
│   │   ├── components/          # Reusable UI components
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # JWT auth state management
│   │   ├── services/            # Axios API call wrappers
│   │   └── layouts/             # Shared layout wrappers
│   ├── package.json
│   └── vite.config.js
│
├── landing-page/                # Public landing page (Vite)
│   └── src/
│
├── phishing-site/               # Static phishing portal
│   ├── login.html               # Cloned login page shown to targets
│   └── script.js                # Form submit handler (credential capture)
│
├── requirements.txt             # Root-level Python requirements
├── npcap-installer.exe          # Required for Scapy/network scanning on Windows
└── rockyou.txt                  # Wordlist for brute-force attacks
```

---

## 🔧 Prerequisites

| Dependency | Version | Required For |
|---|---|---|
| **Python** | 3.12+ | Backend |
| **Node.js** | 20 LTS+ | Frontend, Landing Page |
| **npm** | 10+ | Frontend, Landing Page |
| **Npcap** | Latest | Network scanning (Scapy on Windows) |
| **SQLite** | Built-in | Default database |
| **cloudflared** | Latest (optional) | Public phishing links via Cloudflare Tunnel |

> 💡 **For Windows network scanning**: Run `npcap-installer.exe` (included in root directory) to install Npcap, which is required by Scapy for ARP scanning.

---

## 📦 Installation

### 1. Backend Setup (Python)

```powershell
cd backend

# Create a fresh virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1    # PowerShell
# OR
.\venv\Scripts\activate.bat    # Command Prompt

# Install all Python dependencies
pip install -r ..\requirements.txt

# Install Scapy (for network scanning)
pip install scapy

# Install Node.js packages (used for PDF export)
npm install
```

### 2. Frontend Setup (React Dashboard)

```powershell
cd frontend
npm install
```

### 3. Landing Page Setup

```powershell
cd landing-page
npm install
```

### 4. Install Npcap (Windows — required for network scanning)

Run `npcap-installer.exe` from the root directory with default options.

---

## ⚙️ Environment Configuration

Copy the example and fill in your values:

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env`:

```env
# Database — SQLite is default, no external DB needed
DATABASE_URL=sqlite:///./app.db

# SMTP for sending phishing emails
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# JWT Secret — use a long random string in production
SECRET_KEY=your-very-secret-key-here
```

> **Gmail App Password**: Google Account → Security → 2-Step Verification → App Passwords.

---

## 🚀 Running the Application

Open **three separate terminals**:

### Terminal 1 — Backend API Server

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: **http://localhost:8000**
- Swagger Docs: **http://localhost:8000/docs**

### Terminal 2 — Frontend Dashboard

```powershell
cd frontend
npm run dev
```

- Dashboard: **http://localhost:5173**

### Terminal 3 — Landing Page (optional)

```powershell
cd landing-page
npm run dev
```

- Landing Page: **http://localhost:5174**

---

## 📚 Module Documentation

### 🔐 Authentication

**File**: `backend/app/routers/auth.py`

Multi-tenant organization-based authentication using JWT tokens.

| Endpoint | Method | Description |
|---|---|---|
| `/auth/register` | POST | Register a new organization account |
| `/auth/login` | POST | Login and receive a Bearer JWT token |
| `/auth/me` | GET | Get current authenticated organization info |

**Flow:**
1. Register an organization with name, email, and password.
2. Login to receive a JWT access token.
3. Include token in all protected requests: `Authorization: Bearer <token>`

All attack data is scoped to the authenticated organization (full multi-tenancy).

---

### 🎣 Phishing Simulator

**File**: `backend/app/routers/phishing.py`

Sends real phishing emails with tracking pixels, click tracking, and credential capture.

**Key Features:**
- **Cloudflare Tunnel**: Auto-starts `cloudflared` for a public HTTPS URL so links work outside your local network.
- **Bot Detection**: Filters Outlook SafeLinks, Google, Bing, and other security scanners to prevent false positives.
- **Email Templates**: Multiple HTML phishing email templates.
- **Real-time Tracking**: WebSocket events for `opened`, `clicked`, `submitted` stages.

| Endpoint | Method | Description |
|---|---|---|
| `/phishing/send` | POST | Send phishing emails to target list (5/min rate limit) |
| `/phishing/open/{campaign_id}/{tracking_id}` | GET | 1x1 tracking pixel — records email open |
| `/phishing/click/{campaign_id}/{tracking_id}` | GET | Records click, redirects to fake login |
| `/phishing/submit/{campaign_id}` | POST | Captures credentials from fake login form |
| `/phishing/login-portal` | GET | Serves the cloned login page to targets |

---

### 🔑 Brute-Force Engine

**File**: `backend/app/routers/bruteforce.py`

Performs real SSH dictionary attacks against a target using `paramiko`.

**Key Features:**
- Runs as a **background task** — returns `200 OK` immediately, attack continues in background.
- Live attempt logs streamed via WebSocket.
- Supports custom password lists or falls back to a built-in minimal list.
- Auto-stops and reports if the target blocks connections (firewall/IDS detection).

| Endpoint | Method | Description |
|---|---|---|
| `/bruteforce/start-ssh-burst` | POST | Start an SSH brute-force attack |

**Request Body:**
```json
{
  "ip": "192.168.1.100",
  "port": 22,
  "use_custom": false,
  "custom_passwords": ["password123", "admin"]
}
```

**Default Usernames**: `admin`, `root`, `user`, `support`

---

### 💥 DDoS Engine

**File**: `backend/app/routers/ddos.py`

Simulates three types of volumetric and application-layer attacks.

| Attack Type | Protocol | Description |
|---|---|---|
| **SYN Flood** | TCP | Raw TCP SYN packets to exhaust connection tables |
| **UDP Flood** | UDP | High-volume UDP packets with optional custom payload |
| **HTTP Flood** | HTTP | Rapid GET/POST requests to a URL path |

| Endpoint | Method | Description |
|---|---|---|
| `/ddos/resolve` | GET | Resolve hostname to IP |
| `/ddos/execute` | POST | Start a DDoS attack in background |
| `/ddos/stop` | POST | Emergency stop all active attacks |

**Request Body for `/ddos/execute`:**
```json
{
  "target_ip": "192.168.1.100",
  "attack_type": "SYN Flood",
  "duration": 30,
  "port": 80,
  "threads": 4,
  "speed_delay": 0.0,
  "custom_payload": "",
  "subsite": "/",
  "wait_for_reply": false
}
```

---

### 🔍 Network Scanner

**File**: `backend/app/routers/scanner.py`

Real-time network reconnaissance using Scapy (ARP sweep) and socket-based port scanning.

| Endpoint | Method | Description |
|---|---|---|
| `/scanner/interfaces` | GET | List active network interfaces with IPs |
| `/scanner/run-scan` | GET | ARP ping sweep on a subnet |
| `/scanner/audit-target` | GET | Full port scan of a specific IP |

- **ARP Scan** requires Npcap on Windows. Falls back to simulated data if unavailable.
- **Port Audit** flags ports `21, 22, 3306, 5432, 1433` as brute-force candidates.
- Detects firewall filtering (dropped vs refused packets).

---

### 🧪 Malware Sandbox

**File**: `backend/app/routers/sandbox.py`

Upload any file and simulate detonation in an OS-specific virtual environment.

| Endpoint | Method | Description |
|---|---|---|
| `/sandbox/analyze` | POST (multipart) | Upload file and start sandbox analysis |

**Supported OS Environments:** Windows, Ubuntu, Kali Linux, macOS, Android

**Analysis Pipeline:**
1. **Static Analysis** — Real extraction of ASCII strings from binary. Flags suspicious keywords (`http`, `cmd`, `exe`, `admin`, `pass`, etc.).
2. **Dynamic Simulation** — Streams OS-specific indicators via WebSocket:
   - Process hollowing, C2 callbacks, registry persistence (Windows)
   - Privilege escalation, cron persistence, shadow file access (Linux)
   - LaunchAgent persistence, Keychain exfiltration (macOS)
   - SMS permissions, DEX payload drops (Android)

---

### 📊 Dashboard & Reporting

**File**: `backend/app/routers/dashboard.py`

| Endpoint | Method | Description |
|---|---|---|
| `/dashboard/summary` | GET | Total campaigns, events, phishing funnel stats |
| `/dashboard/timeline` | GET | Daily event counts for chart rendering |
| `/dashboard/campaigns` | GET | All campaigns for the org |
| `/dashboard/phishing/{id}/details` | GET | Per-user opened/clicked/submitted funnel |
| `/dashboard/interfaces` | GET | System network interfaces |
| `/export/...` | GET/POST | Export as PDF or Excel |

---

## 📡 API Reference

Interactive docs available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

**Authentication Header** (for protected routes):
```
Authorization: Bearer <your-jwt-token>
```

**Health Check**:
```
GET /  →  {"status": "online", "module": "IoT Guardian Pro Backend", "version": "1.0.0"}
```

---

## ⚡ WebSocket Events

Connect to: `ws://localhost:8000/ws`

Send `"ping"` → receive `"pong"` (keeps connection alive through Cloudflare tunnels).

| `type` | Emitted By | Key Fields |
|---|---|---|
| `sent` | Phishing | `email`, `tracking_id` |
| `opened` | Phishing | `email`, `tracking_id` |
| `clicked` | Phishing | `email`, `tracking_id` |
| `submitted` | Phishing | `email`, `password`, `tracking_id`, `campaign_id` |
| `execution_step` | Bruteforce, Scanner | `command`, `progress` |
| `bruteforce_attempt` | Bruteforce | `ip`, `port`, `user`, `pass`, `status` |
| `bruteforce_success` | Bruteforce | `ip`, `creds` |
| `ddos_status` | DDoS | `message`, `active` |
| `sandbox_status` | Sandbox | `active`, `message` |
| `sandbox_log` | Sandbox | `message` |

---

## 🖥️ Frontend Pages

| Route | Description | Auth Required |
|---|---|---|
| `/` | Landing / marketing page | No |
| `/org-login` | Organization login | No |
| `/register` | Organization registration | No |
| `/login` | User login | No |
| `/dashboard` | Campaign stats & charts | ✅ Yes |
| `/phishing` | Phishing campaign manager | ✅ Yes |
| `/bruteforce` | SSH brute-force console | ✅ Yes |
| `/ddos` | DDoS attack control panel | ✅ Yes |
| `/sandbox` | Malware upload & analysis | ✅ Yes |
| `/hardware` | Network interface viewer | ✅ Yes |

---

## 🔑 Key Dependencies

### Python (Backend)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | latest | Web framework + REST API |
| `uvicorn` | latest | ASGI server |
| `sqlalchemy` | latest | ORM + database |
| `pydantic` | latest | Data validation |
| `python-dotenv` | latest | Environment variables |
| `paramiko` | 3.4.0 | SSH client (brute-force) |
| `cryptography` | 42.0.5 | Cryptographic operations |
| `passlib[bcrypt]` | latest | Password hashing |
| `python-jose[cryptography]` | latest | JWT tokens |
| `psutil` | latest | Network interface info |
| `slowapi` | latest | Rate limiting |
| `reportlab` | latest | PDF report generation |
| `psycopg2-binary` | latest | PostgreSQL support |
| `python-multipart` | latest | File upload |
| `scapy` | latest | ARP scanning + raw sockets |

### JavaScript (Frontend)

| Package | Version | Purpose |
|---|---|---|
| `react` + `react-dom` | 19+ | UI framework |
| `react-router-dom` | 7+ | Client-side routing |
| `axios` | 1+ | API requests |
| `chart.js` + `react-chartjs-2` | 4+/5+ | Charts |
| `recharts` | 3+ | Additional charts |
| `lucide-react` | 1+ | Icons |
| `framer-motion` | 12+ | Animations |
| `jspdf` + `jspdf-autotable` | 4+/5+ | PDF export |
| `xlsx` | 0.18+ | Excel export |
| `tailwindcss` | 4+ | CSS framework |
| `vite` | 8+ | Build tool & dev server |

---

## 🗄️ Database

Uses **SQLite** by default — no setup needed.

**Database file**: `backend/app.db` (auto-created on first startup)

**Reset the database**:
```powershell
cd backend
.\venv\Scripts\python.exe reset_db.py
```

**Switch to PostgreSQL** — update `.env`:
```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/breach_simu
```

---

## 🛡️ Security Disclaimer

> **⚠️ FOR AUTHORIZED USE ONLY**

BreachSimu is designed for:
- Cybersecurity training and demonstrations
- Red team exercises in authorized lab environments
- Security awareness programs within your own organization

**Using BreachSimu against systems or individuals without explicit written authorization is illegal** and may violate laws including the Computer Fraud and Abuse Act (CFAA) and equivalents.

The creators assume **no liability** for unauthorized or malicious use.

---

*Built for ethical hackers and security researchers.*
