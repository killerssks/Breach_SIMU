import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session
from fastapi import Depends

from app.core.dependencies import get_current_organization, get_db
from app.models.organization import Organization

from app.database import SessionLocal
from app.models.event import Event
from app.models.credential import Credential

router = APIRouter()

def get_full_forensic_data(campaign_id: str, current_org: Organization, db: Session):
    """
    Performs an outer join to link victim interactions with stolen credentials.
    Ensures that even if a password wasn't captured, the interaction history is preserved.
    Supports single ID, comma-separated IDs, or 'all'.
    """
    # 🟢 MULTI-TENANCY CHECK: Ensure campaign belongs to the current organization
    from app.models.campaign import Campaign
    
    if campaign_id == "all":
        campaigns = db.query(Campaign).filter(Campaign.organization_id == current_org.id).all()
    else:
        try:
            ids = [int(x.strip()) for x in campaign_id.split(",") if x.strip()]
            campaigns = db.query(Campaign).filter(Campaign.id.in_(ids), Campaign.organization_id == current_org.id).all()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid campaign ID list format.")
            
    if not campaigns:
        raise HTTPException(status_code=403, detail="Not authorized to access this campaign or campaign does not exist.")

    campaign_ids = [c.id for c in campaigns]

    # 🟢 JOIN LOGIC: Correlate Events and Credentials by email and campaign
    results = db.query(Event, Credential).outerjoin(
        Credential, 
        (Event.user_email == Credential.user_email) & (Event.campaign_id == Credential.campaign_id)
    ).filter(Event.campaign_id.in_(campaign_ids)).all()

    data = []
    for event, cred in results:
        data.append({
            "email": event.user_email,
            "status": event.event_type,
            "password": cred.captured_data if cred else "NOT_CAPTURED", # 🟢 Pulls raw password
            "ip": event.ip_address,
            "time": str(event.timestamp)
        })
    return data
 
