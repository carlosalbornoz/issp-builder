const Database = require('better-sqlite3');
const db = new Database('./dev.db');

const docs = db.prepare('SELECT id FROM IsspDocument').all();
console.log('Found', docs.length, 'documents');

for (const doc of docs) {
  const p2 = db.prepare('SELECT id FROM Part2Assessment WHERE isspDocId = ?').get(doc.id);
  const p3 = db.prepare('SELECT id FROM Part3Strategy WHERE isspDocId = ?').get(doc.id);
  const p4 = db.prepare('SELECT id FROM Part4Resources WHERE isspDocId = ?').get(doc.id);
  const shortId = doc.id.slice(0, 8);

  if (!p2) {
    const id = 'cm' + Math.random().toString(36).slice(2, 20);
    db.prepare('INSERT INTO Part2Assessment (id, isspDocId) VALUES (?, ?)').run(id, doc.id);
    console.log('Created Part2 for', shortId);
  }
  if (!p3) {
    const id = 'cm' + Math.random().toString(36).slice(2, 20);
    db.prepare('INSERT INTO Part3Strategy (id, isspDocId) VALUES (?, ?)').run(id, doc.id);
    console.log('Created Part3 for', shortId);
  }
  if (!p4) {
    const id = 'cm' + Math.random().toString(36).slice(2, 20);
    db.prepare('INSERT INTO Part4Resources (id, isspDocId) VALUES (?, ?)').run(id, doc.id);
    console.log('Created Part4 for', shortId);
  }
  console.log('Doc', shortId, '- P2:', !!p2, 'P3:', !!p3, 'P4:', !!p4);
}

db.close();
console.log('Done');
