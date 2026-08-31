const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./shifts.db', (err) => {
  if (err) console.error('שגיאה בחיבור:', err.message);
  else {
    console.log('חיבור לבסיס הנתונים הצליח! 🗄️');
    db.run('PRAGMA foreign_keys = ON;');
  }
});

db.serialize(() => {
  // 1. יצירת טבלת ארגונים
  db.run(`CREATE TABLE IF NOT EXISTS Organizations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);

  // 2. יצירת טבלת תקופות (Periods)
  db.run(`CREATE TABLE IF NOT EXISTS Periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY(organization_id) REFERENCES Organizations(id)
  )`);

  // 3. יצירת טבלת משתמשים (Users)
  db.run(`CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    organization_id INTEGER, 
    full_name TEXT NOT NULL, 
    password TEXT NOT NULL, 
    role TEXT DEFAULT 'soldier', 
    does_shifts BOOLEAN DEFAULT 1, 
    is_active BOOLEAN DEFAULT 1,
    release_date DATE,
    potential_reduction INTEGER DEFAULT 0,
    joined_date DATE, 
    FOREIGN KEY(organization_id) REFERENCES Organizations(id)
  )`);

  db.all("PRAGMA table_info(Users)", (err, columns) => {
    const hasDivision = columns.find(col => col.name === 'division');
    if (!hasDivision) {
      db.run(`ALTER TABLE Users ADD COLUMN division TEXT DEFAULT 'לא מוגדר'`);
    }
    const hasGoogleToken = columns.find(col => col.name === 'google_refresh_token');
    if (!hasGoogleToken) {
      db.run(`ALTER TABLE Users ADD COLUMN google_refresh_token TEXT`);
    }
  });

  // 4. יצירת טבלת סוגי תורנויות
  db.run(`CREATE TABLE IF NOT EXISTS Shift_Types (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    organization_id INTEGER, 
    name TEXT NOT NULL, 
    is_weekend BOOLEAN DEFAULT 0, 
    color TEXT DEFAULT '#3174ad',
    points_base REAL DEFAULT 1.0,
    FOREIGN KEY(organization_id) REFERENCES Organizations(id)
  )`);

  // 5. יצירת טבלת תורנויות (Shifts)
  db.run(`CREATE TABLE IF NOT EXISTS Shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    organization_id INTEGER, 
    user_id INTEGER, 
    shift_type_id INTEGER, 
    start_date DATE NOT NULL, 
    end_date DATE NOT NULL, 
    is_weekend BOOLEAN DEFAULT 0, 
    is_baltam BOOLEAN DEFAULT 0, 
    notes TEXT, 
    is_published BOOLEAN DEFAULT 0, 
    group_id TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(organization_id) REFERENCES Organizations(id), 
    FOREIGN KEY(user_id) REFERENCES Users(id), 
    FOREIGN KEY(shift_type_id) REFERENCES Shift_Types(id)
  )`);

  // 6. טבלת החלפות/פטורים לתורנות
  db.run(`CREATE TABLE IF NOT EXISTS Shift_Exemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT DEFAULT 'pet', 
    start_time TEXT,
    end_time TEXT,
    FOREIGN KEY(shift_id) REFERENCES Shifts(id) ON DELETE CASCADE
  )`);

  // 7. טבלת אילוצים
  db.run(`CREATE TABLE IF NOT EXISTS Constraints (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    organization_id INTEGER, 
    user_id INTEGER, 
    start_date DATE NOT NULL, 
    end_date DATE NOT NULL, 
    reason TEXT, 
    FOREIGN KEY(organization_id) REFERENCES Organizations(id), 
    FOREIGN KEY(user_id) REFERENCES Users(id)
  )`);

  // 8. טבלת סוגי פטורים קבועים
  db.run(`CREATE TABLE IF NOT EXISTS Exemption_Types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  // 9. טבלת קשר פטורים לחייל
  db.run(`CREATE TABLE IF NOT EXISTS User_Exemptions (
    user_id INTEGER,
    exemption_type_id INTEGER,
    PRIMARY KEY (user_id, exemption_type_id),
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY(exemption_type_id) REFERENCES Exemption_Types(id) ON DELETE CASCADE
  )`);
});

module.exports = db;