@router.get("/{campaign_id}/json")
def export_json(campaign_id: str, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    """Returns raw campaign data as JSON"""
    return get_full_forensic_data(campaign_id, current_org, db)
 
@router.get("/{campaign_id}/html", response_class=HTMLResponse)
def export_html(campaign_id: str, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    """Generates a dynamic HTML summary of the simulation results"""
    data = get_full_forensic_data(campaign_id, current_org, db)
 
    rows = ""
    for row in data:
        rows += f"""
        <tr style="border-bottom: 1px solid #eee;">
             <td style="padding: 10px; font-family: monospace;">{row['email']}</td>
             <td style="padding: 10px;">{row['status'].upper()}</td>
             <td style="padding: 10px; color: #dc2626; font-weight: bold; font-family: monospace;">{row['password']}</td>
             <td style="padding: 10px; color: #666;">{row['ip']}</td>
             <td style="padding: 10px; font-size: 12px;">{row['time']}</td>
         </tr>
         """
 
    html = f"""
     <html>
     <head>
         <title>Forensic Exfiltration Report</title>
         <style>
             body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: white; padding: 40px; }}
             .container {{ max-width: 1000px; margin: auto; background: white; color: #1e293b; border-radius: 20px; padding: 30px; }}
             table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
             th {{ background-color: #3b82f6; color: white; padding: 15px; text-align: left; }}
             h2 {{ color: #3b82f6; margin-bottom: 5px; }}
         </style>
     </head>
     <body>
         <div class="container">
             <h2>Phishing Audit Summary</h2>
             <p style="color: #64748b; margin-bottom: 20px;">Campaign ID: {campaign_id} | BreachSimu Lab Report</p>
             <table>
                 <tr>
                     <th>Victim Email</th>
                     <th>Interaction Status</th>
                     <th>Intercepted Password</th>
                     <th>Origin IP</th>
                     <th>Timestamp</th>
                 </tr>
                 {rows}
             </table>
         </div>
     </body>
     </html>
     """
    return html

@router.get("/{campaign_id}/pdf")
def export_pdf(campaign_id: str, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    """Generates a professional forensic PDF report for the specific campaign"""
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.colors import HexColor
 
    data = get_full_forensic_data(campaign_id, current_org, db)
    
    if not data:
        raise HTTPException(status_code=404, detail="No campaign data found for this ID.")
 
    # Clean filename string
    safe_campaign_str = campaign_id.replace(",", "_")
    file_path = f"exports/Forensic_Audit_{safe_campaign_str}.pdf"
    os.makedirs("exports", exist_ok=True)

    # Theme Colors
    NAVY = HexColor('#0B132B')
    BLUE = HexColor('#1B4E8C')
    RED = HexColor('#D94040')
    LIGHT_BLUE = HexColor('#EFF6FF')
    LIGHT_GREY = HexColor('#F8FAFC')
    BORDER_GREY = HexColor('#E2E8F0')
    TEXT_MAIN = HexColor('#1E293B')

    # Custom Header/Footer decorator
    def draw_page_decorations(canvas, doc):
        # Draw text watermark in background (very light gray)
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 45)
        canvas.setFillColor(HexColor('#F8FAFC'))
        canvas.translate(297, 421) # center of A4
        canvas.rotate(35)
        canvas.drawCentredString(0, 0, "ROBLOCKSEC")
        canvas.restoreState()
        
        canvas.saveState()
        
        # Top border line & Header text - ONLY ON PAGES > 1
        if doc.page > 1:
            canvas.setStrokeColor(BLUE)
            canvas.setLineWidth(1.5)
            canvas.line(54, 785, 541, 785) # A4 width is 595, margin 54 -> 541
            
            canvas.setFont("Helvetica-Bold", 8)
            canvas.setFillColor(BLUE)
            canvas.drawString(54, 792, "SECURITY TACTICAL CONTROL CENTER // COMPLIANCE REPORT")
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(HexColor('#64748B'))
            canvas.drawRightString(541, 792, f"CAMPAIGN REF: {campaign_id}")
            
        # Bottom line & Footer - ON ALL PAGES
        canvas.setStrokeColor(BORDER_GREY)
        canvas.setLineWidth(1)
        canvas.line(54, 50, 541, 50)
        
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(HexColor('#64748B'))
        canvas.drawString(54, 40, "AUDIT ENGINE: MULTI-TENANT SPEAR-PHISHING Detonation")
        canvas.drawRightString(541, 40, f"Page {doc.page}")
        canvas.restoreState()

    # Document setup
    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    styles = getSampleStyleSheet()
    
    # Paragraph Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=NAVY,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=HexColor('#64748B'),
        spaceAfter=15
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=BLUE,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_MAIN,
        spaceAfter=6
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=TEXT_MAIN,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=5
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_MAIN
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )
    table_cell_cred = ParagraphStyle(
        'TableCellCred',
        parent=table_cell_style,
        fontName='Courier-Bold',
        textColor=RED
    )

    story = []

    # Logo header ONLY on first page
    logo_style = ParagraphStyle(
        'DocLogo',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=HexColor('#1B4E8C'),
        spaceAfter=0
    )
    logo_sub = ParagraphStyle(
        'DocLogoSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=HexColor('#64748B'),
        spaceAfter=8
    )
    
    from reportlab.platypus import Image
    logo_img_path = "../frontend/public/logo.png"
    if os.path.exists(logo_img_path):
        logo_flowable = Image(logo_img_path, width=35, height=10)
        logo_flowable.hAlign = 'LEFT'
        
        # Place logo image and sub-header text
        logo_header_text = Paragraph("<font size='8' color='#64748B'><b>SECURE TACTICAL CONTROL CENTER // AUDIT LOG</b></font>", logo_style)
        header_table_data = [[logo_flowable, logo_header_text]]
        header_table = Table(header_table_data, colWidths=[42, 400])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
    else:
        story.append(Paragraph("SECURITY AUDIT LOG", logo_style))
        story.append(Paragraph("SECURE TACTICAL CONTROL CENTER // AUDIT LOG", logo_sub))
    story.append(Spacer(1, 10))

    # Title & Header
    report_title = "INTEGRATED PHISHING AUDIT REPORT" if campaign_id == "all" or "," in campaign_id else "FORENSIC SIMULATION AUDIT REPORT"
    scope_lbl = "ALL CAMPAIGNS" if campaign_id == "all" else f"CAMPAIGN(S): {campaign_id}"
    story.append(Paragraph(report_title, title_style))
    story.append(Paragraph(f"GENERATE TIME: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | TARGET ORG: {current_org.name.upper()} | SCOPE: {scope_lbl}", subtitle_style))
    story.append(Spacer(1, 10))

    # Campaign Metadata Stats
    clicked_count = sum(1 for r in data if r['status'] in ('click', 'submit'))
    submitted_count = sum(1 for r in data if r['password'] != "NOT_CAPTURED")
    total_targets = len(data)
    click_pct = (clicked_count / total_targets * 100) if total_targets else 0
    submit_pct = (submitted_count / total_targets * 100) if total_targets else 0

    # 🟢 DYNAMIC SECURITY SCORE & LEVEL CALCULATION
    from app.websocket.manager import manager
    
    sandbox_count = getattr(manager, "sandbox_events_count", 0)
    bruteforce_count = getattr(manager, "bruteforce_events_count", 0)
    ddos_count = getattr(manager, "ddos_packets_count", 0)
    scanner_count = getattr(manager, "scanner_events_count", 0)
    
    deductions = 0.0

    # 1. Phishing impact (up to 40 points)
    if total_targets > 0:
        deductions += (submit_pct * 0.3)  # Max 30 points
        deductions += (click_pct * 0.1)   # Max 10 points

    # 2. Bruteforce impact (up to 20 points)
    bruteforce_compromised = any("[CRITICAL] Credentials found!" in log for log in getattr(manager, "log_history", []))
    if bruteforce_compromised:
        deductions += 15.0
    else:
        deductions += min(bruteforce_count * 0.2, 5.0)

    # 3. Sandbox detonation risk (up to 20 points)
    deductions += min(sandbox_count * 4.0, 20.0)

    # 4. DDoS vulnerability (up to 10 points)
    if ddos_count > 0:
        deductions += min(ddos_count / 50000.0, 10.0)

    # 5. Network scanning exposure (up to 10 points)
    deductions += min(scanner_count * 2.0, 10.0)

    security_score = max(100.0 - deductions, 0.0)

    if security_score >= 85:
        security_level = "EXCELLENT"
        security_color = HexColor('#10B981')  # Emerald
        security_bg = HexColor('#ECFDF5')
    elif security_score >= 70:
        security_level = "GOOD"
        security_color = HexColor('#3B82F6')  # Blue
        security_bg = HexColor('#EFF6FF')
    elif security_score >= 50:
        security_level = "FAIR"
        security_color = HexColor('#EAB308')  # Yellow
        security_bg = HexColor('#FEFCE8')
    elif security_score >= 30:
        security_level = "POOR"
        security_color = HexColor('#F97316')  # Orange
        security_bg = HexColor('#FFF7ED')
    else:
        security_level = "CRITICAL"
        security_color = HexColor('#D94040')  # Red
        security_bg = HexColor('#FEF2F2')

    # Executive Summary Box with Risk Badge
    summary_text = (
        "<b>EXECUTIVE ASSESSMENT & INTEGRATED AUDIT FINDINGS:</b><br/>"
        f"This security audit details victim interaction logs from Phishing Campaign <b>#{campaign_id}</b> along with "
        "integrated telemetry data collected across all detonated threat vectors (Bruteforce, Sandbox malware analysis, "
        "DDoS stressing, and Port scanning). The overall organization security level has been computed based on vulnerability exposure."
    )
    threat_text = (
        f"<font size='9' color='{security_color}'><b>{security_level} LEVEL</b></font><br/>"
        f"<font size='22' color='#0B132B'><b>{security_score:.1f}</b></font><br/>"
        f"<font size='7' color='#64748B'><b>Security Score / 100</b></font>"
    )
    
    threat_style = ParagraphStyle('ThreatText', parent=styles['Normal'], alignment=1, fontName='Helvetica-Bold', leading=12)
    summary_table = Table([[Paragraph(summary_text, body_style), Paragraph(threat_text, threat_style)]], colWidths=[370, 134])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), security_bg),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('LINELEFT', (0,0), (0,-1), 3.5, security_color),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_GREY),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))

    # Metric Panels
    stats_cell_style = ParagraphStyle('StatsCell', parent=styles['Normal'], fontName='Helvetica-Bold', alignment=1, leading=14)
    stats_data = [
        [
            Paragraph(f"<font size='8' color='#64748B'>TOTAL TARGETS</font><br/><font size='14' color='#0B132B'><b>{total_targets}</b></font>", stats_cell_style),
            Paragraph(f"<font size='8' color='#64748B'>CLICK-THROUGH RATE</font><br/><font size='14' color='#0B132B'><b>{click_pct:.1f}%</b></font>", stats_cell_style),
            Paragraph(f"<font size='8' color='#64748B'>CREDENTIAL HARVEST</font><br/><font size='14' color='#0B132B'><b>{submit_pct:.1f}%</b></font>", stats_cell_style)
        ]
    ]
    stats_table = Table(stats_data, colWidths=[168, 168, 168])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GREY),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_GREY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GREY),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 15))

    # 🟢 Integrated Dashboard Execution Summary Section
    story.append(Paragraph("INTEGRATED MULTI-VECTOR SIMULATION METRICS", h2_style))
    story.append(Spacer(1, 4))
    
    # Executions table headers
    exec_headers = [
        Paragraph("<b>SIMULATION VECTOR</b>", table_cell_bold),
        Paragraph("<b>EXPLOITATION PROFILE</b>", table_cell_bold),
        Paragraph("<b>ACTIVITY COUNT</b>", table_cell_bold),
        Paragraph("<b>VULNERABILITY RATING</b>", table_cell_bold),
    ]
    
    # Calculate vulnerability ratings
    phish_vuln = "CRITICAL" if submit_pct > 50 else "HIGH" if submit_pct > 20 else "MEDIUM" if submit_pct > 0 else "LOW"
    scan_vuln = "MEDIUM" if scanner_count > 0 else "LOW"
    bf_vuln = "CRITICAL" if bruteforce_compromised else "HIGH" if bruteforce_count > 10 else "MEDIUM" if bruteforce_count > 0 else "LOW"
    sand_vuln = "CRITICAL" if sandbox_count > 2 else "HIGH" if sandbox_count > 0 else "LOW"
    ddos_vuln = "HIGH" if ddos_count > 1000 else "MEDIUM" if ddos_count > 0 else "LOW"

    exec_rows = [
        exec_headers,
        [
            Paragraph("Social Engineering Phishing", table_cell_style),
            Paragraph("Email Target Credential Harvest", table_cell_style),
            Paragraph(f"{total_targets} Targets Engaged", table_cell_style),
            Paragraph(phish_vuln, table_cell_bold),
        ],
        [
            Paragraph("Subnet Port Scanning", table_cell_style),
            Paragraph("Active Network Probe Sweeps", table_cell_style),
            Paragraph(f"{scanner_count} Queries Executed", table_cell_style),
            Paragraph(scan_vuln, table_cell_bold),
        ],
        [
            Paragraph("Administrative Bruteforce", table_cell_style),
            Paragraph("SSH/DB Dictionary Exploits", table_cell_style),
            Paragraph(f"{bruteforce_count} Attempts Checked", table_cell_style),
            Paragraph(bf_vuln, table_cell_bold),
        ],
        [
            Paragraph("Malware Sandbox Detonation", table_cell_style),
            Paragraph("Behavioral Guest VM Detonation", table_cell_style),
            Paragraph(f"{sandbox_count} Binaries Detonated", table_cell_style),
            Paragraph(sand_vuln, table_cell_bold),
        ],
        [
            Paragraph("Volumetric DDoS Stressor", table_cell_style),
            Paragraph("Distributed Packet Stress Testing", table_cell_style),
            Paragraph(f"{ddos_count:,} Flood Packets", table_cell_style),
            Paragraph(ddos_vuln, table_cell_bold),
        ]
    ]

    exec_table = Table(exec_rows, colWidths=[140, 150, 114, 100])
    
    # Apply style to executions table
    exec_table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GREY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ])
    
    exec_ratings = [phish_vuln, scan_vuln, bf_vuln, sand_vuln, ddos_vuln]
    for idx in range(1, len(exec_rows)):
        if idx % 2 == 0:
            exec_table_style.add('BACKGROUND', (0, idx), (-1, idx), LIGHT_GREY)
        # Apply coloring to risk level cells
        risk_lvl = exec_ratings[idx - 1]
        if risk_lvl == "CRITICAL":
            exec_table_style.add('TEXTCOLOR', (3, idx), (3, idx), HexColor('#D94040'))
        elif risk_lvl in ("HIGH", "MEDIUM"):
            exec_table_style.add('TEXTCOLOR', (3, idx), (3, idx), HexColor('#F97316'))
        elif risk_lvl == "LOW":
            exec_table_style.add('TEXTCOLOR', (3, idx), (3, idx), HexColor('#10B981'))

    exec_table.setStyle(exec_table_style)
    story.append(exec_table)
    story.append(Spacer(1, 15))

    # Forensic Table Section
    story.append(Paragraph("TACTICAL DETONATION FORENSICS", h2_style))
    
    # Headers
    headers = [
        Paragraph("<b>TARGET IDENTITY</b>", table_cell_bold),
        Paragraph("<b>EVENT STATUS</b>", table_cell_bold),
        Paragraph("<b>STOLEN DATA</b>", table_cell_bold),
        Paragraph("<b>ORIGIN IP</b>", table_cell_bold),
        Paragraph("<b>TIMESTAMP</b>", table_cell_bold)
    ]
    table_rows = [headers]

    # Rows
    for row in data:
      email_p = Paragraph(row['email'], table_cell_style)
      status_p = Paragraph(row['status'].upper(), table_cell_bold if row['status'] == 'submit' else table_cell_style)
      
      # Color Captured Data
      if row['password'] != "NOT_CAPTURED":
          pass_p = Paragraph(row['password'], table_cell_cred)
      else:
          pass_p = Paragraph("<i>NOT CAPTURED</i>", table_cell_style)
          
      ip_p = Paragraph(row['ip'], table_cell_style)
      time_p = Paragraph(row['time'].split('.')[0] if '.' in row['time'] else row['time'], table_cell_style)
      
      table_rows.append([email_p, status_p, pass_p, ip_p, time_p])

    forensic_table = Table(table_rows, colWidths=[130, 80, 110, 84, 100])
    
    # Table Styling
    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GREY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ])
    
    # Alternating row color
    for idx in range(1, len(table_rows)):
        if idx % 2 == 0:
            table_style.add('BACKGROUND', (0, idx), (-1, idx), LIGHT_GREY)
            
    forensic_table.setStyle(table_style)
    story.append(forensic_table)
    story.append(Spacer(1, 15))



    # Build PDF
    doc.build(story, onFirstPage=draw_page_decorations, onLaterPages=draw_page_decorations)
    org_name = current_org.name.replace(" ", "_").lower()
    return FileResponse(file_path, filename=f"roblocksec_phishing_{org_name}_campaign_{campaign_id}.pdf")

@router.get("/{campaign_id}/csv")
def export_csv(campaign_id: str, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    """Generates a raw forensic CSV log file of the simulation results"""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    data = get_full_forensic_data(campaign_id, current_org, db)
    if not data:
        raise HTTPException(status_code=404, detail="No campaign data found for this ID.")

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write CSV Header
    writer.writerow(["Target Email", "Engagement Status", "Stolen Credentials", "Origin IP Address", "Timestamp"])
    
    # Write Data
    for row in data:
        writer.writerow([row['email'], row['status'].upper(), row['password'], row['ip'], row['time']])
        
    output.seek(0)
    org_name = current_org.name.replace(" ", "_").lower()
    safe_campaign_str = campaign_id.replace(",", "_")
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=roblocksec_phishing_{org_name}_campaign_{safe_campaign_str}.csv"}
    )