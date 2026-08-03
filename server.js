// 1. ייבוא הספריות שהתקנו
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt'); // תוודאי שזה כתוב בדיוק ככה
const db = new sqlite3.Database('./shifts.db');
  const saltRounds = 10;
db.run('PRAGMA journal_mode = WAL;');

// 2. יצירת האפליקציה של השרת
const app = express();

// 3. הגדרות בסיסיות (Middlewares)
app.use(cors()); // מאפשר גישה מכתובות אחרות
app.use(express.json()); // מאפשר לשרת לקרוא נתונים שנשלחים אליו בפורמט JSON
// הוספת פונקציית העזר הגלובלית
// ווידוא יצירת טבלת Periods מיד בתחילת השרת

// 4. יצירת נתיב (Route) ראשון לדוגמה
// כשהאתר שלנו יפנה לכתובת הזו, הוא יקבל חזרה את ההודעה
app.get('/api/test', (req, res) => {
  res.json({ message: 'היי! השרת הראשון שלך עובד בהצלחה 🚀' });
});
// ==========================================

// 1. יצירת ארגון/יחידה חדשה
app.post('/api/organizations', (req, res) => {
  // אנחנו שולפות את שם היחידה מתוך המידע שנשלח בבקשה
  const { name } = req.body;

  // פקודת ה-SQL להכנסת הנתון
  const query = `INSERT INTO Organizations (name) VALUES (?)`;

  // הרצת הפקודה מול בסיס הנתונים
  db.run(query, [name], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // אם הצליח, נחזיר תשובה עם ה-ID החדש שנוצר
    res.json({ id: this.lastID, name: name, message: 'היחידה נוצרה בהצלחה! 🎉' });
  });
});
app.get('/api/squadrons-with-admin', (req, res) => {
  const query = `
        SELECT o.id, o.name, u.full_name as admin_name, u.id as admin_id
        FROM Organizations o
        LEFT JOIN Users u ON o.id = u.organization_id AND u.role = 'admin'
        GROUP BY o.id
    `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. שליפת כל הארגונים הקיימים במערכת
app.get('/api/organizations', (req, res) => {
  const query = `SELECT * FROM Organizations`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // מחזירים את כל השורות שמצאנו
    res.json({ organizations: rows });
  });
});

