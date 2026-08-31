import { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import he from 'date-fns/locale/he';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './App.css';
import { FiPlus, FiUpload, FiSettings, FiEye, FiEyeOff } from 'react-icons/fi';
import { subDays } from 'date-fns';


const locales = { 'he': he };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), getDay, locales,
});

const formatDateHe = (dateStr) => {
  if (!dateStr) return 'לא הוגדר';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};
// פונקציה אסינכרונית ששולפת את החגים מהרשת עבור השנה המבוקשת
const fetchHebrewHolidayDynamic = async (startDateStr, endDateStr) => {
  if (!startDateStr) return null;
  const year = startDateStr.split('-')[0];

  try {
    const response = await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&year=${year}&maj=on&nx=on&lg=he`);
    const data = await response.json();

    // יוצרים רשימת תאריכים מכל הטווח של התורנות (מההתחלה ועד הסיום)
    let current = new Date(startDateStr);
    let end = new Date(endDateStr || startDateStr);
    let holidayResults = [];

    while (current <= end) {
      const dateOnly = current.toISOString().split('T')[0];

      // מחפשים האם היום הספציפי הזה הוא חג בלוח השנה
      const match = data.items.find(item => item.date === dateOnly);

      if (match) {
        const rawTitle = (match.hebrew || match.title || "").toLowerCase();

        let hName = null;
        if (rawTitle.includes("ראש השנה") || rawTitle.includes("rosh hashanah")) hName = "ראש השנה";
        else if (rawTitle.includes("כיפור") || rawTitle.includes("yom kippur")) hName = "יום כיפור";
        else if (rawTitle.includes("סוכות") || rawTitle.includes("sukkot")) hName = "סוכות";
        else if (rawTitle.includes("פסח") && (rawTitle.includes("א") || rawTitle.includes("1") || rawTitle.includes("ראשון"))) hName = "פסח א'";
        else if (rawTitle.includes("פסח") && (rawTitle.includes("ב") || rawTitle.includes("2") || rawTitle.includes("שני"))) hName = "פסח ב'";
        else if (rawTitle.includes("שבועות") || rawTitle.includes("shavuot")) hName = "שבועות";

        if (hName && !holidayResults.includes(hName)) {
          holidayResults.push(hName);
        }
      }

      // עוברים ליום הבא בטווח
      current.setDate(current.getDate() + 1);
    }

    // אם נמצא לפחות חג אחד בתוך הטווח, נחזיר אותם מופרדים בפסיק
    return holidayResults.length > 0 ? holidayResults.join(', ') : null;

  } catch (error) {
    console.error("שגיאה בשליפת חגים דינאמית:", error);
    return null;
  }
};
// פונקציות עזר לניהול תקופות (חצי שנה)

const getPrevPeriodStr = (periodStr) => {
  if (!periodStr) return '';
  const [half, year] = periodStr.split('.');
  if (half === '2') return `1.${year}`;
  const prevYear = (parseInt(year) - 1).toString().padStart(2, '0');
  return `2.${prevYear}`;
};
const CustomToolbar = (toolbar) => {
  const { theme, currentUser } = toolbar;
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToCurrent = () => toolbar.onNavigate('TODAY');
  const isAdmin = currentUser?.role === 'admin';
  return (

    < div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: theme.backgroundcolor, padding: '15px 20px', borderRadius: '12px' }
    }>
      {/* כפתור חזרה להיום */}
      < button onClick={goToCurrent} style={{ padding: '8px 16px', background: theme.pink, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
        היום
      </button >
      {/* שם החודש והשנה */}
      < span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: theme.darkgreen }}>
        {toolbar.label}
      </span >

      {isAdmin ? (
        <>
          {/* חצי ניווט */}
          < div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={goToBack} style={{ padding: '8px 16px', fontSize: "30px", background: `transparent`, border: "none", color: theme.darkgreen, borderRadius: '8px', position: "absolute", top: "33px", right: "530px", cursor: 'pointer', fontWeight: 'bold' }}>
              ▶
            </button>
            <button onClick={goToNext} style={{ padding: '8px 16px', fontSize: "30px", background: `transparent`, border: "none", color: theme.darkgreen, position: "absolute", top: "33px", right: "1000px", borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              ◀
            </button>
          </div >
        </>
      ) : (
        <>
          < div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={goToBack} style={{ padding: '8px 16px', fontSize: "30px", background: `transparent`, border: "none", color: theme.darkgreen, borderRadius: '8px', position: "absolute", top: "72px", right: "700px", cursor: 'pointer', fontWeight: 'bold' }}>
              ▶
            </button>
            <button onClick={goToNext} style={{ padding: '8px 16px', fontSize: "30px", background: `transparent`, border: "none", color: theme.darkgreen, position: "absolute", top: "72px", right: "925px", borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              ◀
            </button>
          </div >
        </>
      )
      }


    </div >
  );
};
const theme = {
  backgroundcolor: '#F8F2E4',    // Chambray - לכפתורים ראשיים, מתגים ולשוניות בולטות
  darkgreen: '#28593C',   // Espresso - לטקסטים, כותרות ואייקונים (במקום שחור נוקשה)
  lightgreen: '#4D6B4F',    // Glacier - הרקע הכללי והחיצוני של המערכת
  pink: '#E8B0BD',     // Bisque - לסיידבר, חלונות קופצים וכרטיסיות     // לבן נקי לרקע של הלוח עצמו
};
function App() {
  // פלטת הצבעים החדשה של המערכת 🎨

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('app_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) { return null; }
  });
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [shifts, setShifts] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [unpublishFormData, setUnpublishFormData] = useState({ startDate: '', endDate: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availableDivisions, setAvailableDivisions] = useState([]);
  const [isConstraintModalOpen, setIsConstraintModalOpen] = useState(false);
  const [constraintFormData, setConstraintFormData] = useState({ startDate: '', endDate: '', userId: '', reason: '' });
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' או 'table'
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishFormData, setPublishFormData] = useState({ startDate: '', endDate: '' });
  const [isPublishChoiceOpen, setIsPublishChoiceOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateFormData, setDuplicateFormData] = useState({ startDate: '', endDate: '', userId: '' });
  const [shiftToDuplicate, setShiftToDuplicate] = useState(null);
  const [exemptionTypes, setExemptionTypes] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("2026-07"); // חודש נוכחי כברירת מחדל
  const nodeRef = useRef(null);
  const [statsDate, setStatsDate] = useState(new Date()); // שומר את התאריך שמוצג בחלונית הסטטיסטיקה
  const [currentPeriod] = useState('2.26'); // התקופה הנוכחית

  const handlePrevStatsPeriod = () => {
    const newDate = new Date(statsDate);
    newDate.setMonth(newDate.getMonth() - 6); // קפיצה חצי שנה אחורה
    setStatsDate(newDate);
  };
  const [squadrons, setSquadrons] = useState([]); // רשימת הטייסות
  const [searchTerm, setSearchTerm] = useState(''); // מה שהמשתמש מחפש

  // פונקציה לטעינת טייסות (נקראת ב-useEffect בהתחלה)
  const fetchSquadrons = async () => {
    const res = await fetch('http://localhost:3001/api/squadrons');
    const data = await res.json();
    setSquadrons(data);
  };

  // פונקציה לסינון לפי חיפוש
  const filteredSquadrons = squadrons.filter(s =>
    s.name.includes(searchTerm)
  );
  const handleNextStatsPeriod = () => {
    const newDate = new Date(statsDate);
    newDate.setMonth(newDate.getMonth() + 6); // קפיצה חצי שנה קדימה
    setStatsDate(newDate);
  };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitDate, setSplitDate] = useState('');
  const [currentScreen, setCurrentScreen] = useState('calendar');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);      // האם הכרטיסייה פתוחה
  const [newUserReleaseDate, setNewUserReleaseDate] = useState('');
  const [newUserPotential, setNewUserPotential] = useState(100);
  // החליפי את ה-useState הנוכחי בזה:
  const [replacementData, setReplacementData] = useState({
    shift_id: '',
    start_date: '',
    end_date: '',
    type: 'pet'
  });
  const [newUserExemptionIds, setNewUserExemptionIds] = useState([]);
  const [setIsPetModalOpen] = useState(false);
  const [selectedSlotDates, setSelectedSlotDates] = useState(null);
  const [adminMyName, setAdminMyName] = useState('');
  const [adminMyPassword, setAdminMyPassword] = useState('');
  const [adminDoesShifts, setAdminDoesShifts] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState(null);
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    type: 'pet', // 'pet' או 'squadron'
    startDate: '',
    endDate: '',
    startTime: '', // אופציונלי
    endTime: ''    // אופציונלי
  });
  // const [newTypeName, setNewTypeName] = useState('');
  // מחקי את השורות הישנות ושימי במקומן את זו:
  const [shiftTypeForm, setShiftTypeForm] = useState({
    name: '',
    isWeekend: false,
    color: '#3174ad',
    points_base: 1.0
  });
  const [newUserDivision, setNewUserDivision] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUserGender, setNewUserGender] = useState('male'); // ברירת מחדל
  const [newShiftTypeGenderLimit, setNewShiftTypeGenderLimit] = useState('all');
  const [squadronName, setSquadronName] = useState('');
  const [constraintTarget, setConstraintTarget] = useState('soldier'); // 'soldier' או 'division'
  const [adminName, setAdminName] = useState('');
  const [shiftExemptions, setShiftExemptions] = useState([]); // כאן אנחנו שומרים את רשימת ההחלפות מהשרת
  const [adminPassword, setAdminPassword] = useState('');
  const [managingSquadron, setManagingSquadron] = useState(null);
  // הוסיפי את זה ליד ה-useState האחרים שלך:
  const [setNewShiftType] = useState({
    name: '',
    isWeekend: false,
    color: '#3174ad',
    points_base: 1.0 // הערך ההתחלתי של הנקודות
  });
  const [squadronUsers, setSquadronUsers] = useState([]);
  const [hasReplacement, setHasReplacement] = useState(false);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', userId: '', shiftTypeId: '', isWeekend: false, isBaltam: false, notes: '' });
  const [users, setUsers] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [customPeriods, setCustomPeriods] = useState([
    { name: '1.26', startDate: '2026-01-01', endDate: '2026-07-10' },
    { name: '2.26', startDate: '2026-07-11', endDate: '2027-01-10' }
  ]);
  const getPeriodStr = (dateInput) => {
    if (!dateInput) return '';
    // המרת התאריך למחרוזת בפורמט YYYYY-MM-DD בצורה נקייה
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateOnly = `${year}-${month}-${day}`;

    // חיפוש האם התאריך נופל בתוך הטווח שהוגדר בהגדרות
    const matchedPeriod = customPeriods.find(p => p.startDate && p.endDate && dateOnly >= p.startDate && dateOnly <= p.endDate);

    if (matchedPeriod) return matchedPeriod.name;

    // נפילת בטחון אם התאריך לא נמצא באף טווח
    const shortYear = year.toString().slice(-2);
    const half = d.getMonth() < 6 ? '1' : '2';
    return `${half}.${shortYear}`;
  };

  // חפשי בקוד שלך איפה מוגדרים ה-const של הסטטיסטיקות (אזור שורה 1030 בערך)
  // ותוודאי שזה נראה ככה:
  const periodShifts = useMemo(() => {
    return shifts.filter(s => getPeriodStr(s.originalStart) === currentPeriod);
  }, [shifts, currentPeriod]);
  const selectedUserObj = users.find(u => u.id == selectedUserId);
  const displayedPeriodStr = getPeriodStr(statsDate);

  const fetchShifts = () => {
    fetch('http://localhost:3001/api/shifts')
      .then(res => res.json())
      .then(async data => {
        // סינון: אם המשתמש הוא 'soldier', נציג רק את מה ש-is_published הוא 1
        let filteredData = data;
        if (currentUser.role === 'soldier') {
          filteredData = data.filter(shift => shift.is_published === 1);
        }
        // מעבר על התורנויות ושליפת שם החג באופן אוטומטי לכל תאריך
        const formattedShifts = await Promise.all(filteredData.map(async shift => {
          const hName = await fetchHebrewHolidayDynamic(shift.start_date, shift.end_date);
          return {
            ...shift,
            id: shift.id,
            userId: shift.user_id,
            groupId: shift.group_id,
            shiftTypeId: shift.shift_type_id,
            originalStart: shift.start_date,
            originalEnd: shift.end_date,
            holidayName: hName,
            isHoliday: !!hName,
            // בודקים ישירות כאן: אם אין יוזר, זו תורנות ריקה. אם יש, זה כרגיל (כולל הצגת החג בכותרת אם קיים)
            title: !shift.user_id
              ? `⚠️ דרוש שיבוץ - ${shift.type_name}`
              : `${shift.full_name} - ${shift.type_name}${hName ? ` (${hName})` : ''}${shift.is_published === 1 ? '' : ' (טיוטה)'}`,
            start: new Date(`${shift.start_date}T00:00:00`),
            end: new Date(`${shift.end_date}T23:59:59`),
            allDay: true,
            isPublished: shift.is_published === 1,
            isWeekend: shift.is_weekend === 1,
            isBaltam: shift.is_baltam === 1,
            type: 'shift',
            notes: shift.notes
          };
        }));

        setShifts(formattedShifts);
      })
      .catch(err => console.error(err));
  };
  const handleUnpublishBoard = () => {
    if (!unpublishFormData.startDate || !unpublishFormData.endDate) {
      alert('חובה למלא טווח תאריכים לביטול הפרסום!');
      return;
    }

    fetch('http://localhost:3001/api/shifts/unpublish-range', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: unpublishFormData.startDate,
        end_date: unpublishFormData.endDate
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בביטול הפרסום');
        return res.json();
      })
      .then(data => {
        alert(data.message);
        setIsUnpublishModalOpen(false); // סגירת המודאל
        setUnpublishFormData({ startDate: '', endDate: '' }); // איפוס הטופס

        // ה-Action החשוב ביותר: רענון הנתונים
        fetchShifts();
      })
      .catch(err => {
        console.error(err);
        alert('קרתה שגיאה בתקשורת עם השרת');
      });
  };

  const fetchConstraints = () => {
    fetch('http://localhost:3001/api/constraints')
      .then(res => res.json())
      .then(data => {
        const formattedConstraints = data.map(c => {
          let targetName = 'כללי';

          // בדיקה האם יש גף שמור לאילוץ הזה
          if (c.division && c.division !== 'לא מוגדר' && c.division.trim() !== '') {
            targetName = `גף ${c.division}`;
          } else if (c.full_name) {
            targetName = c.full_name;
          }

          return {
            id: `c-${c.id}`,
            dbId: c.id,
            userId: c.user_id,
            division: c.division,
            originalStart: c.start_date,
            originalEnd: c.end_date,
            title: `אילוץ: ${targetName} - ${c.reason}`,
            start: new Date(`${c.start_date}T00:00:00`),
            end: new Date(`${c.end_date}T23:59:59`),
            allDay: true,
            type: 'constraint'
          };
        });
        setConstraints(formattedConstraints);
      }).catch(err => console.error("שגיאה במשיכת אילוצים:", err));
  };
  const isShabbatInRange = (startStr, endStr) => {
    if (!startStr || !endStr) return false;

    let current = new Date(startStr);
    const end = new Date(endStr);

    // נרוץ על כל הימים בטווח
    while (current <= end) {
      // 6 מייצג שבת ב-JavaScript (ראשון=0, שני=1... שבת=6)
      if (current.getDay() === 6) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  };

  // וודאי שהפונקציה הזו מוגדרת כך ב-App.jsx שלך
  const fetchUsers = (orgId) => {
    // אם לא שלחו orgId, נשתמש בזה של המשתמש המחובר
    const idToUse = orgId || currentUser.organization_id;

    fetch(`http://localhost:3001/api/users?org_id=${idToUse}`)
      .then(res => res.json())
      .then(data => {
        setUsers(data);
      })
      .catch(err => console.error("שגיאה במשיכת משתמשים:", err));
  };
  const fetchShiftTypes = () => {
    fetch('http://localhost:3001/api/shift-types')
      .then(res => res.json())
      .then(data => {
        setShiftTypes(data); // זה מעדכן את הרשימה ב-React
      })
      .catch(err => console.error("שגיאה במשיכת סוגי תורנויות:", err));
  };

  // useEffect 1: נתוני בסיס (טייסות) - רץ פעם אחת בטעינה
  useEffect(() => {
    fetch('http://localhost:3001/api/squadrons-with-admin')
      .then(res => res.json())
      .then(data => setSquadrons(data))
      .catch(err => console.error("שגיאה במשיכת טייסות:", err));
  }, []);

  // useEffect 2: נתוני המשתמש המחובר - רץ בכל פעם ש-currentUser משתנה
  useEffect(() => {
    if (currentUser) {
      // משיכת נתונים לפי הטייסת של המשתמש המחובר!
      const orgId = currentUser.organization_id;

      // כאן אנחנו שולחים את ה-ID של הטייסת שלו כדי לקבל רק את החיילים שלו
      fetch(`http://localhost:3001/api/users?org_id=${orgId}`)
        .then(res => res.json())
        .then(data => setUsers(data))
        .catch(err => console.error("שגיאה במשיכת משתמשים:", err));

      fetchShifts();
      fetchConstraints();
      fetchShiftTypes();
      fetchShiftExemptions();

      fetch('http://localhost:3001/api/exemption-types')
        .then(res => res.json())
        .then(data => setExemptionTypes(data));

      setAdminMyName(currentUser.full_name);
    }
  }, [currentUser]); // מופעל רק כשיש משתמש מחובר

  useEffect(() => {
    if (currentUser && currentUser.organization_id) {
      const orgId = currentUser.organization_id;
      fetch(`http://localhost:3001/api/users?org_id=${orgId}`)
        .then(res => res.json())
        .then(data => setUsers(data));
    }
  }, [currentUser?.organization_id]);

  const handleSaveAdminShifts = (newDoesShiftsValue) => {
    if (!currentUser) return;

    fetch(`http://localhost:3001/api/users/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: currentUser.full_name,
        release_date: currentUser.release_date,
        potential_reduction: currentUser.potential_reduction,
        exemptionIds: currentUser.exemptionIds || [],
        does_shifts: newDoesShiftsValue ? 1 : 0
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("עודכן בהצלחה:", data);

        // חשוב מאוד: נרענן מיד את רשימת החיילים מהשרת כדי שהשינוי יופיע במסך!
        const orgId = currentUser.organization_id;
        fetch(`http://localhost:3001/api/users?org_id=${orgId}`)
          .then(res => res.json())
          .then(updatedUsers => setUsers(updatedUsers))
          .catch(err => console.error("שגיאה בריענון משתמשים:", err));
      })
      .catch(err => console.error("שגיאה בעדכון:", err));
  };
  // useEffect נפרד רק בשביל "לייצר" את התקופה הבאה - ירוץ רק פעם אחת בטעינה או אם השינוי באמת נדרש
  useEffect(() => {
    if (currentUser && currentUser.organization_id) {
      fetch(`http://localhost:3001/api/periods/${currentUser.organization_id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setCustomPeriods(data.map(p => ({
              name: p.name,
              startDate: p.start_date,
              endDate: p.end_date
            })));
          }
        })
        .catch(err => console.error("שגיאה בטעינת תקופות:", err));
    }
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('app_user');
    setCurrentUser(null);
  };
  const handleConnectCalendar = () => {
    // פונים לשרת כדי לקבל את הקישור המיוחד לחייל הנוכחי
    fetch(`http://localhost:3001/api/calendar/auth-url?userId=${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        // מעבירים את החייל אוטומטית לעמוד ההתחברות של גוגל
        window.location.href = data.url;
      })
      .catch(err => console.error("שגיאה ביצירת קישור ליומן:", err));
  };
  const handleLogin = (e) => {
    e.preventDefault();
    fetch('http://localhost:3001/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: loginName, password: loginPassword }) })
      .then(res => { if (!res.ok) throw new Error('שם משתמש או סיסמה שגויים ❌'); return res.json(); })
      .then(data => {
        setCurrentUser(data.user);
        localStorage.setItem('app_user', JSON.stringify(data.user));
      }).catch(err => alert(err.message));
  };

  const handleDateSelection = (formType, field, value) => {
    let currentForm, setForm;
    if (formType === 'shift') { currentForm = formData; setForm = setFormData; }
    else if (formType === 'constraint') { currentForm = constraintFormData; setForm = setConstraintFormData; }
    else if (formType === 'publish') { currentForm = publishFormData; setForm = setPublishFormData; }
    else if (formType === 'duplicate') { currentForm = duplicateFormData; setForm = setDuplicateFormData; }
    // בתוך הפונקציה handleDateSelection:
    else if (formType === 'unpublish') { currentForm = unpublishFormData; setForm = setUnpublishFormData; }

    let newStartDate = field === 'startDate' ? value : currentForm.startDate;
    let newEndDate = field === 'endDate' ? value : currentForm.endDate;

    if (newStartDate && newEndDate && newEndDate < newStartDate) {
      alert('⚠️ שגיאה: תאריך הסיום לא יכול להיות לפני תאריך ההתחלה!');
      newEndDate = '';
    }
    setForm({ ...currentForm, startDate: newStartDate, endDate: newEndDate });
  };

  const handleSaveConstraint = () => {
    // בודקים תקינות בסיסית
    if (!constraintFormData.startDate || !constraintFormData.endDate) {
      alert('חובה למלא תאריכים!');
      return;
    }

    fetch('http://localhost:3001/api/constraints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: 1,
        user_id: constraintTarget === 'soldier' ? constraintFormData.userId : null,
        division: constraintTarget === 'division' ? constraintFormData.division : null,
        constraint_type: constraintTarget, // זה השדה שהשרת מחפש!
        start_date: constraintFormData.startDate,
        end_date: constraintFormData.endDate,
        reason: constraintFormData.reason
      })
    }).then(() => {
      setIsConstraintModalOpen(false);
      fetchConstraints();
    });
  };

  const handleDeleteConstraint = (dbId) => { if (!window.confirm('למחוק את האילוץ?')) return; fetch(`http://localhost:3001/api/constraints/${dbId}`, { method: 'DELETE' }).then(() => fetchConstraints()); };
  // מחזירה את סך כל ימי התורנות המשובצים בטייסת בתקופה הנוכחית
  const getTotalSquadronDays = (shifts) => {
    return shifts.reduce((total, s) => {
      // סופרים כל תורנות בלוח בתקופה הנבחרת
      const start = new Date(s.originalStart);
      const end = new Date(s.originalEnd);
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);
  };


  const handleSaveUser = () => {
    if (!newUserName || !newUserPassword) { alert('חובה למלא שם וסיסמה!'); return; }

    fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: currentUser.organization_id,
        full_name: newUserName,
        password: newUserPassword,
        role: 'soldier',
        does_shifts: 1,
        is_active: 1,
        release_date: newUserReleaseDate,
        gender: newUserGender,
        exemptionIds: newUserExemptionIds || null,
        potential_reduction: parseInt(newUserPotential) || 100,
        division: newUserDivision // 👈 תוסיפי את השורה הזו כדי שהגף יישלח לשרת וישמר!
      })
    })
      .then(res => res.json())
      .then(() => {
        setNewUserName('');
        setNewUserPassword('');
        setNewUserReleaseDate('');
        setNewUserPotential(100);
        setNewUserExemptionIds([]);
        setNewUserGender('');
        setNewUserDivision(""); // או הערך ההתדלתי שלך
        alert('החייל גויס בהצלחה! 🧑‍✈️');

        fetchUsers(currentUser.organization_id);
      })
      .catch(err => console.error("שגיאה בהוספת חייל:", err));
  };
  const doesRangeContainShabbat = (start, end) => {
    if (!start || !end) return false;

    let currentDate = new Date(start);
    const endDate = new Date(end);

    // לולאה שעוברת יום-יום מההתחלה עד הסוף
    while (currentDate <= endDate) {
      if (currentDate.getDay() === 6) return true; // מצאנו שבת בטווח!
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return false;
  };
  const handleUpdateOneself = () => {
    if (!currentUser) return;

    const newDoesShiftsValue = adminDoesShifts ? 1 : 0;
    console.log("🚀 הערך ששולחים עכשיו לשרת עבור does_shifts הוא:", newDoesShiftsValue);

    // 🚀 שים לב: משתמשים כאן ב-ID הישיר 2 כדי לוודא שמעדכנים את המשתמש הנכון במסד הנתונים
    fetch(`http://localhost:3001/api/users/2`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: adminMyName,
        password: adminMyPassword,
        release_date: currentUser.release_date,
        potential_reduction: currentUser.potential_reduction,
        exemptionIds: currentUser.exemptionIds || [],
        does_shifts: newDoesShiftsValue
      })
    })
      .then(res => res.json())
      .then((data) => {
        console.log("✅ תשובת שרת לאחר עדכון:", data);
        alert('הפרטים עודכנו בהצלחה!');

        setCurrentUser(prev => ({
          ...prev,
          full_name: adminMyName,
          does_shifts: newDoesShiftsValue
        }));

        const orgId = currentUser.organization_id;
        fetch(`http://localhost:3001/api/users?org_id=${orgId}`)
          .then(res => res.json())
          .then(usersData => {
            console.log("📋 רשימת החיילים החדשה מהשרת:", usersData);
            setUsers(usersData);
          });
      })
      .catch(err => console.error("שגיאה בעדכון:", err));
  };
  const checkConflict = (userId, start, end, shiftTypeId) => {
    if (!userId || !start || !end) return;

    const selectedUser = users.find(u => u.id == userId);
    const selectedType = shiftTypes.find(t => t.id == shiftTypeId);
    if (!selectedUser) return;

    const userExemptions = selectedUser.exemptionIds || [];

    // 1. בדיקת פטור שבתות (מול תאריכים)
    if (userExemptions.includes(4) && doesRangeContainShabbat(start, end)) {
      alert(`⚠️ התראה: ל-${selectedUser.full_name} יש פטור שבתות, והטווח הנבחר כולל שבת!`);
    }

    // 2. בדיקת פטורים לפי סוג תורנות (מטבח, שמירה, רס"ר)
    if (selectedType) {
      if (userExemptions.includes(1) && selectedType.name.includes('מטבח')) {
        alert(`⚠️ התראה: ל-${selectedUser.full_name} יש פטור מטבח!`);
      }
      if (userExemptions.includes(2) && selectedType.name.includes('שמירה')) {
        alert(`⚠️ התראה: ל-${selectedUser.full_name} יש פטור שמירה!`);
      }
    }
  };
  const getSoldierQuota = (soldier, totalDaysInPeriod, totalPotential) => {
    // אם הפוטנציאל של יוסי הוא 100 ושל כולם יחד 1000, 
    // והסך הכל הוא 50 ימי תורנות - הוא צריך לעשות 5 ימים.
    return (soldier.potential_reduction / totalPotential) * totalDaysInPeriod;
  };
  const handleUpdateSoldier = (id, fullName, password, releaseDate, potentialReduction, exemptionIds) => {
    if (!fullName) { alert('השם לא יכול להיות ריק!'); return; }

    fetch(`http://localhost:3001/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        password: password,
        release_date: releaseDate || null,
        potential_reduction: parseInt(potentialReduction),
        does_shifts: editingSoldier.does_shifts,
        exemptionIds: exemptionIds || []
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("שגיאה בעדכון");
        return res.json();
      })
      .then(() => {
        alert('נתוני החייל עודכנו בהצלחה! 💾');
        // כאן הקסם: קריאה לרענון הרשימה לפי הטייסת של המשתמש המחובר
        fetchUsers(currentUser.organization_id);
        setEditingSoldier(null); // סגירת חלון העריכה
      })
      .catch(err => {
        console.error("שגיאה:", err);
        alert("לא ניתן היה לעדכן את הפטורים.");
      });
  };
  const handleDeleteSoldier = (id) => {
    const userObj = users.find(u => u.id === id);
    const msg = `⚠️ אזהרה! ⚠️\n\nאת עומדת למחוק את "${userObj?.full_name}".\n\n- כל התורנויות העתידיות שלו יהפכו ל"דרוש שיבוץ".\n- היסטוריית התורנויות שלו תישמר בסטטיסטיקות.\n\nהאם להמשיך?`;

    if (!window.confirm(msg)) return;

    fetch(`http://localhost:3001/api/users/${id}`, { method: 'DELETE' })
      .then(() => {
        fetchUsers(); // רענון רשימת החיילים
        fetchShifts(); // רענון הלוח כדי להציג את התורנויות שהתפנו
        if (selectedUserId === id) setSelectedUserId(null);
      })
      .catch(err => console.error("שגיאה במחיקה:", err));
  };
  const handleSaveShiftType = async () => {
    if (!shiftTypeForm.name) { alert('חובה למלא שם סוג תורנות!'); return; }

    const colorToSave = shiftTypeForm.color || '#3174ad';

    try {
      const response = await fetch('http://localhost:3001/api/shift-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: currentUser.organization_id,
          name: shiftTypeForm.name,
          is_weekend: 0,
          color: colorToSave,
          points_base: shiftTypeForm.points_base || 1.0,
          gender_limit: newShiftTypeGenderLimit || 'all'
        })
      });

      if (!response.ok) throw new Error("שגיאה בשמירת סוג התורנות");

      // 🧹 איפוס השדות של סוג התורנות כדי שלא יישארו תקועים
      setShiftTypeForm({ name: '', color: '#3174ad', points_base: 1.0 });
      setNewShiftTypeGenderLimit('all'); // או האיפוס המתאים אצלך למגבלה
      alert('סוג תורנות נוצר בהצלחה!');

      // רענון הרשימה (אם פונקציית המשיכה דורשת organization_id כמו ב-users, תוסיפי אותו כאן)
      fetchShiftTypes(currentUser.organization_id);
    } catch (err) {
      console.error("שגיאה ביצירת סוג תורנות:", err);
      alert("קרתה שגיאה, נסי שוב");
    }
  };
  const getAvailableSoldiers = () => {
    // נסנן רק חיילים פעילים שגם מסומנים ככאלה שעושים תורנויות
    return users.filter(u => u.is_active === 1 && u.does_shifts === 1);
  };

  const checkIsDateWithinWeek = (targetDate) => {
    if (!targetDate) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(targetDate);
    const diffDays = Math.ceil((shiftDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 7; // רק עתידי בטווח של שבוע!
  };

  const forcedBaltam = !editingShiftId && checkIsDateWithinWeek(formData.startDate);
  const displayBaltam = forcedBaltam || formData.isBaltam;

  const handleSaveShift = async () => {
    const validationResult = validateShift(formData.userId, formData.shiftTypeId);
    if (validationResult !== true) {
      alert(`⚠️ שיבוץ לא תקין: ${validationResult}`);
      return; // עוצר את תהליך השמירה!
    }
    if (!formData.startDate || !formData.endDate || !formData.shiftTypeId) { alert('שדות חובה!'); return; }
    const method = editingShiftId ? 'PUT' : 'POST';
    const url = editingShiftId ? `http://localhost:3001/api/shifts/${editingShiftId}` : 'http://localhost:3001/api/shifts';
    const finalBaltam = forcedBaltam ? true : formData.isBaltam;
    const holiday = await fetchHebrewHolidayDynamic(formData.startDate, formData.endDate); fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: 1, user_id: formData.userId || null, shift_type_id: formData.shiftTypeId, start_date: formData.startDate, end_date: formData.endDate, is_weekend: formData.isWeekend, is_baltam: finalBaltam, notes: formData.notes, holiday_name: holiday })
    }).then(() => { setIsModalOpen(false); fetchShifts(); });
  };
  const checkExemptionAlert = (userId, isWeekendCheck = false) => {
    const selectedUser = users.find(u => u.id == userId);
    if (!selectedUser) return;

    const userExemptions = selectedUser.exemptionIds || [];

    // בדיקת פטור שבתות (אם התאריכים נופלים על שבת)
    if (isWeekendCheck && userExemptions.includes(4)) { // 4 זה ה-ID של פטור שבתות
      alert(`⚠️ שימי לב: לחייל ${selectedUser.full_name} יש פטור שבתות!`);
    }
  };

  const validateShift = (userId, shiftTypeId) => {
    const selectedUser = users.find(u => u.id == userId);
    const selectedType = shiftTypes.find(t => t.id == shiftTypeId);

    if (!selectedUser || !selectedType) return true;

    const userExemptions = selectedUser.exemptionIds || [];
    // התנגשות מטבח - נוסיף בדיקה גמישה יותר
    if (userExemptions.includes(1) && selectedType.name.includes('מטבח')) return "לחייל זה יש פטור מטבח!";
    if (userExemptions.includes(2) && selectedType.name.includes('שמירה')) return "לחייל זה יש פטור שמירות!";
    if (userExemptions.includes(3) && selectedType.name.includes('רס"ר')) return "לחייל זה יש פטור רס\"ר!";

    // פטור שבתות
    if (userExemptions.includes(4) && formData.isWeekend) return "לחייל זה יש פטור שבתות!";

    return true;
  };
  const handleSplitShift = async () => {
    if (!splitDate) { alert('נא לבחור תאריך לפיצול!'); return; }

    // 1. נבדוק אם זו תורנות שמירות לפי השם
    const shiftType = shiftTypes.find(t => t.id == formData.shiftTypeId);
    const isGuardShift = shiftType && shiftType.name.includes('שמירות');

    // 2. קביעת נקודת הפיצול
    // אם זו שמירה -> 14:00, אם לא -> ברירת מחדל (למשל 00:00)
    const timeToSplit = isGuardShift ? '14:00:00' : '00:00:00';
    const splitPoint = new Date(`${splitDate}T${timeToSplit}`);
    const originalStart = new Date(formData.startDate);
    const originalEnd = new Date(formData.endDate);

    if (splitPoint <= originalStart || splitPoint >= originalEnd) {
      alert('תאריך הפיצול חייב להיות בתוך טווח התורנות!');
      return;
    }

    const originalShift = shifts.find(s => s.id === editingShiftId);
    const sharedGroupId = originalShift?.groupId || `grp_split_${Date.now()}`;

    // החלק הראשון מסתיים ביום הפיצול בשעה 14:00
    // אנחנו משאירים את ה-endDate כיום הפיצול, אבל המערכת תדע שהיא נגמרת ב-14:00
    const firstPartEndStr = splitDate;
    const isFirstPartWeekend = doesRangeContainShabbat(formData.startDate, firstPartEndStr);
    const isSecondPartWeekend = doesRangeContainShabbat(splitDate, formData.endDate);
    try {
      // שלב א': עדכון התורנות הראשונה
      await fetch(`http://localhost:3001/api/shifts/${editingShiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: 1,
          user_id: formData.userId,
          shift_type_id: formData.shiftTypeId,
          start_date: formData.startDate,
          end_date: firstPartEndStr,
          is_weekend: isFirstPartWeekend,
          group_id: sharedGroupId
        })
      });

      // שלב ב': יצירת התורנות השנייה (החל מ-14:00 באותו יום)
      await fetch(`http://localhost:3001/api/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: 1,
          user_id: null, // משבצת ריקה
          shift_type_id: formData.shiftTypeId,
          start_date: splitDate,
          end_date: formData.endDate,
          is_weekend: isSecondPartWeekend,
          group_id: sharedGroupId
        })
      });

      alert('התורנות פוצלה בנקודת ה-14:00 בהצלחה! ✂️');
      setIsSplitModalOpen(false);
      setIsModalOpen(false);
      fetchShifts();
    } catch (err) {
      console.error(err);
      alert('שגיאה בתהליך הפיצול');
    }
  };
  const handleDelete = async () => {
    try {
      const originalShiftId = editingShiftId ? editingShiftId.toString().split('-')[0] : null;

      // מציאת החלפה קשורה במידה ויש
      const existingExemption = shiftExemptions.find(ex => String(ex.shift_id) === String(originalShiftId));

      // אם יש החלפה, נמחק אותה קודם מהשרת
      if (existingExemption) {
        await fetch(`http://localhost:3001/api/shift-exemptions/${existingExemption.id}`, {
          method: 'DELETE'
        });
      }

      // מחיקת התורנות עצמה
      const response = await fetch(`http://localhost:3001/api/shifts/${originalShiftId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'משהו השתבש במחיקה');
      }

      setIsModalOpen(false);
      fetchShifts();
      fetchShiftExemptions(); // רענון רשימת ההחלפות כדי שהן יתנקו מהמסך
    } catch (error) {
      console.error("שגיאת מחיקה:", error.message);
      alert("לא ניתן היה למחוק את התורנות: " + error.message);
    }
  };
  const handleDuplicateClick = () => {
    setShiftToDuplicate({
      userId: formData.userId,
      shiftTypeId: formData.shiftTypeId,
      isWeekend: formData.isWeekend,
      isBaltam: formData.isBaltam
    });
    setDuplicateFormData({ startDate: '', endDate: '', userId: formData.userId });
    setIsModalOpen(false);
    setIsDuplicateModalOpen(true);
  };
  const cleanOrphanExemptions = async () => {
    if (!window.confirm("האם למחוק את כל ההחלפות היתומות שאין להן תורנות?")) return;

    try {
      const response = await fetch('http://localhost:3001/api/shift-exemptions/cleanup', {
        method: 'DELETE'
      });
      const data = await response.json();
      alert(data.message);
      fetchShiftExemptions(); // רענון הלוח
    } catch (err) {
      console.error("שגיאה בניקוי:", err);
    }
  };
  const handleSaveDuplicate = () => {
    if (!duplicateFormData.startDate || !duplicateFormData.endDate || !duplicateFormData.userId) { alert('חובה למלא תאריכים וחייל!'); return; }

    const isWithinWeek = checkIsDateWithinWeek(duplicateFormData.startDate);
    const finalBaltam = isWithinWeek ? true : shiftToDuplicate.isBaltam;

    fetch('http://localhost:3001/api/shifts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: 1,
        user_id: duplicateFormData.userId, // החייל שנבחר בחלון השכפול
        shift_type_id: shiftToDuplicate.shiftTypeId,
        start_date: duplicateFormData.startDate,
        end_date: duplicateFormData.endDate,
        is_weekend: shiftToDuplicate.isWeekend,
        is_baltam: finalBaltam
      })
    }).then(() => { setIsDuplicateModalOpen(false); setShiftToDuplicate(null); fetchShifts(); });
  };

  const handlePublishBoard = () => {
    if (!publishFormData.startDate || !publishFormData.endDate) {
      alert('חובה למלא טווח תאריכים!');
      return;
    }

    fetch('http://localhost:3001/api/shifts/publish-range', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: publishFormData.startDate,
        end_date: publishFormData.endDate
      })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        setIsPublishModalOpen(false);
        setPublishFormData({ startDate: '', endDate: '' });

        // התיקון הקריטי: קריאה כפולה ליתר ביטחון
        fetchShifts();
      })
      .catch(err => console.error("שגיאה:", err));
  };
  const formatTimeForInput = (timeStr) => {
    if (!timeStr) return '';
    // אם השרת מחזיר "HH:mm:ss", ניקח רק את ה-"HH:mm"
    return timeStr.substring(0, 5);
  };
  const handleEventClick = (event) => {
    if (currentUser.role !== 'admin' && event.type === 'shift') {
      return; // חייל לא יכול לפתוח מודאל עריכה
    }

    // אם הוא לוחץ על אילוץ או החלפה, גם כאן כדאי להגביל
    if (currentUser.role !== 'admin' && (event.type === 'constraint' || event.type === 'exemption')) {
      return;
    }
    // 1. טיפול בלחיצה על "החלפה" (Exemption) בלוח
    if (event.type === 'exemption') {
      const e = event.exemptionData;

      setReplacementForm({
        type: e.type || 'pet',
        startDate: e.start_date ? e.start_date.split('T')[0] : '',
        endDate: e.end_date ? e.end_date.split('T')[0] : '',
        // אנחנו בודקים אם השדה קיים, אם לא - מחזירים מחרוזת ריקה
        startTime: e.start_time ? e.start_time.substring(0, 5) : '',
        endTime: e.end_time ? e.end_time.substring(0, 5) : ''
      });

      setReplacementData({
        id: e.id,
        shift_id: e.shift_id,
        type: e.type
      });
      // ...


      setEditingShiftId(e.shift_id);

      return;
    }

    if (event.type === 'constraint') {
      // 1. אופציה א': פתיחת מודאל מחיקה
      handleDeleteConstraint(event.dbId); // נשמור את ה-ID במשתנה
    }// מודאל ששואל "האם ל

    // 2. טיפול בלחיצה על "תורנות" (Shift)
    if (event.type === 'shift') {
      // ודאי שהשורה הזו קיימת ב-handleEventClick שלך:
      setEditingShiftId(event.id); // זה מה שאומר למודאל: "אני במצב עריכה של תורנות קיימת"
      // חילוץ ה-ID המקורי (לפני הפיצול)
      const originalShiftId = event.id ? event.id.toString().split('-')[0] : null;

      // חיפוש בטוח: מוודאים ש-shiftExemptions קיים ושה-shift_id של ההחלפה לא null
      const existingExemption = Array.isArray(shiftExemptions)
        ? shiftExemptions.find(ex => {
          if (!ex.shift_id) return false; // הגנה: אם ה-shift_id הוא null, נדלג
          return ex.shift_id.toString() === originalShiftId;
        })
        : null;

      if (existingExemption) {
        setHasReplacement(true);
        setReplacementData({
          id: existingExemption.id,
          shift_id: existingExemption.shift_id,
          start_date: existingExemption.start_date,
          end_date: existingExemption.end_date,
          type: existingExemption.type
        });
      } else {
        setHasReplacement(false);
        setReplacementData({ shift_id: originalShiftId, start_date: '', end_date: '', type: 'pet' });
      }

      setEditingShiftId(originalShiftId); // שימוש ב-ID הנק
      setFormData({
        startDate: event.originalStart,
        endDate: event.originalEnd,
        userId: event.userId,
        shiftTypeId: event.shiftTypeId,
        isWeekend: doesRangeContainShabbat(event.originalStart, event.originalEnd), // <--- בדיקה אוטומטית בעריכה        isBaltam: event.isBaltam,
        notes: event.notes || ''
      });
      setIsModalOpen(true);
    }
  };
  const handleSelectSlot = (slotInfo) => {
    // בודקים אם המשתמש הוא אדמין
    if (currentUser.role !== 'admin') {
      return;
    }

    const startDateStr = format(slotInfo.start, 'yyyy-MM-dd');
    const adjustedEnd = new Date(slotInfo.end);
    adjustedEnd.setMinutes(adjustedEnd.getMinutes() - 1);
    const endDateStr = format(adjustedEnd, 'yyyy-MM-dd');

    // פתיחת חלון הבחירה
    setSelectedSlotDates({ startDate: startDateStr, endDate: endDateStr });
  };
  // === הפונקציה החסרה שגרמה לקריסה נוספה בחזרה! ===
  const eventStyleGetter = (event) => {
    let finalColor = '#3174ad'; // ברירת מחדל

    // 1. אם זה אילוץ - ניתן לו צבע קבוע משלו
    if (event.type === 'constraint') {
      finalColor = '#c0392b'; // אדום כהה לאילוצים
    }
    // 2. אם זו החלפה (פט/טייסת)
    else if (event.type === 'exemption') {
      finalColor = '#e67e22'; // כתום להחלפות
    }
    // 3. אם זו תורנות רגילה - נחפש את הצבע שהגדרת
    else if (event.type === 'shift') {
      const foundType = shiftTypes.find(t => String(t.id) === String(event.shiftTypeId));
      let color = foundType ? foundType.color : (event.type_color || '#3174ad');
      finalColor = color.startsWith('#') ? color : '#' + color;
    }

    // הגדרת שקיפות וסטייל (זהה למה שהיה)
    let currentOpacity = (event.isPublished !== false) ? 1 : 0.4;
    let currentBorder = !event.userId && event.type === 'shift' ? '2px dashed #fff' : '0px';

    // בחירת חייל (Highlight)
    let currentFilter = 'none';
    if (selectedUserId && event.userId && event.type === 'shift') {
      if (event.userId == selectedUserId) {
        currentOpacity = 1;
        currentBorder = '2px solid #000';
      } else {
        currentOpacity = 0.15;
        currentFilter = 'grayscale(100%)';
      }
    }

    return {
      style: {
        backgroundColor: finalColor,
        opacity: currentOpacity,
        border: currentBorder,
        filter: currentFilter,
        borderRadius: '5px',
        color: 'white',
        transition: 'all 0.3s ease'
      }
    };
  };

  const handlePublishShift = async (shiftId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/shifts/${shiftId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: 1 })
      });

      if (response.ok) {
        alert('התורנות פורסמה!');
        fetchShifts(); // זה השלב הקריטי - טעינה מחדש של כל הנתונים
      }
    } catch (error) {
      console.error('Error publishing shift:', error);
    }
  };

  // כל הצבעים האפשריים שלנו
  const ALL_COLORS = [
    { name: 'ירוק', value: '#27ae60' },
    { name: 'סגול', value: '#8e44ad' },
    { name: 'כתום', value: '#e67e22' },
    { name: 'אדום', value: '#c0392b' },
    { name: 'צהוב', value: '#f1c40f' },
    { name: 'כחול-סגול', value: '#513dac' },
    { name: 'תכלת', value: '#4bd4ec' }
  ];

  // פונקציה שמחזירה רק את הצבעים שעדיין לא בשימוש
  const getAvailableColors = () => {
    // נמשוך את הצבעים מה-DB ונהפוך אותם לאותיות קטנות ליתר ביטחון
    const usedColors = shiftTypes.map(st => st.color ? st.color.toLowerCase() : "");

    return ALL_COLORS.filter(colorOption =>
      !usedColors.includes(colorOption.value.toLowerCase())
    );
  };
  // 1. קודם כל, נזהה את כל טווחי התאריכים שיש בהם החלפות
  const exemptionRanges = shiftExemptions.map(e => ({
    start: new Date(e.start_date),
    end: new Date(e.end_date)
  }));

  // 2. נבנה רשימה מסוננת של תורנויות
  // אנחנו שומרים תורנות רק אם היא לא מתנגשת עם אף טווח של החלפה
  const filteredShifts = shifts.filter(s => {
    const sStart = new Date(s.originalStart);
    const sEnd = new Date(s.originalEnd);

    // תורנות נשארת רק אם היא לא "חופפת" לשום החלפה
    const isCoveredByExemption = exemptionRanges.some(ex =>
      sStart <= ex.end && sEnd >= ex.start
    );

    return !isCoveredByExemption;
  });

  // 3. עכשיו נבנה את הרשימה הסופית עם התורנויות המסוננות + ההחלפות
  const allCalendarEvents = [
    ...shifts.flatMap(s => {
      const sStart = new Date(s.originalStart);
      const sEnd = new Date(s.originalEnd);

      // מצאנו את כל ההחלפות שחופפות לתורנות הזו
      const overlaps = shiftExemptions.filter(e =>
        sStart <= new Date(e.end_date) && sEnd >= new Date(e.start_date)
      );

      if (overlaps.length === 0) return s;

      // אם יש חפיפה, נחלק את התורנות לחתיכות "נקיות"
      // (לוגיקה פשוטה: אם יש החלפה, נחתוך את הטווחים)
      let fragments = [{ start: sStart, end: sEnd }];

      overlaps.forEach(e => {
        const eStart = new Date(e.start_date);
        const eEnd = new Date(e.end_date);

        fragments = fragments.flatMap(f => {
          // אם החלק לא חופף, נשאיר אותו
          if (f.end < eStart || f.start > eEnd) return [f];

          const result = [];
          if (f.start < eStart) result.push({ start: f.start, end: new Date(eStart.getTime() - 86400000) });
          if (f.end > eEnd) result.push({ start: new Date(eEnd.getTime() + 86400000), end: f.end });
          return result;
        });
      });

      return fragments.map(f => ({
        ...s,
        id: `${s.id}-${f.start.getTime()}`,
        start: f.start,
        end: f.end,
        title: s.title
      }));
    }),
    ...constraints,
    ...shiftExemptions.map(e => {
      const originalShift = shifts.find(s => s.id == e.shift_id);

      // לוגיקת הסתרה לחיילים:
      // אם המשתמש חייל רגיל והתורנות המקורית לא מפורסמת - נסתיר את ההחלפה
      if (currentUser.role === 'soldier') {
        if (!originalShift || !originalShift.isPublished) {
          return null;
        }
      }

      // אם זו החלפה שלא מצאנו לה תורנות מקורית, ליתר ביטחון נסתיר אותה מחייל
      if (currentUser.role === 'soldier' && !originalShift) {
        return null;
      }

      const typeName = originalShift ? originalShift.type_name : "תורנות";

      return {
        id: `ex-${e.id}`,
        title: `החלפה: ${typeName} | מחליף את: ${originalShift?.full_name || 'לא ידוע'}`,
        start: new Date(e.start_date),
        end: new Date(e.end_date),
        type: 'exemption',
        exemptionData: e
      };
    }).filter(e => e !== null)

  ];
  // === הכנת נתונים לטבלת הסיכום השבועית ===
  const getWeeklySummaryData = () => {
    const summary = {};

    shifts.forEach(shift => {
      // מתעלמים מאילוצים או מדברים בלי תאריך
      if (!shift.originalStart || shift.type === 'constraint') return;

      const shiftDate = new Date(shift.originalStart);

      // מקבעים את תחילת השבוע ליום שני (weekStartsOn: 1)
      const startOfThisWeek = startOfWeek(shiftDate, { weekStartsOn: 1 });
      const endOfThisWeek = new Date(startOfThisWeek);
      endOfThisWeek.setDate(endOfThisWeek.getDate() + 6); // יום ראשון

      const weekKey = `${format(startOfThisWeek, 'dd/MM/yy')} - ${format(endOfThisWeek, 'dd/MM/yy')}`;

      // אם השבוע הזה עדיין לא קיים באובייקט, ניצור אותו
      if (!summary[weekKey]) {
        summary[weekKey] = {};
        shiftTypes.forEach(t => {
          summary[weekKey][t.id] = new Set(); // משתמשים ב-Set כדי לספור קבוצות ללא כפילויות של פיצולים
        });
      }

      // הוספת ה-groupId לסט (כדי שפיצולים ייספרו כ-1)
      const uniqueId = shift.groupId || `single_${shift.id}`;
      if (summary[weekKey][shift.shiftTypeId]) {
        summary[weekKey][shift.shiftTypeId].add(uniqueId);
      }
    });

    // מיון כרונולוגי של השבועות כדי שהטבלה תהיה מסודרת לפי זמן
    const sortedWeeks = Object.keys(summary).sort((a, b) => {
      const dateA = a.split(' - ')[0].split('/').reverse().join(''); // הופך ל-yymmdd למיון קל
      const dateB = b.split(' - ')[0].split('/').reverse().join('');
      return dateA.localeCompare(dateB);
    });

    return { summary, sortedWeeks };
  };

  const handleCreateSquadronAndAdmin = async () => {
    // 1. בדיקה שהשדות לא ריקים
    if (!squadronName || !adminName || !adminPassword) {
      alert("נא למלא את כל השדות!");
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/setup-squadron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadronData: { name: squadronName },
          adminData: { full_name: adminName, password: adminPassword }
        })
      });

      if (response.ok) {
        const result = await response.json();

        // 2. עדכון ה-State של הרשימה (זה מה שגורם לה להופיע ב-UI)
        const newSquadron = { id: result.squadronId, name: squadronName };
        setSquadrons([...squadrons, newSquadron]);

        // 3. איפוס הטופס (זה מה שגורם לו להתרוקן)
        setSquadronName('');
        setAdminName('');
        setAdminPassword('');

        alert('הטייסת והאחראי הוקמו בהצלחה! 🚀');
      } else {
        alert("שגיאה בהקמת הטייסת בשרת");
      }
    } catch (err) {
      console.error("שגיאה:", err);
    }
  };

  const handleCreate = async () => {
    // ... אחרי ה-fetch המצליח:
    alert('הטייסת הוקמה!');

    // 1. ריקון הטופס (נניח שיש state לכל שדה)
    setSquadronName('');
    setAdminName('');
    setAdminPassword('');

    // 2. רענון הרשימה מיד בלי לרענן דף
    await fetchSquadrons();
  };
  // הוסיפי את הפונקציה הזו בתוך ה-App.jsx שלך
  const openSquadronManagement = async (squadron) => {
    setManagingSquadron(squadron);

    try {
      // חשוב מאוד: לוודא שזה squadron.id ולא סתם squadron
      const response = await fetch(`http://localhost:3001/api/users?org_id=${squadron.id}`);
      const data = await response.json();
      setSquadronUsers(data);
    } catch (err) {
      console.error("שגיאה בטעינת חיילים:", err);
    }
  };

  const { summary: weeklySummary, sortedWeeks } = getWeeklySummaryData();


  const eventPropGetter = (event) => {
    // נחלץ את שם הצבע או ה-ID כדי להשתמש בו בתור מחלקה
    const colorClass = event.type === 'constraint' ? 'event-constraint' : `event-${event.shift_type_id}`;

    return {
      className: colorClass
    };
  };
  // שינוי אחראי (הופך חייל לאדמין ומוריד את הקודם)
  const updateAdmin = async (newAdminId) => {
    try {
      await fetch(`http://localhost:3001/api/users/update-admin/${managingSquadron.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAdminId })
      });

      // עדכון ה-State של המשתמשים ברשימה
      setSquadronUsers(prevUsers => {
        const updatedUsers = prevUsers.map(u => {
          if (u.id === newAdminId) return { ...u, role: 'admin' }; // החדש נהיה אדמין
          if (u.role === 'admin') return { ...u, role: 'soldier' }; // הישן נהיה חייל
          return u;
        });

        // מיון: אדמין ראשון, ואז כל השאר
        return updatedUsers.sort((a, b) => (a.role === 'admin' ? -1 : 1));
      });

      alert("האחראי עודכן בהצלחה!");
    } catch (err) {
      console.error("שגיאה בעדכון אחראי:", err);
    }
  };

  // מחיקת חייל
  const deleteUser = (userId) => {
    fetch(`http://localhost:3001/api/users/${userId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        // רק אחרי שהשרת אישר שהמחיקה הצליחה, נמשוך מחדש את הרשימה
        fetchUsers(currentUser.organization_id);
      })
      .catch(err => console.error("שגיאה במחיקה:", err));
  };
  // === חישובי נתונים סטטיסטיים לפי התקופה הנבחרת ===




  // בתוך הקוד שלך, איפה שאת מחשבת את ה-squadronTotalDays:
  // שימי לב: אנחנו משתמשים ב-displayedPeriodShifts ולא ב-shifts הכללי





  // הנתונים של החייל עדיין מושווים ל"היום" כדי להראות רק מה שבוצע, אבל מסוננים לפי התקופה המוצגת

  // 1. הגדרות בסיס - חובה שיהיו כאן, לפני השימוש בהן

  const prevDisplayedPeriodStr = getPrevPeriodStr(displayedPeriodStr); // הוספנו את ההגדרה החסרה!
  const displayedPeriodShifts = shifts.filter(s => getPeriodStr(s.originalStart) === displayedPeriodStr);
  const displayedPeriodConstraints = constraints.filter(c => getPeriodStr(c.originalStart) === displayedPeriodStr);
  const prevPeriodShifts = shifts.filter(s => getPeriodStr(s.originalStart) === prevDisplayedPeriodStr);
  const totalShiftsInPeriod = shifts.filter(s => getPeriodStr(s.originalStart) === displayedPeriodStr).length;
  const activeUsersCount = users.filter(u => u.is_active === 1 && u.does_shifts === 1).length;
  const benchmarkQuota = activeUsersCount > 0 ? (totalShiftsInPeriod / activeUsersCount) : 0;
  const shiftTypeDistribution = shiftTypes.map(type => ({
    name: type.name,
    color: type.color ? (type.color.startsWith('#') ? type.color : '#' + type.color) : '#3174ad',
    count: shifts.filter(s => s.shiftTypeId == type.id && getPeriodStr(s.originalStart) === displayedPeriodStr).length
  }));
  const squadronTotalDays = displayedPeriodShifts.reduce((total, s) => {
    if (!s.originalStart || !s.originalEnd) return total;
    const start = new Date(s.originalStart);
    const end = new Date(s.originalEnd);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return total + days;
  }, 0);
  const totalNetShiftsInPeriod = displayedPeriodShifts.filter(s =>
    !shiftExemptions.some(ex => ex.shift_id === s.id)
  ).length;
  // החליפי את החישוב של ה-quota וה-progressPercentage בתוך ה-Panel בקוד הבא:

  // 1. חישוב סך הפוטנציאל של כל החיילים הפעילים בטייסת
  // 1. סך הפוטנציאל של כל החיילים הפעילים
  const totalPotential = users
    .filter(u => u.is_active === 1 && u.does_shifts === 1)
    .reduce((sum, u) => sum + (u.potential_reduction || 100), 0);

  // 2. סך הנקודות נטו בכל הלוח בתקופה המוצגת
  const totalNetPointsInPeriod = calculateTotalPointsInPeriod(displayedPeriodShifts, shiftExemptions, shiftTypes);

  // 3. חישוב המכסה רק אם נבחר חייל, אחרת ברירת מחדל בטוחה
  const soldierQuota = (selectedUserObj && totalPotential > 0)
    ? (selectedUserObj.potential_reduction / totalPotential) * totalNetPointsInPeriod
    : 0;

  // 4. המכסה הסופית (אם אין חייל נבחר או שהתוצאה 0, נציג 1 כדי שלא יהיה ריק)
  const quota = soldierQuota > 0 ? soldierQuota : 1;

  const now = new Date();
  const pastUserShifts = selectedUserId
    ? displayedPeriodShifts.filter(s => String(s.userId || '') === String(selectedUserId || '') && new Date(s.originalStart) <= now)
    : [];
  const pastUserConstraints = displayedPeriodConstraints.filter(c => c.userId == selectedUserId && c.end < now);

  const generateGradientString = (distribution, total) => {
    let acc = 0;
    return distribution
      .filter(st => st.count > 0)
      .map(st => {
        const percentage = (st.count / (total || 1)) * 100;
        const start = acc;
        acc += percentage;
        return `${st.color} ${start}% ${acc}%`;
      })
      .join(', ');
  };
  const getStatColor = (actual, target) => {
    const diff = actual - target; // או המרחק מהיעד
    const absDiff = Math.abs(diff);

    if (absDiff >= 5) {
      return 'red';      // אדום בחריגה של 5 ומעלה
    } else if (absDiff >= 3) {
      return 'orange';   // כתום בחריגה של 3 עד 4
    } else {
      return 'green';    // ירוק בחריגה של 2 ומטה או בדיוק ביעד
    }
  };
  const getSoldierQuotaForPeriod = (soldier, totalDaysInPeriod, totalPotential) => {
    // אם החייל ריק, או שאין לו את השדה, או שהפוטנציאל הכולל הוא 0 - תחזירי 0
    if (!soldier || typeof soldier.potential_reduction === 'undefined' || totalPotential === 0) {
      return 0;
    }
    return (soldier.potential_reduction / totalPotential) * totalDaysInPeriod;
  };
  const userQuotaInPeriod = getSoldierQuotaForPeriod(selectedUserObj, squadronTotalDays, totalPotential);
  const handleAutoAssign = async () => {
    if (!window.confirm("⚠️ האם להפעיל שיבוץ אוטומטי? המערכת תמלא את כל התורנויות הריקות לפי אילוצים ופטורים.")) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: currentUser.organization_id })
      });

      const data = await response.json();

      if (data.success) {
        alert("השיבוץ הושלם בהצלחה! 🚀");
        fetchShifts();
        fetchUsers();
      } else {
        alert("שגיאה בשיבוץ: " + data.message);
      }
    } catch (error) {
      console.error("Auto assign error:", error);
      alert("לא ניתן היה לבצע שיבוץ אוטומטי, אנא בדקי את השרת.");
    }
  };
  // דוגמה לשימוש בנתונים מסוננים:
  const fetchDivisions = () => {
    try {
      const uniqueDivisions = [...new Set(
        users
          .map(u => u.division)
          .filter(div => div && div !== "לא מוגדר" && div !== "undefined")
      )];
      setAvailableDivisions(uniqueDivisions);
    } catch (err) {
      console.error("שגיאה בחילוץ גפים:", err);
    }
  };
  // פונקציה לחישוב ימים נטו (בלי הפט)
  const calculateNetDays = (shift) => {
    const totalDays = Math.round((new Date(shift.end_date) - new Date(shift.start_date)) / (1000 * 60 * 60 * 24)) + 1;

    // נניח שיש לנו את הפטורים של התורנות הזו בסטייט
    const exemptionsForThisShift = shiftExemptions.filter(e => e.shift_id === shift.id);

    let exemptionDays = 0;
    exemptionsForThisShift.forEach(e => {
      exemptionDays += Math.round((new Date(e.end_date) - new Date(e.start_date)) / (1000 * 60 * 60 * 24)) + 1;
    });

    return totalDays - exemptionDays;
  };

  const petShabbatCount = shiftExemptions.filter(e => e.type === 'pet').length;
  const swapCount = shiftExemptions.filter(e => e.type === 'squadron_swap').length;
  const handleOpenReplacement = (shiftId) => {
    setReplacementData(prev => ({ ...prev, shift_id: shiftId }));
    setIsPetModalOpen(true);
  };
  const fetchShiftExemptions = () => {
    fetch('http://localhost:3001/api/shift-exemptions')
      .then(res => res.json())
      .then(data => {
        setShiftExemptions(data); // מעדכן את ה-State ששומר את ההחלפות
      })
      .catch(err => console.error("שגיאה במשיכת החלפות:", err));
  };
  const handleSaveReplacement = async () => {
    // 1. וולידציה פשוטה
    if (!replacementForm.startDate || !replacementForm.endDate) {
      alert("חובה לבחור תאריך התחלה וסיום");
      return;
    }

    // 2. שליחה לשרת
    try {
      const response = await fetch('http://localhost:3001/api/shift-exemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: editingShiftId, // ה-ID של התורנות שעורכים כרגע
          start_date: replacementForm.startDate,
          end_date: replacementForm.endDate,
          type: replacementForm.type, // 'pet' או 'squadron'
          start_time: replacementForm.startTime || null, // אם הזינו שעה
          end_time: replacementForm.endTime || null
        })
      });

      if (!response.ok) throw new Error("שגיאה בשמירת ההחלפה");

      alert("ההחלפה נשמרה בהצלחה! ✨");
      setIsReplacementModalOpen(false); // סגירת המודאל
      fetchShiftExemptions();
      setHasReplacement(true); // רענון רשימת ההחלפות כדי שהחישובים יתעדכנו
    } catch (err) {
      console.error(err);
      alert("קרתה שגיאה בשמירה, נסי שוב");
    }
  };

  // חפשי את השורה הזו (בערך 380) ותני לה ערך ברירת מחדל
  const currentEditingShift = shifts.find(s => s.id === editingShiftId) || { originalStart: '', originalEnd: '' };
  const deleteReplacement = async (exemptionId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/shift-exemptions/${exemptionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error("שגיאה במחיקת ההחלפה");

      alert("ההחלפה הוסרה והתורנות המקורית חזרה");
      fetchShiftExemptions(); // רענון הלוח כדי שהתורנות תחזור
    } catch (err) {
      console.error(err);
    }
  };
  // בדיקה האם יום מסוים הוא "יום עבודה נטו" (ללא החלפה פעילה)
  const isNetWorkingDay = (date, userId) => {
    const dateObj = new Date(date);

    // בודקים אם יש החלפה לחייל הזה בתאריך הזה
    // אם אין user_id בהחלפה, נבדוק לפי ה-shift_id:
    const hasExemption = exemptions.some(ex => ex.shift_id === s.id);
    return !hasExemption;
  };
  // במקום להשתמש בחישוב הישן, נשתמש בזה:
  const getNetStats = (userId, periodShifts, shiftTypes) => {
    if (!periodShifts || !Array.isArray(periodShifts)) {
      return { netPoints: 0, netShabbats: 0, shabbatExemptionPoints: 0, shosh: 0, mkutzarot: 0 };
    }

    let netPoints = 0;
    let netShabbats = 0;
    let shabbatExemptionPoints = 0;
    let shosh = 0;
    let mkutzarot = 0;

    const userShifts = periodShifts.filter(s => s.userId == userId);

    userShifts.forEach(s => {
      const type = shiftTypes ? shiftTypes.find(t => t.id == s.shiftTypeId) : null;
      const typeName = type?.name || "";

      let current = new Date(s.originalStart);
      let end = new Date(s.originalEnd);

      const startDate = new Date(s.originalStart);
      const endDate = new Date(s.originalEnd);
      const startDay = startDate.getDay();
      const endDay = endDate.getDay();

      if (startDay === 0) mkutzarot += 1;
      if (endDay === 5) shosh += 1;

      let totalDaysInShift = Math.round((end - current) / (1000 * 60 * 60 * 24)) + 1;
      let dayIndex = 0;
      let shiftPointsAccumulator = 0;

      // שלב א': חישוב מלא של נקודות הבסיס של התורנות
      while (current <= end) {
        const isShabbat = current.getDay() === 6;
        const dayOfWeek = current.getDay();

        const hasExemption = shiftExemptions.some(ex =>
          ex.shift_id == s.id &&
          current.getTime() >= new Date(ex.start_date).getTime() &&
          current.getTime() <= new Date(ex.end_date).getTime()
        );

        if (isShabbat) {
          if (hasExemption) shabbatExemptionPoints += 1;
          else netShabbats += 1;
        }

        let dailyPoints = 1.0;
        if (typeName.includes('שמירות')) {
          if (dayIndex === 0 || dayIndex === totalDaysInShift - 1) dailyPoints = 0.5;
        } else if (typeName.includes('מטבח')) {
          if ((!s.isWeekend && dayOfWeek === 4) || (s.isWeekend && dayOfWeek === 1)) {
            dailyPoints = 0.5;
          }
        }
        shiftPointsAccumulator += dailyPoints;

        current.setDate(current.getDate() + 1);
        dayIndex++;
      }

      // שלב ב': חישוב הפחתה מדויקת לפי סוג ההחלפה
      const originalShiftId = s.id ? s.id.toString().split('-')[0] : null;

      const relevantExemptions = shiftExemptions.filter(ex =>
        ex.shift_id && originalShiftId && String(ex.shift_id) === String(originalShiftId) && (ex.type === 'pet' || ex.type === 'squadron')
      );

      if (relevantExemptions.length > 0) {
        let currentCheck = new Date(s.originalStart);
        let daysToSubtract = 0;
        let dayIdx = 0;

        // נבדוק האם יש לפחות החלפת פט אחת בטווח (בשביל השושים/מקוצרות)
        const hasPetInList = relevantExemptions.some(ex => ex.type === 'pet');
        let isWeekendShift = s.isWeekend;

        while (currentCheck <= new Date(s.originalEnd)) {
          const isCovered = relevantExemptions.some(ex =>
            currentCheck.getTime() >= new Date(ex.start_date).getTime() &&
            currentCheck.getTime() <= new Date(ex.end_date).getTime()
          );

          if (isCovered) {
            let dailyPoints = 1.0;
            if (typeName.includes('שמירות')) {
              if (dayIdx === 0 || dayIdx === totalDaysInShift - 1) dailyPoints = 0.5;
            } else if (typeName.includes('מטבח')) {
              const dayOfWeek = currentCheck.getDay();
              if ((!s.isWeekend && dayOfWeek === 4) || (s.isWeekend && dayOfWeek === 1)) {
                dailyPoints = 0.5;
              }
            }
            daysToSubtract += dailyPoints;
          }

          currentCheck.setDate(currentCheck.getDate() + 1);
          dayIdx++;
        }

        shiftPointsAccumulator = Math.max(0, shiftPointsAccumulator - daysToSubtract);

        // השושים והמקוצרות מתעדכנים אך ורק אם מדובר בהחלפת פט בסופ"ש ולא בהחלפת טייסת באמצע השבוע
        if (hasPetInList && isWeekendShift) {
          if (startDay !== 0) mkutzarot += 1;
          if (endDay !== 5) shosh += 1;
        }
      }

      netPoints += shiftPointsAccumulator;
    });

    return {
      netPoints: Number(netPoints.toFixed(2)),
      netShabbats: netShabbats,
      shabbatExemptionPoints: Number(shabbatExemptionPoints.toFixed(2)),
      shosh,
      mkutzarot
    };
  };
  const soldierStats = selectedUserObj ? getNetStats(selectedUserObj.id, displayedPeriodShifts, shiftTypes) : { netPoints: 0, netShabbats: 0, shabbatExemptionPoints: 0, shosh: 0, mkutzarot: 0 };

  const netPoints = soldierStats.netPoints;
  const netShabbats = soldierStats.netShabbats;
  const shabbatExemptionPoints = soldierStats.shabbatExemptionPoints;

  const getNetDaysForSoldier = (userId, shiftsArray) => {
    if (!shiftsArray || !Array.isArray(shiftsArray)) return 0;

    let netDays = 0;

    shiftsArray.filter(s => s.userId == userId).forEach(s => {
      const type = shiftTypes.find(t => t.id == s.shiftTypeId);
      const typeName = type?.name || "";

      let current = new Date(s.originalStart);
      let end = new Date(s.originalEnd);

      // חישוב אורך התורנות כדי לזהות יום ראשון ואחרון
      const totalDaysInShift = Math.round((end - current) / (1000 * 60 * 60 * 24)) + 1;
      let dayIndex = 0;

      while (current <= end) {
        // אם זה יום עבודה (לא שבת)
        if (current.getDay() !== 6) {
          const dateStr = format(current, 'yyyy-MM-dd');
          const hasExemption = shiftExemptions.some(ex =>
            ex.shift_id == s.id && dateStr >= ex.start_date.split('T')[0] && dateStr <= ex.end_date.split('T')[0]
          );

          if (!hasExemption) {
            let dailyValue = 1.0; // יום עבודה מלא

            // חוקים: חצי יום
            if (typeName.includes('שמירות')) {
              // יום ראשון ואחרון של תורנות שמירות
              if (dayIndex === 0 || dayIndex === totalDaysInShift - 1) {
                dailyValue = 0.5;
              }
            }
            else if (typeName.includes('מטבח')) {
              // יום חמישי למטבח חול או יום שני למטבח סופ"ש
              if ((!s.isWeekend && current.getDay() === 4) ||
                (s.isWeekend && current.getDay() === 1)) {
                dailyValue = 0.5;
              }
            }

            netDays += dailyValue;
          }
        }
        current.setDate(current.getDate() + 1);
        dayIndex++;
      }
    });

    return netDays;
  };
  const calculateShiftPoints = (shift, exemptions, shiftTypes) => {
    // 1. מציאת ערך הבסיס של התורנות
    const typeDetails = shiftTypes.find(t => String(t.id) === String(shift.shift_type_id || shift.shiftTypeId));
    let points = typeDetails ? Number(typeDetails.points_base) : 1.0;

    // 2. בדיקה: האם יש החלפת פט פעילה על התורנות הזו?
    const hasPetExemption = exemptions.some(ex =>
      String(ex.shift_id) === String(shift.id) && ex.type === 'pet'
    );

    // 3. אם יש החלפת פט בסופ"ש - מורידים בדיוק נקודה אחת בסך הכל
    if (hasPetExemption && shift.is_weekend) {
      points = Math.max(0, points - 1.0);
    }

    return points;
  };


  const getAvailablePeriods = () => {
    const periods = [];
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();

    // נתחיל מהתקופה הנוכחית
    let currentHalf = month < 6 ? 1 : 2;

    // ניצור רשימה של 4 תקופות (נוכחית + 3 הבאות)
    for (let i = 0; i < 4; i++) {
      periods.push(`${currentHalf}.${year.toString().slice(-2)}`);

      // קפיצה לחצי שנה הבאה
      if (currentHalf === 1) {
        currentHalf = 2;
      } else {
        currentHalf = 1;
        year++;
      }
    }
    return periods;
  };

  // --- כאן תדביקי את הפונקציה החדשה ---
  const handleTimeChange = (e, field) => {
    const time = e.target.value;
    if (!time) {
      setReplacementForm({ ...replacementForm, [field]: '' });
      return;
    }

    let [hours, minutes] = time.split(':').map(Number);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const finalMinutes = roundedMinutes % 60;
    const finalHours = roundedMinutes === 60 ? (hours + 1) % 24 : hours;

    const formattedTime = `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
    setReplacementForm({ ...replacementForm, [field]: formattedTime });
  };
  // ------------------------------------

  const getGeneratedPeriods = () => {
    const periods = ['1.26', '2.26', '1.27', '2.27']; // את יכולה להוסיף כאן עוד תקופות
    return periods;
  };

  const dayPropGetter = (date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    // 1. בדיקה ראשונה: האם זה היום?
    if (compareDate.getTime() === now.getTime()) {
      return {
        style: {
          backgroundColor: theme.pink, // שימוש בורוד מה-theme
          fontWeight: 'bold'
        }
      };
    }

    // 2. בדיקה שנייה: האם זה עבר? (רק אם זה לא היום)
    if (compareDate < now) {
      return {
        style: {
          backgroundColor: '#e0e0e0', // אפור לימים שעברו
          opacity: 0.7
        }
      };
    }

    return {};
  };


  // --- אלו החישובים שצריכים להישאר בתוך ה-App שלך לפני ה-return ---

  // 1. כמה החייל עשה בפועל (הפונקציה שסומכים עליה)
  const assignedDays = selectedUserId
    ? getNetDaysForSoldier(selectedUserId, displayedPeriodShifts || [])
    : 0;

  // 2. חישוב הנטל הכולל בלוח (סך התורנויות פחות החלפות)
  // אנחנו סופרים את התורנויות בלוח ומורידים את אלו שיש להן החלפה
  // 1. פונקציית הסיכום הכללית ללוח ולטבלה
  function calculateTotalPointsInPeriod(shifts, exemptions, shiftTypes) {
    let totalPoints = 0;

    shifts.forEach(s => {
      const type = shiftTypes.find(t => String(t.id) === String(s.shiftTypeId || s.shift_type_id));
      const basePoints = type?.points_base ? Number(type.points_base) : 1.0;

      let current = new Date(s.originalStart);
      let end = new Date(s.originalEnd);
      let totalDaysInShift = Math.round((end - current) / (1000 * 60 * 60 * 24)) + 1;
      let dayIndex = 0;
      let shiftPoints = 0;

      // שלב א': חישוב מלא של התורנות
      while (current <= end) {
        let dailyValue = basePoints;

        if (type && type.name.includes('שמירות')) {
          if (dayIndex === 0 || dayIndex === totalDaysInShift - 1) {
            dailyValue = 0.5 * basePoints;
          }
        }
        else if (type && type.name.includes('מטבח')) {
          if ((!s.isWeekend && current.getDay() === 4) || (s.isWeekend && current.getDay() === 1)) {
            dailyValue = 0.5 * basePoints;
          }
        }

        shiftPoints += dailyValue;
        current.setDate(current.getDate() + 1);
        dayIndex++;
      }

      // שלב ב': הפחתה מדויקת של ימי החלפה (גם פט וגם טייסת אחרת - squadron) מכלל הלוח
      const originalShiftId = s.id ? s.id.toString().split('-')[0] : null;

      const relevantExemptions = exemptions.filter(ex =>
        ex.shift_id && originalShiftId && String(ex.shift_id) === String(originalShiftId) && (ex.type === 'pet' || ex.type === 'squadron')
      );

      if (relevantExemptions.length > 0) {
        let currentCheck = new Date(s.originalStart);
        let daysToSubtract = 0;
        let dayIdx = 0;

        while (currentCheck <= new Date(s.originalEnd)) {
          const isCovered = relevantExemptions.some(ex =>
            currentCheck.getTime() >= new Date(ex.start_date).getTime() &&
            currentCheck.getTime() <= new Date(ex.end_date).getTime()
          );

          if (isCovered) {
            let dailyValue = basePoints;
            if (type && type.name.includes('שמירות')) {
              if (dayIdx === 0 || dayIdx === totalDaysInShift - 1) {
                dailyValue = 0.5 * basePoints;
              }
            }
            else if (type && type.name.includes('מטבח')) {
              const dayOfWeek = currentCheck.getDay();
              if ((!s.isWeekend && dayOfWeek === 4) || (s.isWeekend && dayOfWeek === 1)) {
                dailyValue = 0.5 * basePoints;
              }
            }
            daysToSubtract += dailyValue;
          }

          currentCheck.setDate(currentCheck.getDate() + 1);
          dayIdx++;
        }

        shiftPoints = Math.max(0, shiftPoints - daysToSubtract);
      }

      totalPoints += shiftPoints;
    });

    return Number(totalPoints.toFixed(2));
  }

  const getProgressColor = (performed, quota) => {
    if (quota <= 0) return '#28a745';
    const percentage = (performed / quota) * 100;

    if (percentage < 50) return '#dc3545'; // אדום מתחת ל-50%
    if (percentage < 85) return '#ffc107'; // צהוב מתחת ל-85%
    return '#28a745'; // ירוק מושלם מ-85% ומעלה (או הגעה ליעד)
  };

  const barColor = getProgressColor(netPoints, quota);
  const calculateUserPoints = (userId) => {
    if (!userId) return 0;
    const stats = getNetStats(userId, displayedPeriodShifts, shiftTypes);
    return stats.netPoints;
  };
  const getComparisonStats = (users, shifts, exemptions, shiftTypes) => {
    const holidayNames = ["ראש השנה", "יום כיפור", "סוכות", "פסח א", "פסח ב", "שבועות"];

    return users.map(user => {
      const userShifts = shifts.filter(s => s.userId === user.id);
      let stats = {
        name: user.full_name,
        totalPoints: 0,
        shabbats: 0,
        blatams: 0,
        holidays: {},
        shiftCounts: {} // כאן נשמור כמות מכל סוג תורנות
      };

      userShifts.forEach(s => {
        if (exemptions.some(ex => ex.shift_id === s.id)) return;

        // ספירת סוג תורנות
        const type = shiftTypes.find(t => t.id == s.shiftTypeId);
        const typeName = type ? type.name : "לא ידוע";
        stats.shiftCounts[typeName] = (stats.shiftCounts[typeName] || 0) + 1;

        if (s.isWeekend) stats.shabbats += 1;
        if (s.isBaltam) stats.blatams += 1;

        // ספירת חגים מהרשימה הספציפית
        if (s.holidayName && holidayNames.includes(s.holidayName)) {
          stats.holidays[s.holidayName] = (stats.holidays[s.holidayName] || 0) + 1;
        }

        stats.totalPoints += calculateShiftPoints(s, exemptions, shiftTypes);
      });
      return stats;
    });
  };
  // מחשב את הנתונים רק כשהנתונים משתנים
  const stats = useMemo(() => {
    return getComparisonStats(users, shifts, shiftExemptions, shiftTypes);
  }, [users, shifts, shiftExemptions, shiftTypes]);
  const progressPercentage = Math.min((netPoints / quota) * 100, 100);

  const start = selectedSlotDates?.startDate // יחזיר undefined בבטחה ולא יקרוס;
  const end = selectedSlotDates?.endDate;
  const hasShabbat = doesRangeContainShabbat(start, end);

  // שליפה נקייה ובטוחה של כל הנתונים של החייל הנבחר לתקופה
  // חישוב סטטיסטיקות החייל ישירות מהפונקציה המעודכנת
  const savePeriodsToServer = (updatedPeriods) => {
    setCustomPeriods(updatedPeriods);
    if (!currentUser || !currentUser.organization_id) return;

    fetch('http://localhost:3001/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: currentUser.organization_id,
        periods: updatedPeriods.map(p => ({
          name: p.name,
          start_date: p.startDate,
          end_date: p.endDate
        }))
      })
    })
      .then(res => res.json())
      .then(() => alert("התקופות נשמרו בשרת בהצלחה! 💾"))
      .catch(err => console.error("שגיאה בשמירת תקופות:", err));
  };
  const iconButtonStyle = {
    flex: 1,
    padding: '12px',
    backgroundColor: theme.pink,
    color: theme.darkgreen,
    border: `1px solid ${theme.darkgreen}`,
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  if (!currentUser) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: `${theme.backgroundcolor}`, // צבע הרקע מהעיצוב שלך
        fontFamily: 'sans-serif',
        direction: 'rtl'
      }}>
        <form onSubmit={handleLogin} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{
            color: `${theme.darkgreen}`,
            fontSize: '3rem', // הגדלנו קצת
            fontWeight: '700',
            textAlign: 'center', // מוודא שזה ישר
            margin: '0',
            marginBottom: `35px`,
            width: `700px`
          }}>ברוכים הבאים למערכת תורנויות</h1>
          <h2 style={{
            background: `${theme.pink}`, // צבע הוורוד מהכותרת
            padding: '8px 20px',
            borderRadius: '8px',
            color: `${theme.darkgreen}`,
            marginBottom: '40px',
            fontWeight: '700',
            fontSize: '2rem',
            textAlign: 'center', // מוודא שזה ישר
            display: 'inline-block' // שומר על המלבן מסביב לטקסט
          }}>תורנויHOT</h2>

          <div style={{ width: '100%', marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: `${theme.darkgreen}`, fontWeight: 'bold' }}>שם משתמש</label>
            <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="שם משתמש" style={{
              width: '100%', padding: '15px', borderRadius: '15px', border: `2px solid ${theme.darkgreen}`, boxSizing: 'border-box'
            }} />
          </div>

          {/* <div style={{ width: '100%', marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: `${theme.darkgreen}`, fontWeight: 'bold' }}>סיסמה</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="סיסמה" style={{
              width: '100%', padding: '15px', borderRadius: '15px', border: `2px solid ${theme.darkgreen}`, boxSizing: 'border-box'
            }} />
          </div> */}
          {/* נוודא שיש לנו סטייט ל-showPassword שמוגדר כבר אצלך ב-useState */}
          <div style={{ width: '100%', marginBottom: '30px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: `${theme.darkgreen}`, fontWeight: 'bold' }}>
              סיסמה
            </label>

            <input
              type={showPassword ? "text" : "password"}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="סיסמה"
              style={{
                width: '100%',
                padding: '15px', // הוספנו padding-right כדי שהטקסט לא יתנגש באייקון
                borderRadius: '15px',
                border: `2px solid ${theme.darkgreen}`,
                boxSizing: 'border-box'
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                left: '15px', // מיקום בצד שמאל ב-RTL
                top: '47px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.darkgreen,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>

          <button type="submit" style={{
            padding: '15px 50px',
            background: `${theme.pink}`,
            color: `${theme.darkgreen}`,
            border: `2px solid ${theme.darkgreen}`,
            borderRadius: '15px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginTop: `20px`,
            fontSize: '25px'
          }}>כניסה</button>
        </form>
      </div>
    );
  }
  if (shifts === null || users === null) {
    return <div>טוען נתונים...</div>;
  }
  if (currentUser.role === 'super_admin') {
    return (
      <div style={{
        padding: '40px',
        backgroundColor: theme.backgroundcolor,
        minHeight: '100vh',
        color: theme.darkgreen,
        direction: 'rtl', fontStyle: 'normal'
      }}>
        <button onClick={handleLogout} style={{
          background: `${theme.pink}`,
          color: `${theme.darkgreen}`,
          border: "none",
          borderRadius: '15px',
          cursor: 'pointer',
          fontWeight: 'bold',
          marginTop: `20px`,
          fontSize: '25px',
          width: "120px",
          position: "relative",
          right: "850px",
          bottom: " 15px"
        }}>התנתק</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          <section style={{ background: `${theme.backgroundcolor}`, padding: '25px', borderRadius: '15px', border: `2px solid ${theme.darkgreen}`, height: '950px' }}>
            <h2 style={{ color: theme.darkgreen, fontSize: `2rem`, fontStyle: 'normal' }}>ליצירת טייסת חדשה:</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <input type="text" placeholder="שם הטייסת" value={squadronName} onChange={(e) => setSquadronName(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${theme.lightgreen}`, backgroundColor: `${theme.backgroundcolor} ` }} />
              <input type="text" placeholder="שם מלא של האחראי" value={adminName} onChange={(e) => setAdminName(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${theme.lightgreen}`, backgroundColor: `${theme.backgroundcolor} ` }} />
              <input type="password" placeholder="סיסמה" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${theme.lightgreen}`, backgroundColor: `${theme.backgroundcolor} ` }} />

            </div>
            <button onClick={handleCreateSquadronAndAdmin} style={{

              width: "100px",
              height: "60px",
              background: `${theme.pink}`,
              color: `${theme.darkgreen}`,
              border: `2px solid ${theme.darkgreen}`,
              borderRadius: '15px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginTop: `20px`,
              fontSize: '25px',

            }}>יצירה</button>
          </section>

          <section style={{ background: `${theme.backgroundcolor}`, padding: '25px', borderRadius: '15px', border: `2px solid ${theme.darkgreen}` }}>
            <h2 style={{ color: theme.darkgreen, fontSize: `2rem`, marginBottom: "25px" }}>רשימת טייסות קיימות</h2>
            <input type="text" placeholder="חיפוש טייסת..." onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '10px', border: `2px solid ${theme.lightgreen}`, backgroundColor: `${theme.backgroundcolor} ` }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {squadrons.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: `${theme.backgroundcolor}`, borderRadius: '15px', border: `2px solid ${theme.darkgreen}`, alignItems: 'center' }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 'bold', display: 'block', fontSize: "25px", textAlign: "right" }}>{s.name}</span>
                    <span style={{ fontSize: '18px', color: theme.lightgreen, textAlign: "right" }}>אחראי: {s.admin_name || 'לא הוגדר'}</span>
                  </div>
                  <button onClick={() => openSquadronManagement(s)} style={{ background: theme.pink, color: theme.darkgreen, border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: "15px", fontWeight: '700', }}>לפרטים</button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {managingSquadron && (
          <div style={{ position: 'fixed', top: '5%', left: '5%', width: '90%', height: '90vh', background: `${theme.backgroundcolor}`, padding: '30px', borderRadius: '15px', overflowY: 'auto', zIndex: 1000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: `${theme.darkgreen}` }}>{managingSquadron.name}</h2>
              <button onClick={() => setManagingSquadron(null)} style={{ padding: '8px 16px', background: `${theme.backgroundcolor}`, color: `${theme.darkgreen}`, border: 'none', borderRadius: `5px`, cursor: "pointer", border: `solid, 1px, ${theme.darkgreen}` }}>סגור</button>
            </div>

            <section style={{ marginTop: '20px' }}>
              <h3>חיילי הטייסת</h3>

              {squadronUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', borderBottom: `1px solid ${theme.darkgreen}` }}>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    {u.full_name}
                    {u.role === 'admin' && <span style={{ marginRight: '8px' }}> (אחראי תורנויות)</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {u.role !== 'admin' && (
                      <button onClick={() => updateAdmin(u.id)} style={{ background: theme.backgroundcolor, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                        הפוך לאחראי
                      </button>
                    )}
                    <button onClick={() => deleteUser(u.id)} style={{ background: '#fff5f5', color: '#dc3545', border: '1px solid #dc3545', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                      מחק
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <section style={{ marginTop: '30px' }}>
              <h3>תקלות ודיווחים</h3>
              <div style={{ background: `${theme.backgroundcolor}`, padding: '15px', borderRadius: '8px' }}>
                <p>אין תקלות פעילות כרגע.</p>
              </div>
            </section>

            <div style={{ marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
              <button onClick={() => deleteSquadron(managingSquadron.id)} style={{ background: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px' }}>מחק טייסת לצמיתות</button>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: theme.backgroundcolor,
      color: theme.darkgreen,
      fontFamily: "'Rubik', sans-serif",
      direction: 'rtl'

    }}>

      {/* תפריט הצד - מעוצב לפי ה-Theme החדש */}
      <div style={{
        width: '280px',
        backgroundColor: theme.backgroundcolor,
        border: `2px solid ${theme.darkgreen}`,
        height: "96.5%",
        borderRadius: "30px",
        marginTop: "15px",
        marginRight: "15px",
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        <div style={{ paddingBottom: '10px', marginBottom: '0px' }}>
          <h2 style={{ margin: 0, color: theme.darkgreen }}>טייסת חופ"ה</h2>
          <span style={{ fontSize: '16px', color: theme.darkgreen }}>שלום, {currentUser.full_name}</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, flex: 1, overflowY: 'auto' }}>
          {users
            .filter(user => user.is_active === 1 && user.does_shifts === 1)
            .map(user => {
              const isSelected = selectedUserId === user.id;
              // const personalQuota = user ? getSoldierQuotaForPeriod(user, squadronTotalDays || 0, totalPotential || 1) : 0;
              const performedBE = getNetStats(user.id, displayedPeriodShifts, shiftTypes);
              const performed = performedBE.netPoints;
              const userQuota = (user.potential_reduction / totalPotential) * totalNetPointsInPeriod;
              const statusColor = getStatColor(performed, userQuota);
              return (
                <li
                  key={user.id}
                  // בתוך ה-map של המשתמשים בתפריט הצד:
                  // בתוך ה-map של רשימת החיילים בתפריט הצד:
                  onClick={() => {
                    // פותחים את הכרטיסייה בכל מקרה
                    setIsPanelOpen(true);

                    // אם לחצנו על החייל שנבחר כבר - נחזור לנתונים הכלליים (נבטל בחירה)
                    if (selectedUserId === user.id) {
                      setSelectedUserId(null);
                    } else {
                      // אם לחצנו על חייל חדש - נציג את הנתונים שלו
                      setSelectedUserId(user.id);
                      setSelectedPeriod("2026-07"); // איפוס לחודש הנוכחי בכל לחיצה
                      setIsPanelOpen(true);
                    }
                  }}
                  style={{
                    padding: '12px',
                    background: isSelected ? theme.pink : 'transparent',
                    color: theme.darkgreen,
                    marginBottom: '8px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: `1px solid ${theme.lightgreen}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{user.full_name} {user.role === 'admin' ? '(אחראי)' : ''}</span>

                  {/* כאן המספר הצבעוני */}
                  <span style={{
                    fontWeight: 'bold',
                    color: statusColor,
                    background: "transparent",
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '15px'
                  }}>
                    {performed}
                  </span>
                </li>
              );
            })}
        </ul>
        {/* אזור הכפתורים התחתון בסרגל הצד */}
        {currentUser.role === 'admin' && (
          <div style={{ display: 'flex', gap: '25px', marginTop: 'auto', paddingTop: '20px' }}>
            <button onClick={() => setIsSettingsOpen(true)} style={iconButtonStyle}>
              <FiSettings size={30} />
            </button>

            {/* כפתור פרסום - פותח בחירה (פרסום/ביטול) */}
            <button onClick={() => setIsPublishChoiceOpen(true)} style={iconButtonStyle}>
              <FiUpload size={30} />
            </button>

            {/* כפתור הוספה - פותח בחירה (שיבוץ/אילוץ) */}
            <button onClick={() => setSelectedSlotDates({ startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') })} style={iconButtonStyle}>
              <FiPlus size={30} />
            </button>

          </div>
        )}


      </div >

      {/* אזור הלוח המרכזי */}
      < div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', padding: '20px' }
      }>
        {
          currentUser.role === 'admin' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: theme.lightgreen, padding: '5px', width: '350px', borderRadius: '30px', border: `1px solid ${theme.darkgreen}`, position: "relative", right: "600px", top: "15px" }}>
                <button onClick={() => setViewMode('calendar')} style={{ flex: 1, padding: '10px', background: viewMode === 'calendar' ? theme.pink : 'transparent', width: `175px`, color: viewMode == `calendar` ? theme.darkgreen : theme.backgroundcolor, border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: `20px` }}>לוח שנה</button>
                <button onClick={() => setViewMode('table')} style={{ flex: 1, padding: '10px', background: viewMode === 'table' ? theme.pink : 'transparent', width: `175px`, color: viewMode == `table` ? theme.darkgreen : theme.backgroundcolor, border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: `20px` }}>סיכום תקופתי</button>
              </div>

              <div>
                <button
                  onClick={handleAutoAssign}
                  style={{
                    marginTop: '5px', padding: '4px 8px', background: theme.pink, color: theme.darkgreen, border: `2px solid ${theme.darkgreen}`, borderRadius: '8px',
                    cursor: 'pointer', fontSize: '12px', fontWeight: "bold", width: "80px", position: "absolute", right: "35px", top: "70px"
                  }}
                >שבץ</button>
              </div>
            </div>
          )
        }
        {
          currentUser.role === 'soldier' && (
            <div>
              {/* הכפתור החדש שלנו! */}
              <button
                onClick={handleConnectCalendar}
                style={{
                  marginTop: '5px', padding: '4px 8px', background: theme.pink, color: theme.darkgreen, border: `2px solid ${theme.darkgreen}`,
                  borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: "bold", width: "110px", position: "absolute", right: "130px", top: "83px",
                }}>
                סנכרן ליומן גוגל
              </button>
            </div>
          )
        }
        < button onClick={handleLogout} style={{ display: 'block', marginTop: '5px', padding: '4px 8px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: "80px", position: "relative", right: "1490px", bottom: "20px" }}> התנתק</button >

        <div style={{ flex: 1, background: theme.backgroundcolor, padding: '20px', borderRadius: '25px', border: `3px solid ${theme.lightgreen}`, overflow: 'hidden' }}>
          {viewMode === 'calendar' || currentUser.role !== 'admin' ? (

            <Calendar
              localizer={localizer}
              events={allCalendarEvents}
              startAccessor="start"
              endAccessor="end"
              culture="he"
              dayPropGetter={dayPropGetter}
              rtl={true}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleEventClick}
              date={currentDate}
              onNavigate={(newDate) => setCurrentDate(newDate)}
              selectable={currentUser.role === 'admin'}
              onSelectSlot={currentUser.role === 'admin' ? handleSelectSlot : undefined}
              onSelectEvent={handleEventClick}
              onSelectSlot={handleSelectSlot}
              components={{ toolbar: (props) => <CustomToolbar {...props} theme={theme} currentUser={currentUser} /> }}
              style={{ flex: 1, backgroundColor: theme.backgroundcolor, color: theme.darkgreen }}

            />


          ) : (
            /* כאן תוכלי להדביק את ה-table שלך בחזרה */
            <div style={{
              background: theme.backgroundcolor, padding: '20px', borderRadius: '12px', flex: 1, maxHeight: '70vh', direction: "ltr", overflowY: 'auto', margin: '0 15px 15px 0'
            }}>
              <div style={{ direction: "rtl" }}>
                <h2 style={{ direction: "rtl", color: theme.darkgreen, marginTop: 0, marginBottom: '20px', borderBottom: `2px solid ${theme.lightgreen}`, paddingBottom: '10px' }}>
                  סיכום הקצאה תקופתית (לפי תאריך התחלה)
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', borderRadius: `30px` }}>
                    <thead>
                      <tr style={{ background: theme.backgroundcolor, borderRadius: `30px`, borderBottom: `2px solid ${theme.lightgreen}` }}>
                        <th style={{ padding: '15px', borderBottom: `2px solid ${theme.lightgreen}`, border: `1px solid ${theme.lightgreen}`, color: theme.darkgreen }}>שבוע (ב' - א')</th>
                        {shiftTypes.map(type => (
                          <th key={type.id} style={{ padding: '15px', borderBottom: `2px solid ${theme.lightgreen}`, border: `1px solid ${theme.lightgreen}`, color: type.color ? (type.color.startsWith('#') ? type.color : `#${type.color}`) : theme.darkgreen }}>
                            {type.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedWeeks.map(week => (
                        <tr key={week} style={{ borderBottom: `1px solid ${theme.lightgreen}` }}>
                          <td style={{ padding: '12px', border: `1px solid ${theme.lightgreen}`, fontWeight: 'bold', backgroundColor: theme.backgroundcolor, color: theme.darkgreen }}>{week}</td>
                          {shiftTypes.map(type => {
                            const count = weeklySummary[week][type.id]?.size || 0;
                            return (
                              <td key={type.id} style={{
                                padding: '12px',
                                border: `1px solid ${theme.lightgreen}`,
                                fontSize: '18px',
                                color: count === 0 ? '#ccc' : theme.darkgreen,
                                fontWeight: count === 0 ? 'normal' : 'bold',
                                backgroundColor: count === 0 ? theme.backgroundcolor : '#f0fff4'
                              }}>
                                {count}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {sortedWeeks.length === 0 && (
                        <tr>
                          <td colSpan={shiftTypes.length + 1} style={{ padding: '30px', color: theme.darkgreen, fontSize: '16px' }}>
                            אין הקצאות בלוח בתקופה זו.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div >
      {currentUser.role === "admin" && isPanelOpen && (

        <Draggable nodeRef={nodeRef}>
          <div ref={nodeRef} style={{
            position: 'absolute', right: '1650px', top: '250px', width: '240px',
            backgroundColor: theme.pink, height: "700px", borderRadius: '20px',
            padding: '20px', zIndex: 10, color: theme.darkgreen, display: 'flex',
            flexDirection: 'column', gap: '15px', border: `2px solid ${theme.darkgreen}`
          }}>
            {/* כפתור סגירה */}
            <button onClick={() => { setIsPanelOpen(false); setSelectedUserId(null); }} style={{ position: 'absolute', top: '10px', left: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: theme.darkgreen }}>✖</button>

            {!selectedUserId || !selectedUserObj ? (
              <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <button onClick={handlePrevStatsPeriod} style={{ padding: '8px 5px', background: "transparent", color: theme.darkgreen, border: "none", position: "relative", bottom: "2px", borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: "20px" }}>▶</button>
                  <h3 style={{ margin: 0 }}>תקופה {displayedPeriodStr}</h3>
                  <button onClick={handleNextStatsPeriod} style={{ padding: '8px 5px', background: "transparent", color: theme.darkgreen, border: "none", position: "relative", bottom: "2px", borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: "20px" }}>◀</button>
                </div>

                {/* נתונים בסיסיים */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{benchmarkQuota.toFixed(1)}</div>
                    <div style={{ fontSize: '10px' }}>ממוצע לחייל  בתקופה 100%</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{(benchmarkQuota / 6).toFixed(1)}</div>
                    <div style={{ fontSize: '10px' }}>ממוצע לחודש</div>
                  </div>
                </div>

                {/* "עוגת גרף" - התפלגות סוגי תורנויות */}
                {/* גרף עוגה דינמי */}
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', marginBottom: '10px', color: theme.darkgreen }}>התפלגות תורנויות:</div>

                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    margin: '0 auto',
                    // כאן נוצרת העוגה - המשתנה background יעודכן בלוגיקה למטה
                    background: shiftTypeDistribution.length > 0
                      ? `conic-gradient(${generateGradientString(shiftTypeDistribution, totalShiftsInPeriod)})`
                      : '#ccc'
                  }} />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px', justifyContent: 'center' }}>
                    {shiftTypeDistribution.map((st, i) => (
                      <div key={i} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: st.color }} />
                        {st.name} ({st.count})
                      </div>
                    ))}
                  </div>
                  <div>
                    {currentScreen === 'calendar' && (
                      <button onClick={() => setCurrentScreen('dashboard')} style={{ padding: '8px 16px', background: theme.pink, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', marginTop: "15px" }}>
                        מעבר לדוח השוואה
                      </button>
                    )}
                  </div>



                </div>
              </div>
            ) : (


              // --- מצב אישי ---
              <div>

                <h3 style={{ margin: 0, textAlign: 'center' }}>{selectedUserObj.full_name}</h3>
                {/* אזור בחירת תקופה בכרטיסייה */}
                <div style={{ margin: '15px 0', textAlign: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>בחר תקופה להצגה: </label>
                  <select
                    value={displayedPeriodStr}
                    onChange={(e) => {
                      const selectedPeriodName = e.target.value;
                      const found = customPeriods.find(p => p.name === selectedPeriodName);
                      if (found && found.startDate) {
                        // מוסיפים T00:00:00 כדי לוודא שהתאריך מתפרש נכון באזור הזמן המקומי
                        setStatsDate(new Date(found.startDate + 'T00:00:00'));
                      }
                      console.log("Selected:", e.target.value, "Found range:", found);
                    }}
                    style={{ padding: '5px', marginRight: "7px", borderRadius: '8px', border: `1px solid ${theme.darkgreen}`, backgroundColor: theme.pink }}
                  >
                    {customPeriods.map(period => (
                      <option key={period.name} value={period.name}>תקופה {period.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{netPoints}</div>

                    <div style={{ fontSize: '12px' }}>ימי תורנות</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{netShabbats}</div>
                    <div style={{ fontSize: '12px' }}>שבתות</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{soldierStats.shosh}</div>
                    <div style={{ fontSize: '12px' }}>שושים</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{soldierStats.mkutzarot}</div>
                    <div style={{ fontSize: '12px' }}>מקוצרות</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{shifts.filter(s => String(s.userId || '') === String(selectedUserId || '') && s.isBaltam).length}</div>
                    <div style={{ fontSize: '12px' }}>בלת"מים</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{constraints.filter(c => c.userId == selectedUserId).length}</div>
                    <div style={{ fontSize: '12px' }}>ימי אילוץ</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.3)', padding: '10px', borderRadius: '10px', marginTop: '15px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>פטורים:</div>
                  {selectedUserObj.exemptionIds && selectedUserObj.exemptionIds.length > 0 ? (
                    <div style={{ fontSize: '13px' }}>
                      {selectedUserObj.exemptionIds.map(id => {
                        const ex = exemptionTypes.find(e => e.id == id);
                        return <div key={id}>{ex ? ex.name : ''}</div>;
                      })}
                    </div>
                  ) : <div style={{ fontSize: '13px' }}>אין פטורים</div>}
                </div>

                <div style={{ marginTop: '15px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>תאריך שחרור:</div>
                  <div style={{ fontSize: '14px' }}>{formatDateHe(selectedUserObj.release_date)}</div>
                </div>

                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.3)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                    <span>ניצול מכסה:</span>
                    <span>{netPoints} מתוך {quota.toFixed(1)}</span>
                  </div>

                  {/* פס המדד */}
                  <div style={{ background: '#fff', color: barColor, height: '12px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                    <div style={{
                      width: `${progressPercentage}%`,
                      background: barColor,
                      height: '100%',
                      transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)' // אנימציה חלקה יותר
                    }} />
                  </div>

                  {/* טקסט אחוזים קטן מתחת */}
                  <div style={{ fontSize: '10px', marginTop: '5px', color: '#666', textAlign: 'right' }}>
                    {progressPercentage.toFixed(0)}% הושלם
                  </div>
                </div>
              </div>
            )}
          </div>
        </Draggable>
      )}
      {/* חלון פרסום תורנויות */}
      {
        isPublishModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.backgroundcolor, padding: '30px', borderRadius: '10px', width: '400px', position: 'relative' }}>
              <button
                onClick={() => { setIsPublishModalOpen(false); setPublishFormData({ startDate: '', endDate: '' }); }}
                style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.darkgreen }}>✖</button>
              <h2 style={{ marginTop: 0, paddingBottom: '10px', color: theme.darkgreen }}> פרסום טווח תורנויות</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', color: theme.darkgreen }}>
                <div><label>מאיזה תאריך:</label><input type="date" value={publishFormData.startDate} onChange={(e) => handleDateSelection('publish', 'startDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <div><label>עד איזה תאריך:</label><input type="date" value={publishFormData.endDate} onChange={(e) => handleDateSelection('publish', 'endDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <button onClick={handlePublishBoard} style={{ padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>פרסם לחיילים</button>
              </div>
            </div>
          </div>
        )
      }

      {/* חלון ביטול פרסום */}
      {
        isUnpublishModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.backgroundcolor, padding: '30px', borderRadius: '10px', width: '400px', position: 'relative' }}>
              <button
                onClick={() => { setIsUnpublishModalOpen(false); setUnpublishFormData({ startDate: '', endDate: '' }); }}
                style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.darkgreen }}>✖</button>
              <h2 style={{ marginTop: 0, paddingBottom: '10px', color: theme.darkgreen }}>ביטול פרסום טווח</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px', color: theme.darkgreen }}>
                <div><label>מאיזה תאריך לבטל:</label><input type="date" value={unpublishFormData.startDate} onChange={(e) => handleDateSelection('unpublish', 'startDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <div><label>עד איזה תאריך לבטל:</label><input type="date" value={unpublishFormData.endDate} onChange={(e) => handleDateSelection('unpublish', 'endDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <button onClick={handleUnpublishBoard} style={{ marginTop: "15px", padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>בטל פרסום והחזר לטיוטה</button>
              </div>
            </div>
          </div>
        )
      }

      {/*  בחירה בין שיבוץ או אילוץ  */}
      {
        selectedSlotDates && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.backgroundcolor, border: `2px solid ${theme.darkgreen}`, padding: '25px', borderRadius: '10px', width: '320px', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setSelectedSlotDates(null)} style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.darkgreen }}>✖</button>
              <h3 style={{ marginTop: 0, color: theme.lightgreen }}>בחר/י מה תרצה/י להוסיף</h3>
              <p style={{ color: theme.lightgreen, marginBottom: '20px', fontWeight: 'bold' }}>
                {selectedSlotDates.startDate === selectedSlotDates.endDate
                  ? `לתאריך: ${formatDateHe(selectedSlotDates.startDate)}`
                  : `לסופ"ש/טווח: ${formatDateHe(selectedSlotDates.startDate)} - ${formatDateHe(selectedSlotDates.endDate)}`}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentUser.role === 'admin' && (
                  <button onClick={() => { setFormData({ startDate: selectedSlotDates.startDate, endDate: selectedSlotDates.endDate, userId: '', shiftTypeId: '', isWeekend: hasShabbat, isBaltam: false }); setEditingShiftId(null); setIsModalOpen(true); setSelectedSlotDates(null); }} style={{ padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                    שיבוץ תורנות
                  </button>
                )}
                <button onClick={() => { setConstraintFormData({ startDate: selectedSlotDates.startDate, endDate: selectedSlotDates.endDate, userId: currentUser.role === 'admin' ? '' : currentUser.id, reason: '' }); setIsConstraintModalOpen(true); setSelectedSlotDates(null); }} style={{ padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                  חסימת אילוץ
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* חלון תאריכי שכפול */}
      {
        isDuplicateModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.backgroundcolor, padding: '30px', borderRadius: '10px', width: '400px', position: 'relative' }}>
              <button onClick={() => { setIsDuplicateModalOpen(false); setShiftToDuplicate(null); }} style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.textDark }}>✖</button>
              <h2 style={{ marginTop: 0, paddingBottom: '10px', color: theme.darkgreen }}> תאריכים לתורנות המשוכפלת</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', color: theme.darkgreen }}>
                <div><label>תאריך התחלה חדש:</label><input type="date" value={duplicateFormData.startDate} onChange={(e) => handleDateSelection('duplicate', 'startDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <div><label>תאריך סיום חדש:</label><input type="date" value={duplicateFormData.endDate} onChange={(e) => handleDateSelection('duplicate', 'endDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <div><label>בחר חייל:</label><select value={duplicateFormData.userId} onChange={(e) => setDuplicateFormData({ ...duplicateFormData, userId: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}><option value="">בחר חייל</option>{getAvailableSoldiers().map(u => (<option key={u.id} value={u.id}>{u.full_name}</option>))}</select></div>
                <button onClick={handleSaveDuplicate} style={{ padding: '12px', marginTop: "10px", background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>אשר ושבץ משוכפל</button>
              </div>
            </div>
          </div>
        )
      }
      {
        isPublishChoiceOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.darkgreen, padding: '30px', borderRadius: '10px', width: '320px', textAlign: 'center', border: `2px solid ${theme.pink}`, position: 'relative' }}>
              <button onClick={() => setIsPublishChoiceOpen(false)} style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.backgroundcolor }}>✖</button>

              <h3 style={{ marginTop: 0, color: theme.backgroundcolor }}>בחר/י מה תרצה/י לעשות</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => { setIsPublishChoiceOpen(false); setIsPublishModalOpen(true); }} style={{ padding: '12px', fontSize: "20px", background: theme.backgroundcolor, color: theme.pink, border: `2px solid ${theme.pink}`, borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  פרסם תורנויות
                </button>
                <button onClick={() => { setIsPublishChoiceOpen(false); setIsUnpublishModalOpen(true); }} style={{ padding: '12px', fontSize: "20px", background: theme.backgroundcolor, color: theme.pink, border: `2px solid ${theme.pink}`, borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  בטל פרסום
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* חלון הוספת אילוץ */}
      {
        isConstraintModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.backgroundcolor, padding: '30px', borderRadius: '10px', width: '400px', position: 'relative' }}>
              <button onClick={() => setIsConstraintModalOpen(false)} style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.darkgreen }}>✖</button>
              <h2 style={{ marginTop: 0, paddingBottom: '10px', color: theme.darkgreen }}>חסימת אילוץ בלוח</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', color: theme.darkgreen }}>
                <div><label>תאריך התחלה:</label><input type="date" value={constraintFormData.startDate} onChange={(e) => handleDateSelection('constraint', 'startDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <div><label>תאריך סיום:</label><input type="date" value={constraintFormData.endDate} onChange={(e) => handleDateSelection('constraint', 'endDate', e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                {/* <div><label>שם החייל:</label>{currentUser.role === 'admin' ? (<select value={constraintFormData.userId} onChange={(e) => setConstraintFormData({ ...constraintFormData, userId: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}><option value="">בחר חייל</option>{getAvailableSoldiers().map(u => (<option key={u.id} value={u.id}>{u.full_name}</option>))}</select>) : (<input type="text" value={currentUser.full_name} disabled style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} />)}</div> */}

                <div>
                  <label>סוג אילוץ:</label>
                  <select onChange={(e) => setConstraintTarget(e.target.value)} style={{ width: '30%', padding: '8px', marginRight: "10px", boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}>
                    <option value="soldier">חייל ספציפי</option>
                    <option value="division">גף שלם</option>
                    <option value="squadron">כל הטייסת</option>
                  </select>
                </div>
                {constraintTarget === 'soldier' && (
                  <div>

                    <select
                      value={constraintFormData.userId}
                      onChange={(e) => setConstraintFormData({ ...constraintFormData, userId: e.target.value })}
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                    >
                      <option value="">בחר חייל</option>
                      {getAvailableSoldiers().map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>

                  </div>
                )}

                {constraintTarget === 'division' && (
                  <div>
                    <select
                      value={constraintFormData.division}
                      onChange={(e) => setConstraintFormData({ ...constraintFormData, division: e.target.value })}
                      onFocus={fetchDivisions}
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                    >
                      <option value="">בחר גף</option>
                      {availableDivisions.map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div><label>סיבת האילוץ:</label><input type="text" placeholder="לדוגמה: גימלים, קורס" value={constraintFormData.reason} onChange={(e) => setConstraintFormData({ ...constraintFormData, reason: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} /></div>
                <button onClick={handleSaveConstraint} style={{ padding: '12px', fontSize: "20px", background: theme.pink, color: theme.darkgreen, border: `2px solid ${theme.pink}`, borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>חסום בלוח </button>
              </div>
            </div>
          </div>
        )
      }

      {/* חלון הגדרות */}
      {
        isSettingsOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.backgroundcolor, padding: '30px', borderRadius: '20px', width: '550px', position: 'relative', display: `flex`, flexDirection: `column`, maxHeight: '85vh', overflow: 'hidden', color: theme.darkgreen }}>
              <div style={{ flexShrink: 0 }}>
                <button onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '25px', cursor: 'pointer', color: theme.darkgreen }}>✖</button>
                <h2 style={{ margin: 0, fontSize: "25px", paddingBottom: '10px', color: theme.darkgreen }}> הגדרות מערכת</h2>
              </div>
              <div style={{ flex: 1, overflowY: `auto`, padding: '0 30px 30px 30px', direction: "ltr" }}>
                <div style={{ direction: 'rtl' }}>
                  <div style={{ marginBottom: '20px', background: theme.pink, padding: '15px', borderRadius: '20px', marginTop: '15px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '20px', color: theme.darkgreen }}>הפרטים שלי</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input type="text" value={adminMyName} onChange={(e) => setAdminMyName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, borderColor: theme.darkgreen }} placeholder="שם משתמש" />
                      <input type="password" value={adminMyPassword} onChange={(e) => setAdminMyPassword(e.target.value)} style={{ flex: 1, padding: '8px', backgroundColor: theme.backgroundcolor, borderRadius: "15px", border: `1px solid ${theme.darkgreen}`, borderColor: theme.darkgreen }} placeholder="סיסמה חדשה" />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                        <input
                          type="checkbox"
                          checked={adminDoesShifts}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            console.log("תיבת הסימון שונתה ל:", newValue); // 👈 תוסיפי את זה
                            setAdminDoesShifts(newValue);
                          }}
                        />אני משתלב בסבב התורנויות
                      </label>
                    </div>
                    <button onClick={handleUpdateOneself} style={{ padding: '8px 15px', background: theme.backgroundcolor, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>עדכן פרטים</button>
                  </div>

                  <div style={{ marginBottom: '20px', background: theme.darkgreen, padding: '15px', borderRadius: '20px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '20px', marginBottom: '12px', color: theme.backgroundcolor }}> הוספת חייל חדש </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.backgroundcolor, textAlign: "right" }}>שם מלא</label>
                          <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, borderColor: theme.darkgreen }} placeholder="שם מלא" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.backgroundcolor, textAlign: "right" }}>סיסמא</label>
                          <input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, borderColor: theme.darkgreen }} placeholder="סיסמא" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.backgroundcolor, textAlign: "right" }}>תאריך שחרור:</label>
                          <input type="date" value={newUserReleaseDate} onChange={(e) => setNewUserReleaseDate(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}` }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.backgroundcolor, textAlign: "right" }}>פוטנציאל תורנויות (%):</label>
                          <input type="number" min="0" max="100" value={newUserPotential} onChange={(e) => setNewUserPotential(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, borderColor: theme.darkgreen }} placeholder="100" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div>
                          <label style={{ fontSize: '15px', display: 'block', marginBottom: '5px', color: theme.backgroundcolor, textAlign: "right" }}>
                            גף
                          </label>

                          {/* שדה המאפשר גם בחירה מרשימה קיימת וגם הקלדה חופשית של גף חדש */}
                          <input
                            type="text"
                            list="divisionsList"
                            value={newUserDivision || ''} // תחליפי בשם ה-state של הגף בטופס הוספת חייל אצלך
                            onChange={(e) => setNewUserDivision(e.target.value)} // פונקציית העדכון של הסטייט
                            placeholder="בחר או הקלד גף חדש..."
                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                          />

                          {/* רשימת ההצעות האוטומטיות שמתעדכנת מכל הגפים הקיימים במערכת */}
                          <datalist id="divisionsList">
                            {availableDivisions.map((div, index) => (
                              <option key={index} value={div} />
                            ))}
                          </datalist>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.backgroundcolor, textAlign: "right" }}>מגדר:</label>
                          <select value={newUserGender} onChange={(e) => setNewUserGender(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}` }} placeholder="מגדר">
                            <option value="male">זכר</option>
                            <option value="female">נקבה</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ padding: '15px', background: theme.bgCard, borderRadius: '8px' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: theme.backgroundcolor, textAlign: "right" }}> פטורים (במידה ויש):</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                          {exemptionTypes.map(exemption => (
                            <label key={exemption.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: theme.backgroundcolor, padding: '5px 10px', borderRadius: '10px' }}>
                              <input type="checkbox" checked={newUserExemptionIds.includes(exemption.id)} onChange={(e) => {
                                if (e.target.checked) setNewUserExemptionIds([...newUserExemptionIds, exemption.id]);
                                else setNewUserExemptionIds(newUserExemptionIds.filter(id => id !== exemption.id));
                              }} />
                              {exemption.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleSaveUser} style={{ padding: '8px 15px', background: theme.backgroundcolor, color: theme.darkgreen, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px', alignSelf: 'flex-start', fontSize: "20px", margin: "auto" }}>הוסף חייל</button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px', background: theme.pink, padding: '15px', borderRadius: '20px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '20px', marginBottom: '10px', color: theme.darkgreen }}> ניהול חיילים קיימים</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto', marginBottom: '10px' }}>
                      {users.filter(u => u.role === 'soldier' && u.is_active === 1).map(soldier => (
                        <div key={soldier.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.backgroundcolor, padding: '8px', borderRadius: '15px', border: `1px solid ${theme.darkgreen}` }}>
                          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{soldier.full_name}</span>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => setEditingSoldier({ id: soldier.id, full_name: soldier.full_name, password: '', release_date: soldier.release_date || '', potential_reduction: soldier.potential_reduction || 100, exemptionIds: soldier.exemptionIds || [], does_shifts: soldier.does_shifts })} style={{ background: theme.backgroundcolor, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '7px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' }}>ערוך</button>
                            <button onClick={() => handleDeleteSoldier(soldier.id)} style={{ background: theme.backgroundcolor, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '7px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' }}>מחק </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {editingSoldier && (
                      <div style={{ background: theme.pink, padding: '12px', borderRadius: '5px', marginTop: '10px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.darkgreen }}>עריכת חייל: <strong>{editingSoldier.full_name}</strong></h4>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <input type="text" value={editingSoldier.full_name} onChange={(e) => setEditingSoldier({ ...editingSoldier, full_name: e.target.value })} style={{ flex: 1, padding: '6px', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}` }} placeholder="שם חייל" />
                          <input type="text" value={editingSoldier.password} onChange={(e) => setEditingSoldier({ ...editingSoldier, password: e.target.value })} style={{ flex: 1, padding: '6px', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}` }} placeholder="סיסמה חדשה (אופציונלי)" />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>תאריך שחרור:</label>
                            <input type="date" value={editingSoldier.release_date} onChange={(e) => setEditingSoldier({ ...editingSoldier, release_date: e.target.value })} style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}` }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>פוטנציאל (%):</label>
                            <input type="number" min="0" max="100" value={editingSoldier.potential_reduction} onChange={(e) => setEditingSoldier({ ...editingSoldier, potential_reduction: e.target.value })} style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}` }} />
                          </div>
                        </div>
                        {/* אזור בחירת הפטורים */}
                        <div style={{ marginBottom: '15px', marginTop: `15px` }}>
                          <label style={{ fontSize: '17px', fontWeight: 'bold', textAlign: "right", display: 'block', marginBottom: '5px' }}> פטורים פעילים:</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {exemptionTypes.map(exemption => (
                              <label key={exemption.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', background: theme.backgroundcolor, padding: '4px 8px', borderRadius: '10px', border: `1px solid ${theme.accent}`, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  // אנחנו בודקים אם ה-ID של הפטור נמצא במערך של החייל הנערך
                                  checked={editingSoldier.exemptionIds?.includes(exemption.id) || false}
                                  onChange={(e) => {
                                    const currentIds = editingSoldier.exemptionIds || [];
                                    const newIds = e.target.checked
                                      ? [...currentIds, exemption.id]
                                      : currentIds.filter(id => id !== exemption.id);

                                    setEditingSoldier({ ...editingSoldier, exemptionIds: newIds });
                                  }}
                                />
                                {exemption.name}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => { handleUpdateSoldier(editingSoldier.id, editingSoldier.full_name, editingSoldier.password, editingSoldier.release_date, editingSoldier.potential_reduction, editingSoldier.exemptionIds); setEditingSoldier(null); }} style={{ background: theme.backgroundcolor, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '3px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>שמור שינויים</button>
                          <button onClick={() => setEditingSoldier(null)} style={{ background: theme.backgroundcolor, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '3px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>ביטול</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* אזור ניהול תקופות מותאמות אישית */}
                  <div style={{ marginBottom: '20px', background: theme.darkgreen, padding: '15px', borderRadius: '20px', border: `1.5px solid ${theme.darkgreen}` }}>
                    <h3 style={{ marginTop: 0, fontSize: '20px', color: theme.backgroundcolor }}>ניהול טווחי תקופות</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {customPeriods.map((period, index) => (
                        <div key={index} style={{ display: 'flex', gap: '4px', alignItems: 'center', background: theme.backgroundcolor, padding: '8px', borderRadius: '12px' }}>
                          <input
                            type="text"
                            value={period.name}
                            onChange={(e) => {
                              const updated = [...customPeriods];
                              updated[index].name = e.target.value;
                              setCustomPeriods(updated);
                            }}
                            style={{ width: '55px', padding: '5px', borderRadius: '8px', border: `1px solid ${theme.darkgreen}`, textAlign: 'center', fontWeight: 'bold', backgroundColor: theme.backgroundcolor }}
                            placeholder="שם"
                          />
                          <input
                            type="date"
                            value={period.startDate}
                            onChange={(e) => {
                              const updated = [...customPeriods];
                              updated[index].startDate = e.target.value;
                              setCustomPeriods(updated);
                            }}
                            style={{ flex: 1, padding: '5px', borderRadius: '8px', border: `1px solid ${theme.darkgreen}`, backgroundColor: theme.backgroundcolor, width: "115px" }}
                          />
                          <span>עד</span>
                          <input
                            type="date"
                            value={period.endDate}
                            onChange={(e) => {
                              const updated = [...customPeriods];
                              updated[index].endDate = e.target.value;
                              setCustomPeriods(updated);
                            }}
                            style={{ flex: 1, padding: '5px', borderRadius: '8px', border: `1px solid ${theme.darkgreen}`, backgroundColor: theme.backgroundcolor, width: "115px" }}
                          />
                          <button
                            onClick={() => {
                              const updated = customPeriods.filter((_, i) => i !== index);
                              savePeriodsToServer(updated); // שומר לשרת מיד במחיקה
                            }}
                            style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            מחק
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const newName = prompt("הקלידי שם תקופה חדשה (למשל 1.27):");
                        if (newName) {
                          setCustomPeriods([...customPeriods, { name: newName, startDate: '', endDate: '' }]);
                        }
                      }}
                      style={{ padding: '6px 12px', background: theme.pink, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                    >
                      הוסף תקופה חדשה
                    </button>
                    <button
                      onClick={() => savePeriodsToServer(customPeriods)}
                      style={{ padding: '6px 12px', background: theme.pink, color: theme.darkgreen, border: `1px solid ${theme.darkgreen}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                    >
                      שמור
                    </button>
                  </div>

                  <div style={{ background: theme.pink, padding: '15px', borderRadius: '20px', marginTop: '15px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '20px', color: theme.darkgreen }}> יצירת סוג תורנות חדש</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input type="text" value={shiftTypeForm.name} onChange={(e) => setShiftTypeForm({ ...shiftTypeForm, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}` }} placeholder="שם התורנות" />

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '14px', color: theme.darkgreen }}>בחר צבע פנוי:</label>
                        {/* וודאי שזה נראה בדיוק ככה: */}
                        {getAvailableColors().map((colorOption) => (
                          <button
                            key={colorOption.value}
                            type="button" // חשוב להוסיף כדי שלא ינסה "לשלוח" את הטופס בטעות
                            onClick={() => setShiftTypeForm(prev => ({ ...prev, color: colorOption.value }))}
                            style={{
                              width: '30px', height: '30px', borderRadius: '50%', backgroundColor: colorOption.value, border: shiftTypeForm.color === colorOption.value ? `3px solid ${theme.textDark}` : 'none', cursor: 'pointer'
                            }}
                          />
                        ))}

                      </div>
                      <div style={{ alignItems: "right", marginLeft: "70px" }}>
                        <label style={{ color: theme.darkgreen, fontSize: "13px", marginleft: "3px" }}>ערך נקודות ליום:</label>
                        <input
                          type="number"
                          step="0.5"
                          style={{ width: '70%', padding: '6px', borderRadius: "15px", marginRight: "0px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                          value={shiftTypeForm.points_base}
                          onChange={(e) => setNewShiftType({ ...shiftTypeForm, points_base: parseFloat(e.target.value) })}
                          placeholder="לדוגמה: 1"
                        />
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <label style={{ color: theme.darkgreen, fontSize: "13px", marginleft: "3px" }}>הגבלת מגדר לתורנות:</label>
                        <select value={newShiftTypeGenderLimit} onChange={(e) => setNewShiftTypeGenderLimit(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: "15px", backgroundColor: theme.backgroundcolor }}>
                          <option value="all">כולם</option>
                          <option value="male">בנים בלבד</option>
                          <option value="female">בנות בלבד</option>
                        </select>
                      </div>
                      <button onClick={handleSaveShiftType} style={{ padding: '8px 15px', background: theme.backgroundcolor, color: theme.darkgreen, fontSize: "15px", fontWeight: "bold", borderRadius: '5px', cursor: 'pointer', alignSelf: 'flex-start', border: `1px solid  ${theme.darkgreen}` }}>צור סוג תורנות</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* חלון שיבוץ תורנות */}
      {
        isModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58, 33, 25, 0.6)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: theme.backgroundcolor, padding: '30px', borderRadius: '10px', width: '400px', position: 'relative', color: theme.darkgreen }}>
              <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.darkgreen }}>✖</button>
              <h2 style={{ marginTop: 0, paddingBottom: '10px', color: theme.darkgreen }}>{editingShiftId ? 'עריכת תורנות' : 'שיבוץ תורנות חדשה'}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>

                {/* תאריך התחלה - בדיקה אוטומטית */}
                {/* --- אזור התאריכים והחייל בתוך ה-Modal --- */}

                {/* תאריך התחלה */}
                <div>
                  <label>תאריך התחלה:</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      // בדיקה אוטומטית האם הטווח החדש כולל שבת
                      const isWeekend = doesRangeContainShabbat(newStart, formData.endDate);
                      setFormData({ ...formData, startDate: newStart, isWeekend: isWeekend });
                      checkConflict(formData.userId, newStart, formData.endDate, formData.shiftTypeId);
                    }}
                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                  />
                </div>

                {/* תאריך סיום */}
                <div>
                  <label>תאריך סיום:</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      // בדיקה אוטומטית האם הטווח החדש כולל שבת
                      const isWeekend = doesRangeContainShabbat(formData.startDate, newEnd);
                      setFormData({ ...formData, endDate: newEnd, isWeekend: isWeekend });
                      checkConflict(formData.userId, formData.startDate, newEnd, formData.shiftTypeId);
                    }}
                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                  />
                </div>

                {/* בחירת חייל */}
                <div>
                  <label>בחר חייל:</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => {
                      const newUserId = e.target.value;
                      setFormData({ ...formData, userId: newUserId });
                      // בדיקה עם החייל החדש מול התאריכים הקיימים
                      checkConflict(newUserId, formData.startDate, formData.endDate, formData.shiftTypeId);
                    }}
                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                  >
                    <option value="">בחר חייל</option>
                    {getAvailableSoldiers().map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* סוג תורנות */}
                <div>
                  <label>סוג תורנות:</label>
                  <select
                    value={formData.shiftTypeId}
                    onChange={(e) => {
                      const newTypeId = e.target.value;
                      // אנחנו לא בודקים יותר את שם התורנות! נשארים עם מה שהיה או משנים ידנית
                      setFormData({ ...formData, shiftTypeId: newTypeId });
                      checkConflict(formData.userId, formData.startDate, formData.endDate, newTypeId);
                    }}

                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
                  >
                    <option value="">בחר סוג תורנות</option>
                    {shiftTypes.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>הערות:</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: "15px",
                      backgroundColor: theme.backgroundcolor,
                      border: `1.5px solid ${theme.darkgreen}`,
                      color: theme.darkgreen,
                      minHeight: '80px',
                      resize: 'vertical'
                    }}
                    placeholder="הוסיפי הערה לתורנות..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={formData.isWeekend} onChange={(e) => setFormData({ ...formData, isWeekend: e.target.checked })} /> שבת
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={displayBaltam} disabled={forcedBaltam} onChange={(e) => setFormData({ ...formData, isBaltam: e.target.checked })} /> בלת"ם
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={hasReplacement}
                      onChange={async (e) => {
                        const isChecked = e.target.checked;

                        if (!isChecked) {
                          // 1. הורדת הסימון: ביטול ההחלפה
                          if (replacementData.id) {
                            try {
                              await fetch(`http://localhost:3001/api/shift-exemptions/${replacementData.id}`, { method: 'DELETE' });

                              // 2. עדכון מיידי של הסטייטים כדי שהלוח יתנקה
                              setHasReplacement(false);
                              setReplacementData({ shift_id: '', start_date: '', end_date: '', type: 'pet' });

                              // 3. רענון הנתונים
                              await fetchShiftExemptions();
                              await fetchShifts();

                              alert("ההחלפה הוסרה בהצלחה.");
                            } catch (err) {
                              console.error("שגיאה במחיקה:", err);
                            }
                          } else {
                            setHasReplacement(false);
                          }
                        } else {
                          // 4. הוספת הסימון: פתיחת המודאל
                          setHasReplacement(true);
                          setIsReplacementModalOpen(true);
                        }
                      }}
                    />
                    הוסף החלפה
                  </label>
                </div>

                {/* שורת הכפתורים */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={handleSaveShift} style={{ flex: 1, padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>{editingShiftId ? 'עדכן' : 'שמור ושבץ'}</button>
                  {editingShiftId && <button onClick={handleDelete} style={{ flex: 1, padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>מחק</button>}
                  {/* כפתור שכפול */}
                  <button onClick={handleDuplicateClick} style={{ flex: 1, padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                    שכפל
                  </button>
                  {/* נוסיף כפתור פיצול ליד כפתור השכפול */}
                  {editingShiftId && (
                    <button onClick={() => setIsSplitModalOpen(true)} style={{ flex: 1, padding: '12px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                      פצל תורנות
                    </button>

                  )}
                </div>


                {isSplitModalOpen && (
                  <div style={{ background: theme.darkgreen, padding: '15px', borderRadius: '8px', marginTop: '5px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: theme.pink }}> פיצול תורנות</h4>
                    <p style={{ fontSize: '12px', margin: '0 0 10px 0', color: theme.pink }}>בחר מאיזה תאריך להתחיל את החלק השני של התורנות (החלק המפוצל ייווצר כמשבצת ריקה ללא חייל):</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="date" value={splitDate} onChange={(e) => setSplitDate(e.target.value)} min={formData.startDate} max={formData.endDate} style={{ flex: 1, padding: '8px', backgroundColor: theme.pink, color: theme.darkgreen, borderRadius: '6px' }} />
                      <button onClick={handleSplitShift} style={{ flex: 1, padding: 'px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>בצע חיתוך</button>
                      <button onClick={() => setIsSplitModalOpen(false)} style={{ flex: 1, padding: '5px', background: theme.pink, color: theme.darkgreen, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>ביטול</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
      {isReplacementModalOpen && (
        <div style={{ position: "fixed", top: "0", left: "0", width: "100%", height: "100%", background: "rgba(0, 0, 0, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: "99999" }}>
          <div style={{ background: theme.backgroundcolor, padding: "25px", borderRadius: "15px", width: "350px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <button onClick={() => {
              setIsReplacementModalOpen(false);
              // אם המשתמש ביטל את הפעולה, ננקה גם את ה-Checkbox
              if (!replacementData.id) setHasReplacement(false); setReplacementForm({ type: 'pet', startDate: '', endDate: '', startTime: '', endTime: '' });
            }} style={{ position: "relative", top: '-13px', right: '150px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.darkgreen }}>✖</button>

            <h3 style={{ marginTop: "-20px" }}>פרטי החלפה</h3>
            <label style={{ fontSize: '15px', display: 'block', marginTop: "-10px", marginBottom: '-5px', color: theme.darkgreen, textAlign: "right" }}>
              בחירת סוג החלפה
            </label>
            <select
              value={replacementForm.type || 'pet'}
              onChange={(e) => {
                console.log("סוג החלפה נבחר:", e.target.value);
                setReplacementForm({ ...replacementForm, type: e.target.value });
              }}
              style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }}
            >
              <option value="pet">החלפת פרח טיס (פט)</option>
              <option value="squadron">החלפה עם טייסת אחרת</option>
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.darkgreen, textAlign: "right" }}>תאריך התחלה</label>
                <input type="date" value={replacementForm.startDate}
                  // הערך מגיע מהתורנות שאנחנו עורכים כרגע
                  min={shifts.find(s => s.id == editingShiftId)?.originalStart?.split('T')[0]}
                  max={shifts.find(s => s.id == editingShiftId)?.originalEnd?.split('T')[0]}
                  onChange={(e) => setReplacementForm({ ...replacementForm, startDate: e.target.value })} style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.darkgreen, textAlign: "right" }}>תאריך סיום</label>
                <input type="date" value={replacementForm.endDate}
                  // הערך מגיע מהתורנות שאנחנו עורכים כרגע
                  min={shifts.find(s => s.id == editingShiftId)?.originalStart?.split('T')[0]}
                  max={shifts.find(s => s.id == editingShiftId)?.originalEnd?.split('T')[0]}
                  onChange={(e) => setReplacementForm({ ...replacementForm, endDate: e.target.value })} style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.darkgreen, textAlign: "right" }}>שעת התחלה</label>
                <input type="time"
                  value={replacementForm.startTime || ''}
                  onChange={(e) => handleTimeChange(e, 'startTime')} placeholder="שעה התחלה (רשות)" style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '15px', display: 'block', marginBottom: '2px', color: theme.darkgreen, textAlign: "right" }}>שעת סיום</label>
                <input type="time"
                  value={replacementForm.endTime || ''}
                  onChange={(e) => handleTimeChange(e, 'endTime')} placeholder="שעה סיום (רשות)" style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: "15px", backgroundColor: theme.backgroundcolor, border: `1px solid ${theme.darkgreen}`, color: theme.darkgreen }} />
              </div>
            </div>

            <button
              onClick={async () => {
                // 1. קביעת ה-URL לפי מצב עריכה או יצירה
                const url = replacementData.id
                  ? `http://localhost:3001/api/shift-exemptions/${replacementData.id}`
                  : 'http://localhost:3001/api/shift-exemptions';

                // 2. קביעת השיטה (PUT לעדכון, POST ליצירה)
                const method = replacementData.id ? 'PUT' : 'POST';

                try {
                  const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      shift_id: editingShiftId,
                      start_date: replacementForm.startDate,
                      end_date: replacementForm.endDate,
                      type: replacementForm.type,
                      start_time: replacementForm.startTime || null,
                      end_time: replacementForm.endTime || null
                    })
                  });

                  if (!response.ok) throw new Error("שגיאה בשמירת ההחלפה");

                  alert(replacementData.id ? "ההחלפה עודכנה בהצלחה!" : "ההחלפה נוצרה בהצלחה!");

                  setIsReplacementModalOpen(false);
                  setReplacementForm({ type: 'pet', startDate: '', endDate: '', startTime: '', endTime: '' });
                  setReplacementData({ shift_id: '', start_date: '', end_date: '', type: 'pet' }); // איפוס
                  fetchShiftExemptions(); // רענון הנתונים
                } catch (err) {
                  console.error(err);
                  alert("קרתה שגיאה, נסי שוב");
                }
              }}
              style={{
                flex: 1,
                padding: '12px',
                background: theme.pink,
                color: theme.darkgreen,
                marginTop: "10px",
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '15px'
              }}
            >
              {replacementData.id ? 'עדכן החלפה' : 'שמור החלפה'}
            </button>
          </div>
        </div>

      )}
      {currentScreen === 'dashboard' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: theme.backgroundcolor, zIndex: 9999, padding: '40px', overflowY: 'auto', direction: 'rtl' }}>
          <button onClick={() => setCurrentScreen('calendar')} style={{ padding: '8px 16px', fontSize: "17px", background: theme.pink, color: theme.darkgreen, position: "relative", right: "860px", top: "40px", border: `1px solid ${theme.darkgreen}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>חזרה ללוח</button>
          <h1 style={{ color: theme.darkgreen }}>טבלת השוואה - דוח מפורט</h1>
          {/* בורר תקופות לדוח ההשוואה */}
          <div style={{ display: 'flex', alignItems: 'center', width: "200px", gap: '10px', padding: '8px 15px', borderRadius: '12px', marginBottom: "20px" }}>
            <label style={{ fontSize: '15px', fontWeight: 'bold', color: theme.darkgreen }}>תקופה:</label>
            <select
              value={displayedPeriodStr}
              onChange={(e) => {
                const [half, year] = e.target.value.split('.');
                const month = half === '1' ? 0 : 6;
                const newDate = new Date(2000 + parseInt(year), month, 1);
                setStatsDate(newDate);
              }}
              style={{ padding: '5px', borderRadius: '8px', border: `1px solid ${theme.darkgreen}`, backgroundColor: theme.backgroundcolor, color: theme.darkgreen, fontWeight: 'bold', cursor: 'pointer' }}
            >
              {getGeneratedPeriods().map(period => (
                <option key={period} value={period}>תקופה {period}</option>
              ))}
            </select>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: theme.backgroundcolor, border: `2px solid ${theme.darkgreen}`, borderRadius: "30px" }}>
            <thead>
              <tr style={{ background: theme.darkgreen, color: theme.backgroundcolor, borderRadius: "30px" }}>
                <th style={{ padding: '10px' }}>שם החייל</th>
                <th style={{ padding: '10px' }}>נקודות נטו</th>
                <th style={{ padding: '10px' }}>שבתות</th>
                <th style={{ padding: '10px' }}>שוש</th>
                <th style={{ padding: '10px' }}>מקוצרת</th>
                <th style={{ padding: '10px' }}>בלת"מים</th> {/* החזרתי את העמודה */}
                {shiftTypes.map(type => (
                  <th key={type.id} style={{ padding: '10px' }}>{type.name}</th>
                ))}
                <th style={{ padding: '10px' }}>פירוט חגים</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.is_active === 1 && (u.does_shifts === 1 || u.does_shifts === null)).map(user => {
                const stats = getNetStats(user.id, displayedPeriodShifts, shiftTypes);
                const userShifts = displayedPeriodShifts.filter(s => s.userId == user.id);
                const balatamsCount = userShifts.filter(s => s.isBaltam).length; // חישוב הבלתמים

                return (
                  <tr key={user.id} style={{ borderBottom: `2px solid ${theme.darkgreen}` }}>
                    <td style={{ padding: '10px', border: `1px solid ${theme.darkgreen}` }}>{user.full_name}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', border: `1px solid ${theme.darkgreen}` }}>{stats.netPoints}</td>
                    <td style={{ padding: '10px', border: `1px solid ${theme.darkgreen}` }}>{stats.netShabbats}</td>
                    <td style={{ padding: '10px', border: `1px solid ${theme.darkgreen}` }}>{stats.shushCount}</td>
                    <td style={{ padding: '10px', border: `1px solid ${theme.darkgreen}` }}>{stats.mkuẓeretCount}</td>
                    <td style={{ padding: '10px', color: theme.darkgreen, border: `1px solid ${theme.darkgreen}` }}>{balatamsCount}</td> {/* הצגה */}

                    {shiftTypes.map(type => {
                      const count = userShifts.filter(s => s.shiftTypeId == type.id).length;
                      return <td key={type.id} style={{ padding: '10px', border: `1px solid ${theme.darkgreen}` }}>{count}</td>;
                    })}

                    <td style={{ padding: '10px', fontSize: '20px', border: `1px solid ${theme.darkgreen}` }}>
                      {(() => {
                        const holidays = userShifts.filter(s => s.isHoliday && s.holidayName).map(s => s.holidayName);
                        const uniqueHolidays = [...new Set(holidays)];
                        return uniqueHolidays.length > 0 ? uniqueHolidays.join(', ') : 'אין';
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div >

  );
}

export default App;