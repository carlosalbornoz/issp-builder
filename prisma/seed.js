// Seed script — National Commission on Waiting Time Reduction (NCWTR)
// A fictitious-but-plausible Philippine NGA whose mandate is to reduce government
// queuing times… despite having the longest queues in the Metro.
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");

const db = new Database("dev.db");

function cuid() {
  return "c" + randomBytes(11).toString("hex");
}

// ─── JSON helpers ──────────────────────────────────────────────────────────────
const j = (v) => JSON.stringify(v);

async function main() {
  // ── Wipe previous seed data cleanly ─────────────────────────────────────────
  db.exec(`
    DELETE FROM Part4Resources;
    DELETE FROM Part3Strategy;
    DELETE FROM Part2Assessment;
    DELETE FROM Part1Profile;
    DELETE FROM IsspDocument;
    DELETE FROM User;
    DELETE FROM Agency;
  `);

  // ── Agency ───────────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO Agency (id, name, acronym, type, websiteUrl, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(
    "agency-ncwtr",
    "National Commission on Waiting Time Reduction",
    "NCWTR",
    "NGA",
    "https://www.ncwtr.gov.ph"
  );

  // ── Users ────────────────────────────────────────────────────────────────────
  const pw = await bcrypt.hash("password123", 12);

  db.prepare(`
    INSERT INTO User (id, email, name, password, role, agencyId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run("user-admin", "admin@ncwtr.gov.ph", "Admin User", pw, "ADMIN", "agency-ncwtr");

  db.prepare(`
    INSERT INTO User (id, email, name, password, role, agencyId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run("user-cio", "cio@ncwtr.gov.ph", "Dir. Reginaldo T. Tambunting Jr.", pw, "CIO", "agency-ncwtr");

  db.prepare(`
    INSERT INTO User (id, email, name, password, role, agencyId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run("user-focal", "focal@ncwtr.gov.ph", "Ms. Luzviminda R. Padayao", pw, "FOCAL", "agency-ncwtr");

  // ── ISSP Document ─────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO IsspDocument (id, title, startYear, endYear, status, amendmentNumber, scope, agencyId, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    "issp-ncwtr-2026",
    "NCWTR Information Systems Strategic Plan 2026–2028",
    2026, 2028,
    "DRAFT", 0,
    "AGENCY_WITH_REGIONAL",
    "agency-ncwtr",
    "user-admin"
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PART I — AGENCY PROFILE & STRATEGIC CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════

  const orgOutcomes = [
    {
      id: "oo-1",
      name: "Reduced average citizen waiting time across all monitored government offices",
      programs: [
        "Real-time Queue Monitoring Program",
        "Citizen Satisfaction Measurement Initiative",
        "Rapid Response Intervention for High-Wait Offices"
      ]
    },
    {
      id: "oo-2",
      name: "Increased compliance rate of government agencies with NCWTR-mandated queuing standards",
      programs: [
        "Agency Compliance Audit and Rating System",
        "Queuing Standards Enforcement Program",
        "Mandatory Queuing Technology Adoption Drive"
      ]
    },
    {
      id: "oo-3",
      name: "Improved NCWTR organizational efficiency and inter-office coordination",
      programs: [
        "Internal Systems Modernization Program",
        "Regional Office Connectivity Upgrade",
        "Knowledge Management and Documentation Initiative"
      ]
    }
  ];

  const humanCapital = {
    plantilla: {
      it: { male: 12, female: 18 },
      nonIt: { male: 45, female: 78 }
    },
    contractual: {
      it: { male: 8, female: 6 },
      nonIt: { male: 15, female: 22 }
    },
    outsourced: {
      it: { male: 25, female: 18 },
      nonIt: { male: 5, female: 3 }
    }
  };

  const stakeholders = [
    {
      id: cuid(),
      name: "General Public",
      transactions: "Filing of complaints regarding excessive government waiting times; requesting queue compliance certificates",
      complexity: "Simple"
    },
    {
      id: cuid(),
      name: "National Government Agencies (NGAs)",
      transactions: "Submission of monthly queue time reports; compliance audits; receipt of improvement directives",
      complexity: "Complex"
    },
    {
      id: cuid(),
      name: "Local Government Units (LGUs)",
      transactions: "Enrollment in NCWTR monitoring program; submission of barangay-level service delivery data",
      complexity: "Complex"
    },
    {
      id: cuid(),
      name: "Anti-Red Tape Authority (ARTA)",
      transactions: "Joint policy formulation; referral of non-compliant agencies; data sharing on citizen feedback",
      complexity: "Highly Technical"
    },
    {
      id: cuid(),
      name: "Civil Service Commission (CSC)",
      transactions: "Coordination on service delivery standards; sharing of HR data; joint training programs",
      complexity: "Complex"
    },
    {
      id: cuid(),
      name: "Commission on Audit (COA)",
      transactions: "Annual audit of NCWTR operations, ICT expenditures, and fund utilization",
      complexity: "Highly Technical"
    },
    {
      id: cuid(),
      name: "Congress of the Philippines",
      transactions: "Budget deliberations; legislative oversight; submission of annual reports and performance reviews",
      complexity: "Simple"
    },
    {
      id: cuid(),
      name: "Department of Information and Communications Technology (DICT)",
      transactions: "Technical assistance for ICT projects; government cloud services; cybersecurity advisories",
      complexity: "Highly Technical"
    }
  ];

  db.prepare(`
    INSERT INTO Part1Profile (
      id, isspDocId,
      legalBasis, mandateFunction, visionStatement, missionStatement, orgOutcomes,
      cioName, cioPosition, cioUnit, cioEmail, cioContact,
      focalName, focalPosition, focalUnit, focalEmail, focalContact,
      humanCapital, stakeholders
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cuid(), "issp-ncwtr-2026",

    // legalBasis
    "Republic Act No. 12087, otherwise known as the \"Waiting Time Reduction and Queue Management Act of 2023,\" which established the National Commission on Waiting Time Reduction (NCWTR) as an attached agency of the Office of the President. The Commission draws additional authority from Republic Act No. 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018) and Executive Order No. 92, s. 2019 (Institutionalizing the Whole-of-Government Approach in the Delivery of Government Services).",

    // mandateFunction
    "The NCWTR is mandated to establish, enforce, and continuously review standards for service delivery queuing across all national government agencies, government-owned and controlled corporations, and local government units. Its primary functions include: (1) monitoring compliance with queuing time standards through its network of 17 regional offices and 82 provincial field offices; (2) conducting annual and spot-audit reviews of government service delivery efficiency; (3) issuing compliance ratings and improvement directives to non-compliant agencies; (4) receiving and resolving citizen complaints regarding excessive government waiting times; and (5) publishing quarterly national waiting time indices.\n\nNotably, the Commission's own Central Office in Quezon City holds a Platinum Irony Award (self-bestowed) for maintaining the single most efficient complaint management process for offices with slow complaint management processes.",

    // visionStatement
    "A Philippines where no Filipino citizen waits more than thirty (30) minutes for any government transaction — ideally before the year 2045, but we remain optimistic.",

    // missionStatement
    "The NCWTR is committed to monitoring, regulating, documenting, and filing comprehensive reports about the waiting times of all government offices, for the ultimate benefit of the Filipino people and the perpetual generation of actionable data that informs future monitoring, regulation, documentation, and report-filing activities.",

    // orgOutcomes
    j(orgOutcomes),

    // CIO
    "Dir. Reginaldo T. Tambunting Jr.",
    "Director IV — ICT Division",
    "Information and Communications Technology Division",
    "cio@ncwtr.gov.ph",
    "+63 2 8888 1234",

    // Focal
    "Ms. Luzviminda R. Padayao",
    "Chief Administrative Officer / ISSP Focal Person",
    "Administrative and Finance Division",
    "focal@ncwtr.gov.ph",
    "+63 2 8888 5678",

    // humanCapital
    j(humanCapital),

    // stakeholders
    j(stakeholders)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PART II — CURRENT ICT ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const strategicConcerns = [
    {
      id: cuid(),
      outcomeIds: ["oo-1"],
      criticalSystem: "National Queue Monitoring System (NQMS)",
      concern: "The NQMS, built on Visual Basic 6 in 2009 and running exclusively on three Windows XP computers in the Monitoring Division, requires manual data entry from 847 monitored agencies. Each agency submits a monthly Excel file via email attachment, which NCWTR staff then re-encodes by hand into NQMS. Processing the monthly national report takes approximately three weeks, meaning the data published in any given month is already outdated. The system crashes an average of 4.7 times per week, with the last full system restoration requiring 11 working days, three printed manuals, and a retired contractor who was contacted through his nephew.",
      currentStrategy: "",
      desiredStrategy: "Develop and deploy a cloud-based Unified Queue Monitoring Platform (UQMP) with a RESTful API for direct data submission by monitored agencies, real-time dashboards, automated report generation, and a mobile app for field validation officers — eliminating the need for manual re-encoding and the three Windows XP computers."
    },
    {
      id: cuid(),
      outcomeIds: ["oo-1"],
      criticalSystem: "Electronic Complaints Logging and Archival System (eCLAS)",
      concern: "Despite its optimistic name, eCLAS's primary input mechanism remains a fax machine — specifically, the only functioning fax machine in the NCR, which is shared with three other divisions and also used to order office supplies. Citizens who wish to file a complaint must download a PDF from the NCWTR website, print it, fill it out in triplicate (blue ink only), and mail or personally deliver it to the Central Office. Walk-in complainants join a queue — average wait time: 47 minutes — to file complaints about excessive government waiting times. Online complaint submission was proposed in 2018, funded in 2020, procured in 2021, and is currently in User Acceptance Testing.",
      currentStrategy: "",
      desiredStrategy: "Launch the Citizen Feedback and Complaints Portal (CFCP) — a web and mobile platform allowing citizens to file complaints, track status in real time, and receive SMS notifications. Integration with UQMP will enable automatic cross-referencing of complaints against monitored agency queue data."
    },
    {
      id: cuid(),
      outcomeIds: ["oo-2"],
      criticalSystem: "Regional Compliance Tracking (manual — per regional office)",
      concern: "Each of the 17 regional offices maintains its own compliance tracking system, which in practice means 17 different Excel workbook formats, 17 different naming conventions, and 17 different definitions of 'compliant.' One regional office (not to be named, but located in a province starting with 'P') tracks compliance using a physical corkboard with color-coded index cards. Consolidating regional reports for the monthly national compliance index requires a dedicated staff member to manually reconcile data formats — a process that takes four days and results in an average of 23 conflicting data points per report.",
      currentStrategy: "",
      desiredStrategy: "Deploy the Regional Compliance Module of the UQMP, with standardized data fields, automated roll-up to the national dashboard, and mandatory digital submission replacing the corkboard system."
    },
    {
      id: cuid(),
      outcomeIds: ["oo-3"],
      criticalSystem: "Agency Human Resources Information System (AHRIS — 47 Excel Workbooks)",
      concern: "NCWTR's human resources data resides in a collection of 47 Microsoft Excel workbooks, the oldest dating to 2009 (Excel 2003 format, requiring a compatibility pack). The workbooks are stored on a shared network drive accessible only from the Central Office, making remote HR management impossible for all 17 regional offices. Employee records for three staff members hired between 2020 and 2022 were found in a folder labelled 'TEMPORARY — DO NOT DELETE' on a USB flash drive discovered in a desk drawer during an office clean-up drive. Three knowledge-transfer attempts have failed — the most recent trainee resigned mid-handover.",
      currentStrategy: "",
      desiredStrategy: "Procure and configure a modern, cloud-based Human Resources Information System (iHRPS) integrated with CSC's HRMIS and DBM's eBudget systems, accessible to all regional and field offices."
    }
  ];

  const networkDescription = `The NCWTR operates a deeply fragmented network infrastructure, inherited largely from its predecessor agency — the Presidential Committee on Queuing Excellence (PCQE), dissolved in 2018 after a 6-month queue formed at its building entrance.

CENTRAL OFFICE (Quezon City): Connected via 1 Gbps fiber leased from a telecommunications provider. Hosts an on-premise server room containing four physical servers: two running Windows Server 2012 R2 ("Production" and "Production-Backup," which has never been tested), one dedicated to the NQMS database, and one that has been "under scheduled maintenance" since March 2022. There is no disaster recovery site. The server room door bears a laminated sign: "DO NOT ENTER unless you have filed Form NCWTR-IT-003-B (Rev. 2016) and obtained two signatures from the Division Chief."

REGIONAL OFFICES (17 total): 5 regional offices have fiber connections ranging from 50–100 Mbps (NCR, Region III, Region VII, Region XI, and the one that submitted its connectivity upgrade request in the correct format). 9 regional offices operate on DSL connections at 5–10 Mbps — sufficient for email and not much else. 3 regional offices in geographically isolated areas share a single LTE pocket WiFi device among all staff, rotating custody based on who has the most urgent task.

PROVINCIAL FIELD OFFICES (82 total): Access the NCWTR intranet via VPN tunnel routed through their regional office connection, resulting in effective speeds that make printing and faxing documents measurably faster than uploading them. File transfers of the monthly compliance report (average size: 4.2 MB) have been observed to take up to 25 minutes.

INTERNAL NETWORK: The Central Office LAN uses a mix of Cat5e and Cat6 cabling installed at different points between 2008 and 2019. Network documentation exists in a hand-drawn diagram on Manila paper, last updated in 2017, now laminated and kept in the property officer's cabinet "for safekeeping."`;

  const cybersecurityControls = {
    physical: {
      perimeterProtection: true,
      accessControl: true,
      surveillance: true,
      detection: false
    },
    perimeter: {
      ngfw: true,
      idsIps: false,
      waf: false,
      dmz: false
    },
    network: {
      dataEncryption: false,
      networkSegmentation: false
    },
    endpoint: {
      antivirus: true,
      appControl: false,
      byod: false,
      xdr: false
    },
    data: {
      dataClassification: false,
      dlp: false,
      backupRecovery: true
    },
    application: {
      securityScanning: false
    },
    other: {
      vulnAssessment: false,
      patchMgmt: true,
      strongPasswords: true,
      mfa: false,
      accessReviews: false,
      securityLogs: true,
      logAnalysis: false,
      incidentResponse: false,
      siem: false,
      penTesting: false,
      secureSdlc: false
    }
  };

  const informationSystems = [
    {
      id: "is-nqms",
      name: "National Queue Monitoring System (NQMS)",
      classification: "Operations Support System",
      frontline: false,
      deploymentType: "On-Premise",
      url: "",
      description: "The agency's flagship monitoring system, accepting manually re-encoded queue time data from 847 monitored agencies. Built on Visual Basic 6 with an MS Access 2007 backend. Operational on three Windows XP computers, each named NQMS-PC-1, NQMS-PC-2, and NQMS-PC-2-BACKUP (the distinction between the last two remains unclear). Last updated in 2014 when a consultant added a 'Print Report' button. Holds a special place in NCWTR institutional memory as the cause of the Great Data Loss of 2021, when a routine 'restart to apply updates' triggered an irreversible cascade that was resolved by restoring a backup from 2019.",
      developmentStrategy: "In-house",
      developmentPlatform: "Visual Basic 6 / MS Access 2007",
      databaseName: "NQMS_PROD.mdb",
      dataStorage: "On-Premise",
      internalUsers: 120,
      externalUsers: 0,
      owner: "ICT Division",
      interoperability: {
        hasInteroperability: false,
        systems: []
      },
      pia: {
        processesPersonalInfo: false,
        piaRequired: false,
        piaConducted: false
      }
    },
    {
      id: "is-eclas",
      name: "Electronic Complaints Logging and Archival System (eCLAS)",
      classification: "Frontline Service System",
      frontline: true,
      deploymentType: "On-Premise",
      url: "https://www.ncwtr.gov.ph/complaints",
      description: "Accepts citizen complaints via fax, which are scanned, printed again for logging purposes, then re-scanned into eCLAS by a data encoder. The public-facing URL leads to a page that says 'Online complaints coming soon!' posted in 2019 alongside a stock photo of a smiling government employee. The 'Electronic' in the name refers to the computer used to view the faxes. Currently in User Acceptance Testing for its web-based upgrade — the UAT has been ongoing since Q3 2021 with 7 UAT reports generated and 0 UAT cycles completed.",
      developmentStrategy: "Off-the-Shelf (Modified)",
      developmentPlatform: "PHP 5.6 / MySQL 5.1",
      databaseName: "eclas_db",
      dataStorage: "On-Premise",
      internalUsers: 45,
      externalUsers: 12,
      owner: "Complaints Management Division",
      interoperability: {
        hasInteroperability: false,
        systems: []
      },
      pia: {
        processesPersonalInfo: true,
        piaRequired: true,
        piaConducted: false
      }
    },
    {
      id: "is-roms",
      name: "Regional Office Management System (ROMS)",
      classification: "Administrative System",
      frontline: false,
      deploymentType: "On-Premise",
      url: "",
      description: "Seventeen separate ROMS instances — one per regional office — deployed between 2013 and 2020, each customized by different contractors using different technology stacks. ROMS-NCR (ASP Classic), ROMS-CAR (PHP/MySQL), ROMS-R3 (VB.NET/SQL Server Express), and so on. None can communicate with any other, nor with the Central Office. Attempts to standardize have failed three times, once resulting in an emergency ROMS-R11 restoration that took six working days. The regional offices refer to data consolidation as 'the reconciliation,' spoken in hushed tones.",
      developmentStrategy: "Outsourced",
      developmentPlatform: "Mixed (ASP Classic / PHP / VB.NET per region)",
      databaseName: "roms_[region] (17 separate databases)",
      dataStorage: "On-Premise (per regional office)",
      internalUsers: 136,
      externalUsers: 0,
      owner: "Regional Offices (decentralized)",
      interoperability: {
        hasInteroperability: false,
        systems: []
      },
      pia: {
        processesPersonalInfo: false,
        piaRequired: false,
        piaConducted: false
      }
    },
    {
      id: "is-ahris",
      name: "Agency Human Resources Information System (AHRIS)",
      classification: "Administrative System",
      frontline: false,
      deploymentType: "Local Network",
      url: "",
      description: "Technically 47 Microsoft Excel workbooks in a shared folder, oldest dating to 2009 in Excel 2003 format (.xls). Named using a classification system understood by one (1) person, Ms. Leonora 'Nora' Baluyot, who has been with the agency since 2007. Ms. Baluyot has attempted to document the naming convention three times; each documentation attempt has itself been lost. The workbooks are inaccessible to the 17 regional offices, who maintain their own separate HR records in formats ranging from Excel to a printed binder labeled 'PERSONNEL' in the Cordillera Administrative Region office.",
      developmentStrategy: "In-house",
      developmentPlatform: "Microsoft Excel 2003–2019 (mixed)",
      databaseName: "N/A (47 Excel workbooks)",
      dataStorage: "Local Network (Central Office shared drive)",
      internalUsers: 8,
      externalUsers: 0,
      owner: "Human Resources Division",
      interoperability: {
        hasInteroperability: false,
        systems: []
      },
      pia: {
        processesPersonalInfo: true,
        piaRequired: true,
        piaConducted: false
      }
    }
  ];

  const egpChecklist = {
    eGovPay: {
      status: "not_utilizing",
      notes: "Assessed in 2022. Integration deferred pending procurement of a payment module for eCLAS. eCLAS procurement is pending UAT completion. UAT completion is pending budget allocation. Budget allocation is pending eCLAS procurement."
    },
    pnpki: {
      status: "proposed",
      adoptionPercentage: 15,
      notes: "Digital certificates issued for 12 senior officials. Remaining 85% of target staff are awaiting issuance pending completion of identity proofing forms (Form PNPKI-IP-001, Rev. 2020, 14 pages)."
    },
    hcmis: {
      status: "not_utilizing",
      notes: "NCWTR is registered with the CSC HRMIS but has not migrated data from AHRIS (the 47 Excel workbooks) due to concerns about data mapping complexity. A migration plan was drafted in 2023 and is under review."
    },
    ifmis: {
      status: "utilizing",
      url: "https://ifmis.dbm.gov.ph",
      notes: "Utilized for budget execution reporting. Central Office only; regional offices submit data to CO for encoding."
    },
    onlinePortal: {
      status: "utilizing",
      url: "https://www.ncwtr.gov.ph",
      channels: "Website only (desktop, no mobile optimization)",
      notes: "Website is live and contains the organizational chart, agency mandate, downloadable forms (PDF), and a 'Coming Soon' section for e-services that has been coming soon since 2019."
    },
    procurement: {
      status: "utilizing",
      url: "https://philgeps.gov.ph",
      notes: "All procurement posted on PhilGEPS. BAC secretariat manages postings manually. Agency is registered as observer in the Government Procurement Reform Act compliance program."
    },
    recordsMgmt: {
      status: "not_utilizing",
      notes: "Records management is conducted through a combination of physical filing cabinets (6 four-drawer units in Central Office, described internally as 'the traditional cloud'), a shared network drive with no version control, and institutional memory. Transition to eDMS proposed for 2026."
    },
    pscp: {
      status: "not_utilizing",
      notes: "NCWTR is a monitoring and regulatory body with no direct service delivery to the public beyond complaint processing, which is currently fax-based."
    }
  };

  db.prepare(`
    INSERT INTO Part2Assessment (
      id, isspDocId,
      strategicConcerns, networkDiagrams, networkDescription,
      cybersecurityControls, informationSystems, egpChecklist
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cuid(), "issp-ncwtr-2026",
    j(strategicConcerns),
    j([]),
    networkDescription,
    j(cybersecurityControls),
    j(informationSystems),
    j(egpChecklist)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PART III — PROPOSED ICT STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════

  const proposedCybersecControls = {
    physical: { perimeterProtection: true, accessControl: true, surveillance: true, detection: true },
    perimeter: { ngfw: true, idsIps: true, waf: true, dmz: true },
    network: { dataEncryption: true, networkSegmentation: true },
    endpoint: { antivirus: true, appControl: true, byod: true, xdr: false },
    data: { dataClassification: true, dlp: true, backupRecovery: true },
    application: { securityScanning: true },
    other: {
      vulnAssessment: true, patchMgmt: true, strongPasswords: true,
      mfa: true, accessReviews: true, securityLogs: true,
      logAnalysis: true, incidentResponse: true, siem: false,
      penTesting: true, secureSdlc: true
    }
  };

  const proposedHumanCapital = [
    { position: "ICT Director IV", employmentStatus: "Plantilla", physicalCount: 1 },
    { position: "Systems Analyst III", employmentStatus: "Plantilla", physicalCount: 3 },
    { position: "Programmer III", employmentStatus: "Plantilla", physicalCount: 4 },
    { position: "Database Administrator II", employmentStatus: "Plantilla", physicalCount: 2 },
    { position: "Network Administrator II", employmentStatus: "Plantilla", physicalCount: 2 },
    { position: "Cybersecurity Officer II", employmentStatus: "Plantilla", physicalCount: 1 },
    { position: "ICT Project Management Officer I", employmentStatus: "Contractual", physicalCount: 5 },
    { position: "Regional ICT Coordinator", employmentStatus: "Contractual", physicalCount: 17 },
    { position: "Help Desk Support Specialist", employmentStatus: "Contractual", physicalCount: 8 }
  ];

  // Proposed IS ──────────────────────────────────────────────────────────────

  const proposedSystems = [
    {
      id: "ps-uqmp",
      name: "Unified Queue Monitoring Platform (UQMP)",
      classification: "Operations Support System",
      frontline: false,
      deploymentType: "Cloud-Hosted",
      status: "For Development",
      enhancementDetails: "",
      developmentStrategy: "Outsourced",
      developmentPlatform: "React / Node.js / PostgreSQL",
      databaseName: "uqmp_production",
      dataStorage: "Government Cloud (GovCloud PH)",
      internalUsers: 320,
      externalUsers: 847,
      owner: "ICT Division",
      interoperability: {
        hasInteroperability: true,
        systems: [
          { name: "Citizen Feedback and Complaints Portal (CFCP)", type: "Internal" },
          { name: "ARTA Ease of Doing Business Monitoring System", type: "External" }
        ]
      },
      pia: { processesPersonalInfo: false, piaRequired: false, piaConducted: false },
      linkedProjectId: "proj-sikap"
    },
    {
      id: "ps-cfcp",
      name: "Citizen Feedback and Complaints Portal (CFCP)",
      classification: "Frontline Service System",
      frontline: true,
      deploymentType: "Cloud-Hosted",
      status: "For Development",
      enhancementDetails: "Replaces eCLAS and the fax machine.",
      developmentStrategy: "Outsourced",
      developmentPlatform: "Next.js / Node.js / PostgreSQL",
      databaseName: "cfcp_production",
      dataStorage: "Government Cloud (GovCloud PH)",
      internalUsers: 80,
      externalUsers: 50000,
      owner: "Complaints Management Division",
      interoperability: {
        hasInteroperability: true,
        systems: [
          { name: "Unified Queue Monitoring Platform (UQMP)", type: "Internal" },
          { name: "SMS Gateway (DICT)", type: "External" }
        ]
      },
      pia: { processesPersonalInfo: true, piaRequired: true, piaConducted: false },
      linkedProjectId: "proj-sikap"
    },
    {
      id: "ps-ihrps",
      name: "Integrated Human Resources and Payroll System (iHRPS)",
      classification: "Administrative System",
      frontline: false,
      deploymentType: "Cloud-Hosted",
      status: "For Procurement",
      enhancementDetails: "Replaces 47 Excel workbooks. Will finally resolve the Mystery of the Three USB-Recovered Employee Records.",
      developmentStrategy: "Off-the-Shelf (SaaS)",
      developmentPlatform: "Government-certified HR SaaS platform",
      databaseName: "ihrps_ncwtr",
      dataStorage: "Vendor Cloud (Government-Approved)",
      internalUsers: 252,
      externalUsers: 0,
      owner: "Human Resources Division",
      interoperability: {
        hasInteroperability: true,
        systems: [
          { name: "CSC Human Resource Management Information System (HRMIS)", type: "External" },
          { name: "DBM eBudget System", type: "External" }
        ]
      },
      pia: { processesPersonalInfo: true, piaRequired: true, piaConducted: false },
      linkedProjectId: "proj-handa"
    }
  ];

  // Internal Projects ────────────────────────────────────────────────────────

  const internalProjects = [
    {
      id: "proj-sikap",
      title: "Project SIKAP — Streamlined ICT for Konsolidadong Agency Platform",
      description: "SIKAP covers the full development and deployment of the Unified Queue Monitoring Platform (UQMP) and the Citizen Feedback and Complaints Portal (CFCP). It consolidates 17 fragmented regional systems into a single cloud-hosted platform, retires the Windows XP computers, and inaugurates NCWTR's transition from fax-based public service to actual digital government.",
      objectives: "1. Retire NQMS and eCLAS legacy systems by end of 2027\n2. Onboard all 847 monitored agencies onto the UQMP API by Q4 2027\n3. Achieve 80% of citizen complaints filed via CFCP portal by end of 2028\n4. Reduce monthly national report generation time from 3 weeks to 2 hours",
      projectType: "IS-Driven",
      linkedSystemIds: ["ps-uqmp", "ps-cfcp"],
      strategicAlignment: ["E-Government Master Plan", "National Cybersecurity Plan"],
      harmonizationFramework: ["National Prioritization", "Interoperability Framework"],
      duration: "2026–2027",
      year1Deliverables: "System design and architecture finalized; API specifications published; development contract awarded; UQMP v1.0 beta released for NCR pilot; eCLAS replacement module (CFCP) launched in public beta",
      year2Deliverables: "UQMP v2.0 deployed nationally; all 17 ROMS instances decommissioned; CFCP fully operational with SMS notifications; monitored agency onboarding at 60%",
      year3Deliverables: "100% monitored agency onboarding; UQMP analytics dashboard fully operational; NQMS and Windows XP computers formally retired (ceremonial shutdown livestreamed)",
      implementingUnit: "ICT Division",
      totalProjectCost: 24500000,
      fundingSource: "General Appropriations Act (GAA)"
    },
    {
      id: "proj-bilis",
      title: "Project BILIS — Broadband Infrastructure for Linked Information Systems",
      description: "Project BILIS will upgrade internet connectivity for 12 regional offices currently on DSL (5–10 Mbps) to dedicated fiber connections of at least 100 Mbps each. The three regional offices on shared LTE pocket WiFi will receive dedicated fixed wireless broadband. All connections will be terminated on government-grade routers with failover capability.",
      objectives: "1. Upgrade 12 DSL regional offices to fiber (≥100 Mbps) by Q3 2026\n2. Provide dedicated fixed-wireless broadband to 3 geographically isolated regional offices by Q4 2026\n3. Reduce average UQMP data submission time from regional offices from 25 minutes to under 2 minutes\n4. Achieve 99.5% network uptime for regional offices in 2027 and 2028",
      projectType: "Infrastructure",
      linkedSystemIds: [],
      strategicAlignment: ["Public Investment Program", "E-Government Master Plan"],
      harmonizationFramework: ["Resource Optimization", "Scalability and Sustainability"],
      duration: "2026",
      year1Deliverables: "ISP contracts awarded; fiber installations completed in 12 regional offices; fixed wireless deployed in 3 isolated offices; all connections tested and certified",
      year2Deliverables: "Network monitoring dashboard operational; 99.5% uptime SLA compliance verified; redundant connection established for Central Office",
      year3Deliverables: "Network refresh and capacity planning assessment; options for 10 Gbps Central Office upgrade evaluated",
      implementingUnit: "ICT Division — Infrastructure and Networks Section",
      totalProjectCost: 9800000,
      fundingSource: "General Appropriations Act (GAA)"
    },
    {
      id: "proj-handa",
      title: "Project HANDA — Human Resource and Administrative Network for Departmental Automation",
      description: "Project HANDA procures, configures, and deploys the Integrated HR and Payroll System (iHRPS) for all NCWTR offices nationwide. Includes data migration from the 47 Excel workbooks (and the USB-recovered employee records), integration with CSC and DBM systems, and a 3-month change management and training program.",
      objectives: "1. Complete data migration of all 252 employee records from AHRIS to iHRPS by Q2 2026\n2. Achieve full NCWTR-wide adoption of iHRPS by Q3 2026\n3. Establish live integration with CSC HRMIS and DBM eBudget by Q4 2026\n4. Eliminate reliance on Excel workbooks for HR processes by end of 2026",
      projectType: "IS-Driven",
      linkedSystemIds: ["ps-ihrps"],
      strategicAlignment: ["Program Convergence Budgeting", "E-Government Master Plan"],
      harmonizationFramework: ["Cross-Agency Collaboration", "Scalability and Sustainability"],
      duration: "2026",
      year1Deliverables: "iHRPS vendor selected; data migration from 47 Excel workbooks completed (including recovery and verification of USB records); system deployed and Go-Live achieved; CSC and DBM integration operational",
      year2Deliverables: "iHRPS performance review; self-service HR portal rolled out to all regional offices; payroll reconciliation with DBM fully automated",
      year3Deliverables: "iHRPS optimization and feature enhancement; knowledge management documentation completed; succession plan for system administration formalized",
      implementingUnit: "Human Resources Division and ICT Division",
      totalProjectCost: 4200000,
      fundingSource: "General Appropriations Act (GAA)"
    }
  ];

  // Performance Framework ────────────────────────────────────────────────────

  const performanceFramework = {
    "proj-sikap": {
      projectTitle: "Project SIKAP — Streamlined ICT for Konsolidadong Agency Platform",
      projectType: "IS-Driven",
      rows: [
        {
          id: cuid(), hierarchy: "Intermediate Outcome",
          indicator: "% of monitored agencies submitting queue data via UQMP API (vs. email/Excel)",
          baseline: "0%", year1Target: "25%", year2Target: "60%", year3Target: "100%",
          dataCollectionMethod: "UQMP system-generated API submission logs",
          responsibility: "ICT Division / Monitoring Division"
        },
        {
          id: cuid(), hierarchy: "Immediate Outcome",
          indicator: "Monthly national queue report generation time (calendar days)",
          baseline: "21 days", year1Target: "10 days", year2Target: "3 days", year3Target: "0.08 days (2 hours)",
          dataCollectionMethod: "UQMP automated report generation timestamp logs",
          responsibility: "ICT Division"
        },
        {
          id: cuid(), hierarchy: "Output",
          indicator: "CFCP citizen complaint submissions (online vs. fax)",
          baseline: "0% online / 100% fax", year1Target: "30% online", year2Target: "65% online", year3Target: "90% online",
          dataCollectionMethod: "CFCP submission channel analytics",
          responsibility: "Complaints Management Division"
        },
        {
          id: cuid(), hierarchy: "Output",
          indicator: "Number of legacy Windows XP NQMS workstations operational",
          baseline: "3", year1Target: "3 (transition year)", year2Target: "1", year3Target: "0 (ceremonially retired)",
          dataCollectionMethod: "ICT inventory records",
          responsibility: "ICT Division"
        }
      ]
    },
    "proj-bilis": {
      projectTitle: "Project BILIS — Broadband Infrastructure for Linked Information Systems",
      projectType: "Infrastructure",
      rows: [
        {
          id: cuid(), hierarchy: "Intermediate Outcome",
          indicator: "Average internet connection speed across NCWTR regional offices (Mbps)",
          baseline: "8.3 Mbps average (5 fiber, 9 DSL 5-10 Mbps, 3 LTE ~7 Mbps)",
          year1Target: "95 Mbps", year2Target: "100 Mbps", year3Target: "100 Mbps",
          dataCollectionMethod: "Monthly network performance monitoring reports from regional offices",
          responsibility: "ICT Division — Infrastructure Section"
        },
        {
          id: cuid(), hierarchy: "Immediate Outcome",
          indicator: "UQMP data upload time per regional office (minutes)",
          baseline: "~25 minutes (DSL offices)", year1Target: "< 5 minutes", year2Target: "< 2 minutes", year3Target: "< 2 minutes",
          dataCollectionMethod: "UQMP upload telemetry logs",
          responsibility: "ICT Division"
        },
        {
          id: cuid(), hierarchy: "Output",
          indicator: "Number of regional offices with ≥100 Mbps dedicated connection",
          baseline: "5", year1Target: "17", year2Target: "17", year3Target: "17",
          dataCollectionMethod: "ISP-certified connection speed test reports",
          responsibility: "ICT Division — Infrastructure Section"
        }
      ]
    },
    "proj-handa": {
      projectTitle: "Project HANDA — Human Resource and Administrative Network for Departmental Automation",
      projectType: "IS-Driven",
      rows: [
        {
          id: cuid(), hierarchy: "Intermediate Outcome",
          indicator: "% of NCWTR employee records fully migrated and verified in iHRPS",
          baseline: "0%", year1Target: "100%", year2Target: "100%", year3Target: "100%",
          dataCollectionMethod: "iHRPS record count vs. HR Division official head count",
          responsibility: "Human Resources Division"
        },
        {
          id: cuid(), hierarchy: "Immediate Outcome",
          indicator: "Number of active Excel workbooks used for HR management",
          baseline: "47", year1Target: "0", year2Target: "0", year3Target: "0",
          dataCollectionMethod: "ICT Division quarterly systems inventory audit",
          responsibility: "ICT Division / Human Resources Division"
        },
        {
          id: cuid(), hierarchy: "Output",
          indicator: "% of regional offices with iHRPS access and active usage",
          baseline: "0%", year1Target: "100%", year2Target: "100%", year3Target: "100%",
          dataCollectionMethod: "iHRPS user activity logs per regional office",
          responsibility: "Human Resources Division"
        }
      ]
    }
  };

  db.prepare(`
    INSERT INTO Part3Strategy (
      id, isspDocId,
      proposedNetworkDesc, proposedCybersecControls,
      proposedHumanCapital, proposedSystems,
      internalProjects, crossAgencyProjects, performanceFramework
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cuid(), "issp-ncwtr-2026",
    `NCWTR's target network architecture consolidates the current 17-silo infrastructure into a unified hub-and-spoke model with the Central Office as the primary hub and each regional office as a resilient spoke. All 17 regional offices will be connected via dedicated fiber (≥100 Mbps) or fixed wireless broadband, replacing DSL and LTE connections. The Central Office will upgrade to dual 1 Gbps fiber links with automatic failover. A government cloud environment (GovCloud PH) will host UQMP and CFCP, with a secondary disaster recovery node at the DICT GovCloud DR site in Davao City — the first time NCWTR has had a disaster recovery plan that does not consist of the phrase "call the ICT Director."`,
    j(proposedCybersecControls),
    j(proposedHumanCapital),
    j(proposedSystems),
    j(internalProjects),
    j([]),
    j(performanceFramework)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PART IV — RESOURCE REQUIREMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  const lineId = () => Math.random().toString(36).slice(2, 9);

  const year1 = {
    officeProductivity: {
      capitalOutlay: [
        { id: lineId(), item: "Desktop computers (replacement — retiring XP units)", office: "ICT Division", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 25, unitCost: 45000 },
        { id: lineId(), item: "Network switches and cabling — Central Office LAN refresh", office: "ICT Division", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 380000 },
        { id: lineId(), item: "Rack-mounted UPS for server room", office: "ICT Division", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 2, unitCost: 95000 },
        { id: lineId(), item: "Enterprise antivirus and endpoint protection licenses (3-year)", office: "ICT Division", uacsCode: "5060405015", uacsLabel: "ICT Software", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 420000 }
      ],
      mooe: [
        { id: lineId(), item: "Internet subscription — Central Office (1 Gbps fiber)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 12, unitCost: 28000 },
        { id: lineId(), item: "ICT office supplies (printer cartridges, cables, peripherals)", office: "ICT Division", uacsCode: "5020301001", uacsLabel: "ICT Office Supplies Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 180000 },
        { id: lineId(), item: "ICT consultancy — UQMP requirements analysis and architecture design", office: "ICT Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 850000 }
      ]
    },
    internalProjects: {
      "proj-sikap": {
        projectTitle: "Project SIKAP — Streamlined ICT for Konsolidadong Agency Platform",
        capitalOutlay: [
          { id: lineId(), item: "UQMP and CFCP system development (outsourced — Year 1 milestone)", office: "ICT Division", uacsCode: "5060405015", uacsLabel: "ICT Software", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 9500000 }
        ],
        mooe: [
          { id: lineId(), item: "GovCloud PH hosting — UQMP/CFCP beta environment (12 months)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 12, unitCost: 45000 },
          { id: lineId(), item: "Project management — SIKAP implementation team", office: "ICT Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 480000 }
        ]
      },
      "proj-bilis": {
        projectTitle: "Project BILIS — Broadband Infrastructure for Linked Information Systems",
        capitalOutlay: [
          { id: lineId(), item: "Government-grade routers with failover — 15 regional offices", office: "ICT Division — Infrastructure Section", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 15, unitCost: 85000 },
          { id: lineId(), item: "Fixed wireless broadband equipment — 3 geographically isolated regional offices", office: "ICT Division — Infrastructure Section", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 3, unitCost: 120000 }
        ],
        mooe: [
          { id: lineId(), item: "Fiber ISP subscription — 12 regional office upgrades (100 Mbps, 12 months)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 144, unitCost: 18500 },
          { id: lineId(), item: "Fixed wireless broadband subscription — 3 isolated regional offices (12 months)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 36, unitCost: 12000 }
        ]
      },
      "proj-handa": {
        projectTitle: "Project HANDA — Human Resource and Administrative Network for Departmental Automation",
        capitalOutlay: [
          { id: lineId(), item: "iHRPS SaaS license — initial 1-year subscription (agency-wide)", office: "Human Resources Division", uacsCode: "5060405015", uacsLabel: "ICT Software", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 1200000 }
        ],
        mooe: [
          { id: lineId(), item: "Data migration consultancy — AHRIS to iHRPS (Excel workbook extraction and mapping)", office: "Human Resources Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 380000 },
          { id: lineId(), item: "ICT training — iHRPS user training for all 17 regional offices and Central Office HR staff", office: "Human Resources Division", uacsCode: "5020201001", uacsLabel: "ICT Training Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 420000 }
        ]
      }
    },
    crossAgencyProjects: {},
    continuingCosts: {
      mooe: [
        { id: lineId(), item: "Annual software maintenance — ROMS regional instances (pre-decommission)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 240000 }
      ]
    }
  };

  const year2 = {
    officeProductivity: {
      capitalOutlay: [
        { id: lineId(), item: "Laptops for field validation officers — 17 regional offices (1 each)", office: "ICT Division", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 17, unitCost: 52000 },
        { id: lineId(), item: "Central Office server decommission and disposal — Windows Server 2012 R2 units", office: "ICT Division", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 85000 }
      ],
      mooe: [
        { id: lineId(), item: "Internet subscription — Central Office (1 Gbps fiber, continued)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 12, unitCost: 28000 },
        { id: lineId(), item: "ICT office supplies", office: "ICT Division", uacsCode: "5020301001", uacsLabel: "ICT Office Supplies Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 150000 }
      ]
    },
    internalProjects: {
      "proj-sikap": {
        projectTitle: "Project SIKAP — Streamlined ICT for Konsolidadong Agency Platform",
        capitalOutlay: [
          { id: lineId(), item: "UQMP v2.0 national deployment — development completion and rollout (Year 2 milestone)", office: "ICT Division", uacsCode: "5060405015", uacsLabel: "ICT Software", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 7500000 }
        ],
        mooe: [
          { id: lineId(), item: "GovCloud PH hosting — UQMP/CFCP production environment (12 months)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 12, unitCost: 68000 },
          { id: lineId(), item: "Monitored agency onboarding support — API integration assistance (60% target)", office: "ICT Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 360000 },
          { id: lineId(), item: "CFCP SMS notification service (DICT gateway — estimated 500K SMS/year)", office: "ICT Division", uacsCode: "5020502001", uacsLabel: "Mobile", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 250000 }
        ]
      },
      "proj-bilis": {
        projectTitle: "Project BILIS — Broadband Infrastructure for Linked Information Systems",
        capitalOutlay: [],
        mooe: [
          { id: lineId(), item: "Fiber ISP subscription — 12 regional offices (100 Mbps, Year 2 full year)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 144, unitCost: 18500 },
          { id: lineId(), item: "Fixed wireless broadband — 3 isolated offices (Year 2 full year)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 36, unitCost: 12000 }
        ]
      },
      "proj-handa": {
        projectTitle: "Project HANDA — Human Resource and Administrative Network for Departmental Automation",
        capitalOutlay: [],
        mooe: [
          { id: lineId(), item: "iHRPS SaaS license — Year 2 renewal", office: "Human Resources Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 1200000 },
          { id: lineId(), item: "iHRPS self-service portal rollout — regional office training and support", office: "Human Resources Division", uacsCode: "5020201001", uacsLabel: "ICT Training Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 180000 }
        ]
      }
    },
    crossAgencyProjects: {},
    continuingCosts: {
      mooe: [
        { id: lineId(), item: "Cybersecurity vulnerability assessment — annual (Central Office and 5 pilot regional offices)", office: "ICT Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 350000 }
      ]
    }
  };

  const year3 = {
    officeProductivity: {
      capitalOutlay: [
        { id: lineId(), item: "UQMP analytics server upgrade — Central Office (dedicated on-prem analytics node)", office: "ICT Division", uacsCode: "5060405003", uacsLabel: "Information and Communication Technology Equipment", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 480000 }
      ],
      mooe: [
        { id: lineId(), item: "Internet subscription — Central Office (1 Gbps, continued)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 12, unitCost: 28000 },
        { id: lineId(), item: "ICT office supplies", office: "ICT Division", uacsCode: "5020301001", uacsLabel: "ICT Office Supplies Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 150000 }
      ]
    },
    internalProjects: {
      "proj-sikap": {
        projectTitle: "Project SIKAP — Streamlined ICT for Konsolidadong Agency Platform",
        capitalOutlay: [],
        mooe: [
          { id: lineId(), item: "GovCloud PH hosting — UQMP/CFCP production (12 months, full load)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 12, unitCost: 72000 },
          { id: lineId(), item: "UQMP system maintenance and enhancement (Year 3 — 100% agency onboarding drive)", office: "ICT Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 480000 },
          { id: lineId(), item: "Ceremonial decommissioning of NQMS and XP workstations — event logistics", office: "ICT Division", uacsCode: "5020201002", uacsLabel: "Training Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 85000 }
        ]
      },
      "proj-bilis": {
        projectTitle: "Project BILIS — Broadband Infrastructure for Linked Information Systems",
        capitalOutlay: [],
        mooe: [
          { id: lineId(), item: "Fiber ISP subscription — all 12 upgraded offices (100 Mbps, Year 3)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 144, unitCost: 18500 },
          { id: lineId(), item: "Fixed wireless broadband — 3 isolated offices (Year 3)", office: "ICT Division", uacsCode: "5020503000", uacsLabel: "Internet Subscription Expenses", fundSource: "General Appropriations Act (GAA)", qty: 36, unitCost: 12000 }
        ]
      },
      "proj-handa": {
        projectTitle: "Project HANDA — Human Resource and Administrative Network for Departmental Automation",
        capitalOutlay: [],
        mooe: [
          { id: lineId(), item: "iHRPS SaaS license — Year 3 renewal", office: "Human Resources Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 1200000 },
          { id: lineId(), item: "iHRPS system administration training — succession planning documentation", office: "Human Resources Division", uacsCode: "5020201001", uacsLabel: "ICT Training Expenses", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 120000 }
        ]
      }
    },
    crossAgencyProjects: {},
    continuingCosts: {
      mooe: [
        { id: lineId(), item: "Annual cybersecurity vulnerability assessment — all 17 regional offices", office: "ICT Division", uacsCode: "5021103001", uacsLabel: "ICT Consultancy Services", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 680000 },
        { id: lineId(), item: "CFCP SMS notification service — Year 3 (estimated 1.2M SMS)", office: "ICT Division", uacsCode: "5020502001", uacsLabel: "Mobile", fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 480000 }
      ]
    }
  };

  db.prepare(`
    INSERT INTO Part4Resources (id, isspDocId, year1, year2, year3, summary)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    cuid(), "issp-ncwtr-2026",
    j(year1), j(year2), j(year3), j({})
  );

  console.log("✅ Seed complete:");
  console.log("   Agency:  National Commission on Waiting Time Reduction (NCWTR)");
  console.log("   ISSP:    NCWTR ISSP 2026–2028 (AGENCY_WITH_REGIONAL)");
  console.log("   Users:");
  console.log("     admin@ncwtr.gov.ph  / password123  (ADMIN)");
  console.log("     cio@ncwtr.gov.ph    / password123  (CIO — Dir. Reginaldo Tambunting)");
  console.log("     focal@ncwtr.gov.ph  / password123  (FOCAL — Ms. Luzviminda Padayao)");

  db.close();
}

main().catch(console.error);