// 3. יצירת משתמש חדש (חייל או אחראי) תחת ארגון קיים
// הנתיב היחיד שצריך להישאר ב-server.js
app.post('/api/users', (req, res) => {
  // 1. הוספנו את ה-division לנתונים שמגיעים מהלקוח
  const { organization_id, full_name, password, role, does_shifts, is_active, release_date, potential_reduction, exemptionIds, division } = req.body;

  // התחלת Transaction - זה מונע את ה-SQLITE_BUSY
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 2. הוספנו את עמודת division לשאילתת ה-SQL
    const sql = `INSERT INTO Users (organization_id, full_name, password, role, does_shifts, is_active, release_date, potential_reduction, division, joined_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`;

    // 3. הוספנו את הערך של הdivision למערך הפרמטרים (אם ריק נשמר כ"לא מוגדר" או מה שתבחרי)
    const params = [
      organization_id, 
      full_name, 
      password, 
      role || 'soldier', 
      does_shifts ?? 1, 
      is_active ?? 1, 
      release_date || null, 
      potential_reduction || 0,
      division || 'לא מוגדר'
    ];

    db.run(sql, params, function (err) {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: err.message });
      }

      const userId = this.lastID;

      if (exemptionIds && exemptionIds.length > 0) {
        const stmt = db.prepare(`INSERT INTO User_Exemptions (user_id, exemption_type_id) VALUES (?, ?)`);
        exemptionIds.forEach(exemptionId => {
          stmt.run(userId, exemptionId);
        });
        stmt.finalize();
      }

      db.run("COMMIT", (commitErr) => {
        if (commitErr) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: commitErr.message });
        }
        res.json({ id: userId, message: 'החייל נוצר בהצלחה!' });
      });
    });
  });
});
// שימי את זה ממש אחרי הגדרת ה-app וה-db
app.put('/api/shifts/publish-range', (req, res) => {
  const { start_date, end_date } = req.body;

  db.run(
    `UPDATE Shifts SET is_published = 1 WHERE start_date >= ? AND end_date <= ?`,
    [start_date, end_date],
    function (err) {
      if (err) {
        console.error("שגיאת SQL בעדכון פרסום:", err);
        return res.status(500).json({ error: err.message });
      }
      // היתרון בנתיב הזה: הוא אומר לך בדיוק כמה תורנויות עודכנו
      res.json({ message: `הצלחה! עודכנו ${this.changes} תורנויות.` });
    }
  );
});
// 4. יצירת סוג תורנות חדש (למשל: שמירה, מטבח, סיור)
// 4. יצירת סוג תורנות חדש
app.post('/api/shift-types', (req, res) => {
  const { organization_id, name, is_weekend, color, points_base } = req.body;

  // הוספנו בדיקה לשם ריק
  if (!name) {
    return res.status(400).json({ error: "חובה להזין שם תורנות" });
  }

  const query = `INSERT INTO Shift_Types (organization_id, name, is_weekend, color, points_base) VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [organization_id, name, is_weekend, color || '#3174ad', points_base || 1.0], function (err) {
    if (err) {
      console.error("SQL Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: 'סוג תורנות נוצר!' });
  });
});

app.post('/api/setup-squadron', (req, res) => {
  const { squadronData, adminData } = req.body;
  db.run('INSERT INTO Organizations (name) VALUES (?)', [squadronData.name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const squadronId = this.lastID;
    const sql = `INSERT INTO Users (full_name, password, role, organization_id, is_active) VALUES (?, ?, ?, ?, 1)`;
    db.run(sql, [adminData.full_name, adminData.password, 'admin', squadronId], function (err) {
      if (err) {
        console.error("SQL Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ squadronId: squadronId });
    });
  });
});

app.put('/api/users/update-admin/:orgId', (req, res) => {
  const { orgId } = req.params;
  const { newAdminId } = req.body;

  // 1. קודם כל, נוריד את כל מי שהוא 'admin' בארגון הזה ל-'soldier'
  db.run("UPDATE Users SET role = 'soldier' WHERE organization_id = ?", [orgId], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // 2. עכשיו נהפוך את החייל שנבחר ל-'admin'
    db.run("UPDATE Users SET role = 'admin' WHERE id = ?", [newAdminId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'האחראי עודכן בהצלחה!' });
    });
  });
});
// --- יצירת תורנות (מעודכן עם שבת ובלת"ם) ---
// יצירת תורנות חדשה (עם תמיכה בקבוצות פיצול!)
// --- יצירת תורנות חדשה ---
app.post('/api/shifts', (req, res) => {
  const {
    organization_id, user_id, shift_type_id, start_date, end_date,
    is_weekend, is_baltam, group_id, notes // <--- הוספנו כאן notes
  } = req.body;

  const finalGroupId = group_id || `grp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // הוספנו את ה-notes לשאילתה ולפרמטרים
  const sql = `INSERT INTO Shifts (organization_id, user_id, shift_type_id, start_date, end_date, is_weekend, is_baltam, group_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [organization_id, user_id || null, shift_type_id, start_date, end_date, is_weekend ? 1 : 0, is_baltam ? 1 : 0, finalGroupId, notes];

  db.run(sql, params, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, group_id: finalGroupId, message: 'התורנות נשמרה בהצלחה!' });
  });
});
// קבלת רשימת כל הפטורים המובנים במערכת
app.get('/api/exemption-types', (req, res) => {
  db.all("SELECT * FROM Exemption_Types", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- שליפת תורנויות (קורא עכשיו את שבת ובלת"ם ישירות מהתורנות) ---
app.get('/api/shifts', (req, res) => {
  const query = `
    SELECT Shifts.*, 
           Users.full_name, 
           Shift_Types.name as type_name, 
           Shift_Types.color as type_color,
           Shifts.is_published 
    FROM Shifts
    LEFT JOIN Users ON Shifts.user_id = Users.id
    LEFT JOIN Shift_Types ON Shifts.shift_type_id = Shift_Types.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});
