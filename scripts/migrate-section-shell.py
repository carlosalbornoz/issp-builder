"""
Migrate all remaining form files to SectionShell.
Removes the old sticky header + bottom nav; wraps body in <SectionShell>.
Run from /root/apps/issp:  python3 scripts/migrate-section-shell.py
"""

import re, sys
from pathlib import Path

SRC = Path("src/components/issp-editor")

# Each entry: (file, sectionId, title, description)
FORMS = [
    # Part I-C
    ("part1/part1-c-form.tsx", "part1/c",
     "Stakeholder Analysis",
     "List the key stakeholders of your agency and the transactions/services they use."),

    # Part II
    ("part2/part2-a-form.tsx", "part2/a",
     "Strategic Concerns",
     "Identify ICT-related concerns that affect achievement of organizational outcomes."),
    ("part2/part2-b-form.tsx", "part2/b",
     "Network & Cybersecurity",
     "Describe the current network infrastructure and cybersecurity controls in place."),
    ("part2/part2-c-form.tsx", "part2/c",
     "IS Inventory",
     "Enumerate all existing information systems maintained or used by the agency."),
    ("part2/part2-d-form.tsx", "part2/d",
     "E-Government Programs",
     "Indicate adoption status for each government-mandated e-government program."),

    # Part III
    ("part3/part3-a-form.tsx", "part3/a",
     "Proposed Infrastructure",
     "Describe the proposed network infrastructure and cybersecurity controls for the plan period."),
    ("part3/part3-b-form.tsx", "part3/b",
     "Enterprise Architecture",
     "Provide the agency\\'s target Enterprise Architecture (EA) framework and diagram."),
    ("part3/part3-c-form.tsx", "part3/c",
     "Proposed ICT Human Capital",
     "List the ICT human capital requirements needed over the plan period."),
    ("part3/part3-d-form.tsx", "part3/d",
     "Proposed Information Systems",
     "Define the proposed information systems to be developed, acquired, or enhanced. Projects are created in Part III-E."),
    ("part3/part3-f-form.tsx", "part3/f",
     "Performance Framework",
     "Define key performance indicators (KPIs) for each ICT project to track outcomes over the plan period."),

    # Part IV
    ("part4/part4-summary.tsx", "part4/summary",
     "Summary of Investments",
     "Consolidated 3-year budget view across all ICT expenditure categories."),
]

SHELL_IMPORT = 'import { SectionShell } from "@/components/editor/section-shell";'

STICKY_PAT = re.compile(
    r'\s*\{/\* (?:Page )?header \*/\}\s*'
    r'<div className="sticky top-0 z-10[^"]*"[^>]*>'
    r'.*?'
    r'</div>\s*</div>\s*',
    re.DOTALL
)

BOTTOM_NAV_PAT = re.compile(
    r'\s*\{/\* Bottom nav \*/\}\s*'
    r'<div className="flex items-center justify-between pt-4 border-t">'
    r'.*?'
    r'</div>\s*',
    re.DOTALL
)

OUTER_DIV_OPEN = '<div className="space-y-8">'
OUTER_DIV_CLOSE_MARKER = re.compile(r'</div>\s*\n\s*\);\s*\}\s*$')

def add_import(text: str, import_line: str) -> str:
    if import_line in text:
        return text
    # Insert after last import line
    lines = text.split('\n')
    last_import = max((i for i, l in enumerate(lines) if l.startswith('import ')), default=0)
    lines.insert(last_import + 1, import_line)
    return '\n'.join(lines)

def remove_router(text: str) -> str:
    # Remove 'import { useRouter } from "next/navigation";' if present
    text = re.sub(r'\nimport \{ useRouter \} from "next/navigation";\n', '\n', text)
    # Remove const router = useRouter(); inside function body
    text = re.sub(r'\n\s*const router = useRouter\(\);\n', '\n', text)
    return text

def migrate(file_rel: str, section_id: str, title: str, description: str):
    path = SRC / file_rel
    original = path.read_text()
    text = original

    # 1. Add SectionShell import
    text = add_import(text, SHELL_IMPORT)

    # 2. Remove useRouter import + usage
    text = remove_router(text)

    # 3. Remove sticky header block
    text = STICKY_PAT.sub('\n', text, count=1)

    # 4. Remove bottom nav block
    text = BOTTOM_NAV_PAT.sub('\n', text, count=1)

    # 5. Replace outer <div className="space-y-8"> with <SectionShell ...>
    shell_open = (
        f'<SectionShell\n'
        f'      sectionId="{section_id}"\n'
        f'      title="{title}"\n'
        f'      description="{description}"\n'
        f'    >'
    )
    if OUTER_DIV_OPEN in text:
        text = text.replace(OUTER_DIV_OPEN, shell_open, 1)
    else:
        print(f"  WARNING: outer div not found in {file_rel}", file=sys.stderr)

    # 6. Replace closing </div> (last one before ); }) with </SectionShell>
    # Strategy: find "    </div>\n  );\n}" at end of file
    text = re.sub(
        r'    </div>\n(\s*\);\n\})',
        r'    </SectionShell>\n\1',
        text,
        count=1
    )

    if text == original:
        print(f"  WARNING: no changes made to {file_rel}", file=sys.stderr)
        return

    path.write_text(text)
    print(f"  ✓ {file_rel}")

if __name__ == "__main__":
    print("Migrating forms to SectionShell...")
    for args in FORMS:
        migrate(*args)
    print("Done.")
