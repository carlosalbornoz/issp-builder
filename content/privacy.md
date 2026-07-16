---
title: "How this tool keeps your ISSP data private"
date: 2026-07-16
author: Carlos Antonio Albornoz
---

## The problem I didn't want to ignore

When I first built this tool, I built it the way most web apps are built: sign up, log in, data goes to a server, server stores it in a database.

It works. But the more I thought about who was actually going to use this — government ICT officers filling out strategic plans for their agencies — the more that architecture bothered me.

An ISSP isn't a grocery list. It describes your agency's systems, your security posture, your budget requests, the names of your CIO and focal persons, your infrastructure, your vendors. It's sensitive government information. And under my original design, all of it was sitting in a database on a server I control.

That's a problem I have no right to paper over.

## What the law actually requires

The Data Privacy Act (RA 10173) is clear: if you collect and store personal information, you're a Personal Information Controller, and that comes with obligations — Privacy Impact Assessments, NPC registration, security controls, breach notification procedures. These aren't checkbox exercises. They're real compliance requirements.

There's also the eGov Act IRR and its provisions on data handling, system security, and VAPT requirements for government-facing tools. Any platform meant for use by government agencies should be VAPT-tested before it's widely deployed. I haven't done that yet.

The honest answer is: I'm one person, this is a volunteer project, and trying to responsibly operate a server-side data store for dozens of government agencies while meeting all of those obligations is far more than I can reasonably commit to right now.

So I'm not going to do it.

## The better architecture: local-first

Instead, here's the direction I'm taking the platform.

**The tool should never store the contents of your ISSP.**

Your ISSP stays on your machine, in your browser. The server's main job is to serve the application — the forms, the logic, and the PDF generator. It does not store your ISSP answers, contact persons, systems, security posture, budget data, diagrams, or uploaded files.

In practice, this means:

- **No sign-in required.** The tool opens and you start working. No account, no email, no password.
- **Your draft lives in your browser** while you're editing it — specifically in a browser storage area called IndexedDB, which is more like a local database than a cookie. It persists across tab closes and browser restarts, as long as you don't clear your browser data.
- **You save your work as a file** on your own computer. The platform will regularly remind you to do this. The file uses a `.issp` extension (it's just JSON underneath — open it in any text editor if you want to inspect it).
- **PDF generation is transient.** When you're ready to produce the formal submission PDF, that document is sent to the server, rendered, and returned to you as a PDF buffer. The server processes it and immediately discards the document — its contents are not added to the usage log.
- **Limited usage analytics are recorded.** When you create a new ISSP, load a `.issp` file, or return to a draft restored from browser storage, the server records the event type, your agency name, your agency acronym, and a server-generated timestamp. This lets the maintainer see which agencies are using the builder without collecting the contents of their plans. Opening the fictitious sample is not counted.

No IP address, browser details, document title, ISSP answers, file contents, or other request metadata are intentionally added to this usage log. Standard hosting or reverse-proxy access logs may separately contain routine connection information such as an IP address and request timestamp, according to the host's logging configuration.

That is the entire application data flow: the document itself never leaves your machine except for the transient PDF render call, while the limited create/load/restore usage record described above is stored on the server.

## What this means for compliance

This architecture dramatically changes the compliance picture.

Because ISSP contents are not persisted and the usage log is deliberately limited to basic agency identity and event timing, the compliance scope remains much smaller than a system that stores complete plans or user accounts. The usage log still requires appropriate access control, retention, and disclosure, which is why it is documented here explicitly.

VAPT scope is limited to the static web server, the PDF generation endpoint, and the small usage-logging endpoint. That's a far smaller attack surface than a full authenticated app with a user database. It's something I can actually get done before broadly encouraging agencies to adopt this.

NPC registration obligations are significantly reduced when you're not collecting or storing the personal information contained in the ISSP itself.

## What this means for you, practically

When the local-first version launches, here's what changes:

You won't need to create an account. You open the tool, answer a few setup questions (agency name, coverage period), and you're in.

You'll see an autosave indicator that says *"Draft saved in browser."* That's your working copy — it'll survive closing the tab, but it's tied to this browser on this computer.

You'll also see a **Save to File** button that downloads your ISSP as a `.issp` file. Think of it like the "Save" button in Word, except the file goes to your Downloads folder. The tool will remind you to press it periodically.

When you come back to continue your draft — maybe tomorrow, maybe from the same computer — you upload that `.issp` file and pick up where you left off.

When you're done and ready to submit, you export to PDF. That's the file you send to DICT.

## An invitation

This is still a work in progress. The local-first redesign isn't complete yet — the current version still uses accounts and server-side storage, which is why I'm not yet actively encouraging other agencies to use it at scale.

But I wanted to write this down publicly, both as a commitment and as an invitation.

If you're a privacy officer, an ICT security specialist, or someone who works in this space — I'd genuinely welcome your input. If there are considerations I'm missing, gaps in the PIA analysis, or ways to strengthen the approach, I want to hear about them.

And if you're a government agency that wants to pilot this and help shape how it evolves — reach out.

---

*The privacy architecture notes that informed this post are available in the project's open source repository. This notice was updated on July 16, 2026 to document limited server-side usage analytics.*