app.put('/api/shifts/unpublish-range', (req, res) => {
  const { start_date, end_date } = req.body;

  // השאילתה הזו מוצאת כל תורנות שההתחלה שלה בטווח
  const query = `UPDATE Shifts SET is_published = 0 WHERE start_date >= ? AND start_date <= ?`;

  db.run(query, [start_date, end_date], function (err) {
    if (err) {
      console.error("שגיאת SQL בביטול פרסום:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: `בוטל הפרסום ל-${this.changes} תורנויות.` });
  });
});
// --- עדכון תורנות קיימת ---
// --- עדכון תורנות קיימת ---
app.put('/api/shifts/:id', (req, res) => {
  const { user_id, shift_type_id, start_date, end_date, is_weekend, is_baltam, notes } = req.body; // <--- הוספנו notes

  // הוספנו notes=? לשאילתה
  const query = `UPDATE Shifts SET user_id = ?, shift_type_id = ?, start_date = ?, end_date = ?, is_weekend = ?, is_baltam = ?, notes = ? WHERE id = ?`;

  db.run(query, [user_id, shift_type_id, start_date, end_date, is_weekend ? 1 : 0, is_baltam ? 1 : 0, notes, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'התורנות עודכנה!' });
  });
});

// --- מחיקת תורנות ---
app.delete('/api/shifts/:id', (req, res) => {
  const shiftId = req.params.id;

  // מחיקת פטורים/החלפות הקשורים לתורנות קודם
  db.run(`DELETE FROM Shift_Exemptions WHERE shift_id = ?`, [shiftId], function (err) {
    if (err) {
      console.error("שגיאה במחיקת פטורים:", err.message);
      return res.status(500).json({ error: "שגיאה במחיקת פטורים" });
    }

    // מחיקת התורנות עצמה
    db.run(`DELETE FROM Shifts WHERE id = ?`, [shiftId], function (err) {
      if (err) {
        console.error("שגיאה במחיקת תורנות:", err.message);
        return res.status(500).json({ error: "שגיאה במחיקת תורנות" });
      }
      res.json({ message: 'נמחק בהצלחה!' });
    });
  });
});

// 7. שליפת כל המשתמשים (החיילים)
app.get('/api/users', (req, res) => {
  const orgId = req.query.org_id;

  if (!orgId) {
    console.log("⚠️ השרת קיבל בקשה ללא org_id!");
    return res.status(400).json({ error: "חסר מזהה טייסת" });
  }

  const orgIdInt = parseInt(orgId);

  // 🚀 כאן הסרנו את u.does_shifts = 1 כדי שהשרת יחזיר את כולם, ונתן לריאקט לסנן
  const sql = `
    SELECT u.*, GROUP_CONCAT(ue.exemption_type_id) as exemption_ids
    FROM Users u
    LEFT JOIN User_Exemptions ue ON u.id = ue.user_id
    WHERE u.organization_id = ?
    GROUP BY u.id
  `;

  db.all(sql, [orgIdInt], (err, rows) => {
    if (err) {
      console.error("❌ שגיאת SQL:", err);
      return res.status(500).json({ error: err.message });
    }

    const formattedUsers = rows.map(user => ({
      ...user,
      exemptionIds: user.exemption_ids ? user.exemption_ids.split(',').map(Number) : []
    }));

    res.json(formattedUsers);
  });
});

// 8. שליפת כל סוגי התורנויות
app.get('/api/shift-types', (req, res) => {
  const query = `SELECT * FROM Shift_Types`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows); // השורה הזו כבר מחזירה את כל העמודות, כולל ה-points_base החדש
  });
});
// 9. פרסום תורנויות (הפיכת טיוטה למפורסם)
// 9. פרסום תורנויות לפי טווח תאריכים ספציפי (מעודכן)
app.put('/api/shifts/publish', (req, res) => {
  const { start_date, end_date } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'חובה להזין טווח תאריכים מלא לפרסום!' });
  }

  // פקודת SQL שמפרסמת רק תורנויות שהן טיוטה (0) ושנמצאות בתוך טווח התאריכים שנבחר
  const query = `UPDATE Shifts SET is_published = 1 WHERE is_published = 0 AND start_date >= ? AND end_date <= ?`;

  db.run(query, [start_date, end_date], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `פורסמו ${this.changes} תורנויות בהצלחה בטווח שבין ${start_date} ל- ${end_date}! 🚀` });
  });
});
// 10. נתיב התחברות (Login)
// --- עדכון נתיב התחברות (כולל does_shifts) ---
// בנתיב ה-login שלך בשרת:
app.post('/api/login', async (req, res) => {
  const { full_name, password } = req.body;

  db.get("SELECT * FROM Users WHERE full_name = ?", [full_name], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
    }

    // כאן הקסם: השוואת הסיסמה שהוזנה מול ה-Hash שנשמר ב-DB
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      // סיסמה נכונה! מחזירים את פרטי המשתמש
      res.json({ user });
    } else {
      // סיסמה שגויה
      res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
    }
  });
});
// --- עדכון נתיב יצירת משתמש ---

