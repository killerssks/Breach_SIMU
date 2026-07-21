import React, { useEffect, useState } from 'react';
import { Shield, Zap, Lock, Terminal, Activity, Server, Radar, Eye, Cpu, Key, Bug, Network, Database, Code } from 'lucide-react';

function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className="bg-grid"></div>
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>
      <div className="glow-orb glow-orb-3"></div>

      <nav style={{ background: scrolled ? 'rgba(10, 10, 15, 0.9)' : 'rgba(10, 10, 15, 0.5)' }}>
        <div className="brand">
          <Shield size={28} color="#00ffaa" />
          BreachSimu
        </div>
        <div className="nav-links">
          <a href="#features">Platform</a>
          <a href="#modules">Modules</a>
          <a href="#about">Architecture</a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="badge">Next-Gen Security Emulation</div>
          <h1>
            Professional Multi-Tenant <br />
            <span>Breach Platform</span>
          </h1>
          <p>
            An elite, real-time analytics suite for advanced threat simulation. 
            Test your defenses with high-fidelity Bruteforce, Phishing, Sandbox, and Hardware Lab modules.
          </p>
          <div className="hero-btns">
            <a href="#features" className="btn-primary btn-large" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Explore Platform</a>
            <a href="#about" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>View Architecture</a>
          </div>
        </section>

        <section id="features" className="features">
          <div className="section-header">
            <h2 className="section-title">Command Center Capabilities</h2>
            <p className="section-subtitle">A unified nexus for real-time threat analysis and platform orchestration.</p>
          </div>
          <div className="grid">
            <div className="card">
              <div className="icon-wrapper">
                <Activity size={32} />
              </div>
              <h3>Unified Telemetry</h3>
              <p>
                Synchronized WebSocket-driven analytics stream in real-time, parsing disparate log sources into a unified matrix.
                Consolidates network, application, and physical layer events into a single pane of glass.
              </p>
            </div>
            
            <div className="card">
              <div className="icon-wrapper">
                <Radar size={32} />
              </div>
              <h3>Dynamic Threat Assessment</h3>
              <p>
                Advanced data visualizations including interactive Radar, Donut, and Cartesian charts.
                Predictive risk scoring and zero-day probability analytics mapped directly to the MITRE ATT&CK framework.
              </p>
            </div>

            <div className="card">
              <div className="icon-wrapper">
                <Shield size={32} />
              </div>
              <h3>Multi-Tenant Isolation</h3>
              <p>
                Robust backend architecture ensuring absolute cross-tenant data isolation via cryptographic boundaries.
                Execute safely scaled simulations with dedicated microservice namespaces without data pollution.
              </p>
            </div>
            
            <div className="card">
              <div className="icon-wrapper">
                <Eye size={32} />
              </div>
              <h3>Comprehensive Auditing</h3>
              <p>
                Immutable audit logs of all executed payloads, successful breaches, and systemic vulnerabilities.
                Auto-generated compliance reports detailing simulation execution parameters and platform outcomes.
              </p>
            </div>
          </div>
        </section>

        <section id="modules" className="features">
          <div className="section-header">
            <h2 className="section-title">Attack Simulation Modules</h2>
            <p className="section-subtitle">High-fidelity emulations spanning physical, network, and application layers.</p>
          </div>
          <div className="grid">
            <div className="card">
              <div className="icon-wrapper">
                <Cpu size={32} />
              </div>
              <h3>Hardware Emulation Lab</h3>
              <p>
                Deploy sophisticated physical layer attacks utilizing HID (Human Interface Device) spoofing.
                Includes BadUSB payload delivery alongside Proxmark3-based RFID cloning and skimming simulations.
              </p>
            </div>

            <div className="card">
              <div className="icon-wrapper">
                <Key size={32} />
              </div>
              <h3>Phishing & Bruteforce</h3>
              <p>
                Execute high-velocity, distributed credential stuffing attacks to test rate limiting.
                Deploy targeted spear-phishing campaigns with AI templates to evaluate MFA bypass capabilities.
              </p>
            </div>
            
            <div className="card">
              <div className="icon-wrapper">
                <Bug size={32} />
              </div>
              <h3>Malware Detonation Sandbox</h3>
              <p>
                Safely detonate polymorphic payloads in a heavily instrumented, isolated detonation chamber.
                Monitors system-level API hooking, automated memory forensics, and anomalous network egress.
              </p>
            </div>

            <div className="card">
              <div className="icon-wrapper">
                <Network size={32} />
              </div>
              <h3>Network DDoS</h3>
              <p>
                Simulate volumetric, protocol, and application-layer (Layer 7) Distributed Denial of Service attacks.
                Evaluate WAF and load balancer effectiveness against HTTP Floods, Slowloris, and dynamic IP rotation.
              </p>
            </div>
          </div>
        </section>

        <section id="about" className="features">
          <div className="section-header">
            <h2 className="section-title">System Architecture</h2>
            <p className="section-subtitle">Enterprise-grade infrastructure built for absolute performance and reliability.</p>
          </div>
          <div className="grid">
            <div className="card">
              <div className="icon-wrapper">
                <Terminal size={32} />
              </div>
              <h3>High-Performance API</h3>
              <p>
                Powered by FastAPI and Python 3.11, delivering sub-millisecond response times utilizing asynchronous IO.
                Custom middleware handles massive concurrent connection scaling and strict rate-limiting.
              </p>
            </div>

            <div className="card">
              <div className="icon-wrapper">
                <Zap size={32} />
              </div>
              <h3>Event-Driven Telemetry</h3>
              <p>
                Bi-directional WebSockets combined with a Redis Pub/Sub backplane ensure live telemetry updates.
                Eliminates polling overhead, pushing critical breach events to the command center in under 50ms.
              </p>
            </div>
            
            <div className="card">
              <div className="icon-wrapper">
                <Database size={32} />
              </div>
              <h3>Persistent Data Layer</h3>
              <p>
                Enterprise-grade PostgreSQL deployment handling multi-tenant time-series metrics seamlessly.
                SQLAlchemy ORM ensures safe, parameterized queries with integrated connection pooling for high availability.
              </p>
            </div>

            <div className="card">
              <div className="icon-wrapper">
                <Code size={32} />
              </div>
              <h3>React Glassmorphism Engine</h3>
              <p>
                State-of-the-art frontend utilizing Vite, React 18, and a custom CSS glassmorphism design system.
                Features Recharts for 60FPS fluid data visualization and a highly responsive, premium analytic aesthetic.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; {new Date().getFullYear()} BreachSimu Enterprise. All rights reserved. Not linked to actual dashboard.</p>
      </footer>
    </>
  );
}

export default App;
