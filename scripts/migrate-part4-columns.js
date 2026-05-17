const Database = require('better-sqlite3');
const db = new Database('./dev.db');
const cols = db.prepare("PRAGMA table_info(Part4Resources)").all();
console.log('Current columns:', cols.map(c => c.name));

const names = cols.map(c => c.name);
if (!names.includes('summary')) {
  db.prepare("ALTER TABLE Part4Resources ADD COLUMN summary TEXT NOT NULL DEFAULT '{}'").run();
  console.log('Added: summary');
}
if (!names.includes('createdAt')) {
  db.prepare("ALTER TABLE Part4Resources ADD COLUMN createdAt DATETIME").run();
  console.log('Added: createdAt');
}
if (!names.includes('updatedAt')) {
  db.prepare("ALTER TABLE Part4Resources ADD COLUMN updatedAt DATETIME").run();
  console.log('Added: updatedAt');
}
db.close();
console.log('Done');