// --- עדכון נתיב עריכת משתמש (כולל השדה החדש) ---
// --- עדכון חכם של משתמש (סיסמה אופציונלית) ---
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { full_name, password, release_date, potential_reduction, exemptionIds, does_shifts } = req.body;

  // 🔎 הדפסה מפורטת לטרמינל כדי לראות בדיוק מה הגיע
  console.log("🔍 נתוני עדכון שהתקבלו בשרת עבור משתמש", userId, "-> does_shifts:", does_shifts, "סוג:", typeof does_shifts);

  // וידוא שהערך הוא מספר 1 או 0 בצורה חד משמעית
  const finalDoesShifts = (does_shifts === 1 || does_shifts === true || does_shifts === "1") ? 1 : 0;

  console.log("📌 הערך הסופי שנשמר ב-DB עבור does_shifts:", finalDoesShifts);

  const query = `UPDATE Users SET full_name = ?, release_date = ?, potential_reduction = ?, does_shifts = ? WHERE id = ?`;

  db.run(query, [full_name, release_date, potential_reduction, finalDoesShifts, userId], function (err) {
    if (err) {
      console.error("❌ שגיאה בעדכון משתמש ב-DB:", err);
      return res.status(500).json({ error: err.message });
    }

    db.run(`DELETE FROM User_Exemptions WHERE user_id = ?`, [userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      if (exemptionIds && exemptionIds.length > 0) {
        const stmt = db.prepare(`INSERT INTO User_Exemptions (user_id, exemption_type_id) VALUES (?, ?)`);
        exemptionIds.forEach(exId => {
          stmt.run(userId, exId);
        });
        stmt.finalize();
      }

      res.json({ message: 'החייל והפטורים עודכנו בהצלחה!' });
    });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const today = new Date().toISOString().split('T')[0]; // תאריך של היום בפורמט YYYY-MM-DD

  // 1. שלב א': "שחרור" שיבוצים עתידיים
  // אנחנו מורידים את ה-user_id רק לתורנויות שמתחילות היום או אחרי
  db.run(`UPDATE Shifts SET user_id = NULL WHERE user_id = ? AND start_date >= ?`,
    [userId, today], (err) => {
      if (err) return res.status(500).json({ error: "שגיאה בשחרור תורנויות: " + err.message });

      // 2. שלב ב': מחיקת החייל (כמו שעשינו קודם)
      db.run(`DELETE FROM User_Exemptions WHERE user_id = ?`, [userId], (err) => {
        if (err) return res.status(500).json({ error: "שגיאה במחיקת פטורים: " + err.message });

        db.run(`DELETE FROM Users WHERE id = ?`, [userId], function (err) {
          if (err) return res.status(500).json({ error: "שגיאה במחיקת חייל: " + err.message });
          res.json({ message: 'החייל נמחק, ותורנויות עתידיות שוחררו!' });
        });
      });
    });
});

