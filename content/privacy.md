---
title: "Why this tool should never see your data"
date: 2026-05-17
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

**The tool should never see your agency's data.**

Your ISSP stays on your machine, in your browser. The server's job is to serve the application — the forms, the logic, the PDF generator. That's it. It never stores anything about your agency.

In practice, this means:

- **No sign-in required.** The tool opens and you start working. No account, no email, no password.
- **Your draft lives in your browser** while you're editing it — specifically in a browser storage area called IndexedDB, which is more like a local database than a cookie. It persists across tab closes and browser restarts, as long as you don't clear your browser data.
- **You save your work as a file** on your own computer. The platform will regularly remind you to do this. The file uses a `.issp` extension (it's just JSON underneath — open it in any text editor if you want to inspect it).
- **PDF generation is the only server call.** When you're ready to produce the formal submission PDF, that document is sent to the server, rendered, and returned to you as a PDF buffer. The server processes it and immediately discards it — nothing is stored, nothing is logged beyond a standard access entry.

That's the entire data flow. Your ISSP never leaves your machine except for that one transient render call.

## What this means for compliance

This architecture dramatically changes the compliance picture.

If no personal information passes through our server (except transiently during PDF generation, and not persisted), the scope of a Privacy Impact Assessment shrinks to near-zero — we document that explicitly, and the PIA itself becomes a transparency artifact showing that we've thought carefully about this.

VAPT scope is limited to the static web server and the PDF generation endpoint. That's a far smaller attack surface than a full authenticated app with a user database. It's something I can actually get done before broadly encouraging agencies to adopt this.

NPC registration obligations are significantly reduced when you're not collecting or storing personal information.

## What this means for you, practically

The local-first version is now live. Here's what that means:

You don't need to create an account. You open the tool, answer a few setup questions (agency name, coverage period), and you're in.

You'll see an autosave indicator that says *"Draft saved in browser."* That's your working copy — it'll survive closing the tab, but it's tied to this browser on this computer.

You'll also see a **Save to File** button that downloads your ISSP as a `.issp` file. Think of it like the "Save" button in Word, except the file goes to your Downloads folder. The tool will remind you to press it periodically.

When you come back to continue your draft — maybe tomorrow, maybe from another computer — you upload that `.issp` file and pick up where you left off.

When you're done and ready to submit, you export to PDF. PDF rendering currently happens server-side because the official output needs precise page layout. That export request sends the ISSP document to the server temporarily for rendering, returns the PDF, and does not store the document.

## An invitation

This is still a work in progress, but the privacy architecture has changed in the important way: accounts and server-side document storage are gone. The remaining hardening work is around import validation, browser-storage failure handling, and the stateless PDF export endpoint.

But I wanted to write this down publicly, both as a commitment and as an invitation.

If you're a privacy officer, an ICT security specialist, or someone who works in this space — I'd genuinely welcome your input. If there are considerations I'm missing, gaps in the PIA analysis, or ways to strengthen the approach, I want to hear about them.

And if you're a government agency that wants to pilot this and help shape how it evolves — reach out.

---

*The privacy architecture notes that informed this post are available in the project's open source repository.*