// --- שליפת אילוצים ---
// בשרת - וודאי שהשאילתה נראית כך:
// שרת (server.js) - השאילתה הזו תביא את השם של החייל גם באילוצים
app.get('/api/constraints', (req, res) => {
  // הוספנו c.division לשאילתא
  const sql = `SELECT c.*, u.full_name 
                 FROM Constraints c 
                 LEFT JOIN Users u ON c.user_id = u.id`;
                 
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.post('/api/pet-replacements', (req, res) => {
  const { shift_id, start_date, end_date, reason } = req.body;
  db.run("INSERT INTO Pet_Replacements (shift_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)",
    [shift_id, start_date, end_date, reason], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});
// בצד השרת (Node.js)
// הוסיפי את זה ל-server.js שלך
app.delete('/api/shift-exemptions/cleanup', (req, res) => {
  const sql = `
    DELETE FROM shift_exemptions 
    WHERE shift_id NOT IN (SELECT id FROM shifts)
  `;
  db.run(sql, [], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: `בוצע! נמחקו ${this.changes} החלפות יתומות.` });
  });
});
// הוספת פטור/החלפה לתורנות
// ב-POST
app.post('/api/shift-exemptions', (req, res) => {
  const { shift_id, start_date, end_date, type, start_time, end_time } = req.body;
  const sql = `INSERT INTO Shift_Exemptions (shift_id, start_date, end_date, type, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [shift_id, start_date, end_date, type, start_time, end_time], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// ב-PUT
app.put('/api/shift-exemptions/:id', (req, res) => {
  const { start_date, end_date, type, start_time, end_time } = req.body;
  const sql = `UPDATE Shift_Exemptions SET start_date = ?, end_date = ?, type = ?, start_time = ?, end_time = ? WHERE id = ?`;
  db.run(sql, [start_date, end_date, type, start_time, end_time, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Success' });
  });
});

// שליפת כל הפטורים (נוסיף את זה כדי שה-App.jsx יוכל למשוך אותם)
app.get('/api/shift-exemptions', (req, res) => {
  db.all("SELECT * FROM Shift_Exemptions", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
// --- יצירת אילוץ ---
app.post('/api/constraints', (req, res) => {
  const { organization_id, user_id, start_date, end_date, reason, division } = req.body;

  // בדיקה אוטומטית והוספת עמודת division לטבלה אם היא עוד לא קיימת
  db.run("ALTER TABLE Constraints ADD COLUMN division TEXT", (alterErr) => {
    // השגיאה מתעלמת במכוון אם העמודה כבר קיימת בטבלה
    
    const sql = `INSERT INTO Constraints (organization_id, user_id, start_date, end_date, reason, division) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
                 
    const params = [
      organization_id || 1, 
      user_id || null, 
      start_date, 
      end_date, 
      reason || '', 
      division || null
    ];

    db.run(sql, params, function(err) {
      if (err) {
        console.error("שגיאה בהוספת אילוץ:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'האילוץ נוצר בהצלחה!' });
    });
  });
});
// נתיב לשליפת הגפים הייחודיים של הטייסת
app.get('/api/divisions/:orgId', (req, res) => {
  const { orgId } = req.params;
  const sql = `SELECT DISTINCT division FROM Users WHERE organization_id = ? AND division IS NOT NULL AND division != 'לא מוגדר'`;

  db.all(sql, [orgId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // מחזירים מערך נקי של שמות הגפים
    res.json(rows.map(row => row.division));
  });
});

// --- מחיקת אילוץ ---
app.delete('/api/constraints/:id', (req, res) => {
  db.run(`DELETE FROM Constraints WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'האילוץ נמחק!' });
  });
});

app.patch('/api/shifts/:id/publish', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE Shifts SET is_published = 1 WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'פורסם!' });
  });
});

app.post('/api/auto-assign', async (req, res) => {
  console.log("--- תחילת שיבוץ אוטומטי ---");
  const { org_id } = req.body;

  try {
    // 1. שליפת כל הנתונים מה-DB
    const users = await dbQuery('SELECT * FROM Users WHERE organization_id = ?', [org_id]);
    const shifts = await dbQuery('SELECT * FROM Shifts WHERE organization_id = ?', [org_id]);
    const constraints = await dbQuery('SELECT * FROM Constraints WHERE organization_id = ?', [org_id]);
    const exemptions = await dbQuery('SELECT * FROM User_Exemptions');
    const shiftTypes = await dbQuery('SELECT * FROM Shift_Types');

    console.log(`נמצאו: ${users.length} משתמשים, ${shifts.length} תורנויות`);

    // 2. הפעלת מנוע השיבוץ
    await autoAssignShifts(shifts, users, constraints, exemptions, shiftTypes);

    console.log("--- השיבוץ הסתיים בהצלחה ---");
    res.json({ success: true, message: "השיבוץ הושלם!" });

  } catch (err) {
    console.error("❌ שגיאה קריטית בשרת:", err);
    res.status(500).json({ error: err.message });
  }
});
// ודאי שהקוד הזה קיים ב-server.js
app.delete('/api/shift-exemptions/:id', (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM shift_exemptions WHERE id = ?";

  db.run(sql, id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "נמחק בהצלחה", changes: this.changes });
  });
});
// 1. שליפת תקופות לפי טייסת
app.get('/api/periods/:orgId', (req, res) => {
  const orgId = req.params.orgId;
  db.all("SELECT * FROM Periods WHERE organization_id = ?", [orgId], (err, rows) => {
    if (err) {
      console.error("DB Error in GET /api/periods:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!rows || rows.length === 0) {
      return res.json([
        { name: '1.26', start_date: '2026-01-01', end_date: '2026-07-10' },
        { name: '2.26', start_date: '2026-07-11', end_date: '2027-01-10' }
      ]);
    }
    res.json(rows);
  });
});

// 2. שמירה / עדכון של התקופות
app.post('/api/periods', (req, res) => {
  const { organization_id, periods } = req.body;
  console.log("Saving periods for orgId:", organization_id, periods);

  if (!organization_id) {
    return res.status(400).json({ error: "Missing organization_id" });
  }
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run("DELETE FROM Periods WHERE organization_id = ?", [organization_id], (err) => {
      if (err) {
        console.error("DB Error on DELETE periods:", err.message);
        db.run("ROLLBACK");
        return res.status(500).json({ error: err.message });
      }

      const stmt = db.prepare(`INSERT INTO Periods (organization_id, name, start_date, end_date) VALUES (?, ?, ?, ?)`);
      if (periods && Array.isArray(periods)) {
        periods.forEach(p => {
          stmt.run(organization_id, p.name, p.start_date, p.end_date);
        });
      }
      stmt.finalize();

      db.run("COMMIT", (commitErr) => {
        if (commitErr) {
          console.error("DB Error on COMMIT periods:", commitErr.message);
          db.run("ROLLBACK");
          return res.status(500).json({ error: commitErr.message });
        }
        res.json({ message: 'התקופות נשמרו בהצלחה!' });
      });
    });
  });
});


/**
 * פונקציית עזר להרצת שאילתות SQL בצורה אסינכרונית (Promise-based)
 */
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

/**
 * בדיקת פטורים של חייל לתורנות מסוימת
 */
function hasExemption(user, shift) {
  if (!user.exemption_ids) return false;
  const exemptions = user.exemption_ids.split(',').map(Number);
  const typeName = shift.type_name ? shift.type_name.toLowerCase() : "";

  if (exemptions.includes(4) && shift.is_weekend === 1) return true; // פטור שבת
  if (exemptions.includes(1) && typeName.includes('מטבח')) return true; // פטור מטבח
  if (exemptions.includes(2) && typeName.includes('שמירה')) return true; // פטור שמירות
  if (exemptions.includes(3) && typeName.includes('רס"ר')) return true; // פטור רס"ר

  return false;
}

function calculateFairnessScore(user, allShifts) {
    const userShifts = allShifts.filter(s => s.user_id === user.id);
    
    return userShifts.reduce((totalScore, s) => {
        let shiftScore = 0;
        
        // נניח ש-shift_type_id הוא המפתח לזיהוי הסוג
        // את צריכה להתאים את ה-ID לפי מה שיש לך בטבלת ShiftTypes
        if (s.type === 'מטבח_חול') {
            // כל יום = 1 נקודה, חוץ מחמישי = 0.5
            // כאן צריך לוגיקה שמזהה אם יום חמישי כלול בתאריכים
            shiftScore = calculateKitchenScore(s, 'Thursday', 0.5);
        } 
        else if (s.type === 'מטבח_סופש') {
            // יום שני = 0.5
            shiftScore = calculateKitchenScore(s, 'Monday', 0.5);
        }
        else if (s.type === 'שמירה') {
            // ימי שני = 0.5
            shiftScore = calculateKitchenScore(s, 'Monday', 0.5);
        }
        else {
            // ברירת מחדל
            shiftScore = 1; 
        }
        
        return totalScore + shiftScore;
    }, 0);
}

// פונקציית עזר לחישוב הנקודות לפי יום ספציפי בתורנות
function calculateKitchenScore(shift, targetDayName, specialValue) {
    // לוגיקה שמחשבת כמה ימים סה"כ יש בתורנות פחות החצי יום המיוחד
    const start = new Date(shift.start_date);
    const end = new Date(shift.end_date);
    const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // אם היום המיוחד כלול בתורנות
    return totalDays - 0.5; // חישוב פשטני: כל התורנות היא נקודות פחות ההפרש
}

async function autoAssignShifts(shifts, users, constraints, exemptions, shiftTypes) {
    // 1. ניקוי ומיון תורנויות (ארוכות ראשונות)
    const sortedShifts = shifts
        .filter(s => !s.user_id || s.user_id === 0 || s.user_id === "")
        .map(s => ({ 
            ...s, 
            days: Math.round((new Date(s.end_date) - new Date(s.start_date)) / (1000 * 60 * 60 * 24)) + 1 
        }))
        .sort((a, b) => b.days - a.days);

    // 2. סינון משתמשים כשירים
    const rotationUsers = users.filter(u => 
        u.is_active === 1 && 
        u.does_shifts === 1 && 
        u.role !== 'אחראי' && 
        u.role !== 'admin'
    );

    // 3. ניהול עומס פנימי (כאן נשמר הציון המעודכן בזמן הריצה)
    let userLoads = {};
    rotationUsers.forEach(u => {
        userLoads[u.id] = shifts
            .filter(s => s.user_id === u.id)
            .reduce((sum, s) => sum + Math.round((new Date(s.end_date) - new Date(s.start_date)) / (1000 * 60 * 60 * 24)) + 1, 0);
    });

    // 4. שיבוץ לולאתי
    for (const shift of sortedShifts) {
        const shiftStart = new Date(shift.start_date);
        const shiftEnd = new Date(shift.end_date);
        
        // סינון: מי פנוי כרגע?
        let availableCandidates = rotationUsers.filter(user => {
            // א. בדיקת התנגשות עם תורנות קודמת (המרחק 5 ימים וכדומה)
            const hasClash = shifts.some(s => 
                s.user_id === user.id && 
                Math.abs(new Date(s.start_date) - shiftStart) / (1000 * 60 * 60 * 24) < 5
            );
            if (hasClash) return false;

            // ב. בדיקה האם יש אילוץ פעיל לגף של החייל בטווח התאריכים של התורנות
            const hasDivisionConstraint = constraints && constraints.some(c => {
                if (!c.division || c.division !== user.division) return false;
                const cStart = new Date(c.start_date);
                const cEnd = new Date(c.end_date);
                // בדיקת חפיפה בין טווח התורנות לטווח האילוץ
                return shiftStart <= cEnd && shiftEnd >= cStart;
            });
            if (hasDivisionConstraint) return false;

            // ג. (אופציונלי אם תרצי בהמשך) בדיקת אילוץ אישי לחייל הספציפי
            const hasPersonalConstraint = constraints && constraints.some(c => {
                if (c.user_id !== user.id) return false;
                const cStart = new Date(c.start_date);
                const cEnd = new Date(c.end_date);
                return shiftStart <= cEnd && shiftEnd >= cStart;
            });
            if (hasPersonalConstraint) return false;

            return true;
        });

        // בחירת החייל עם ה-load הכי נמוך מתוך הפנויים
        availableCandidates.sort((a, b) => userLoads[a.id] - userLoads[b.id]);
        const bestUser = availableCandidates[0];

        if (bestUser) {
            await new Promise(r => db.run('UPDATE Shifts SET user_id = ? WHERE id = ?', [bestUser.id, shift.id], r));
            shift.user_id = bestUser.id;
            userLoads[bestUser.id] += shift.days; // עדכון המונה הפנימי
        }
    }
}
// 5. הפעלת השרת על פורט 3001
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});