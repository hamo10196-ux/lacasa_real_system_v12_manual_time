
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "lacasa.db"));
db.pragma("journal_mode = WAL");

/*
  مهم:
  هنا CREATE TABLE بيعمل الجدول لو مش موجود فقط.
  مفيش تكرار للأعمدة.
  ولو عندك داتا بيز قديمة، addColumnIfMissing بيضيف الناقص بس.
*/

db.exec(`
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price REAL NOT NULL,
  single_price REAL,
  multi_price REAL,
  kind TEXT NOT NULL DEFAULT 'room',
  session_mode TEXT,
  color TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  customer_name TEXT,
  started_at TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  customer_price REAL NOT NULL,
  employee_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  place TEXT NOT NULL DEFAULT 'La casa'
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER,
  customer_id INTEGER,
  customer_name TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  customer_id INTEGER,
  customer_name TEXT,
  employee TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/* migrations for old database copies */
addColumnIfMissing("devices", "single_price", "REAL");
addColumnIfMissing("devices", "multi_price", "REAL");
addColumnIfMissing("devices", "kind", "TEXT NOT NULL DEFAULT 'room'");
addColumnIfMissing("devices", "session_mode", "TEXT");

addColumnIfMissing("orders", "customer_id", "INTEGER");
addColumnIfMissing("orders", "subtotal", "REAL NOT NULL DEFAULT 0");
addColumnIfMissing("orders", "discount", "REAL NOT NULL DEFAULT 0");
addColumnIfMissing("orders", "payment_type", "TEXT NOT NULL DEFAULT 'cash'");

addColumnIfMissing("transactions", "customer_id", "INTEGER");

function seed() {
  const deviceCount = db.prepare("SELECT COUNT(*) AS c FROM devices").get().c;

  if (deviceCount === 0) {
    const insertDevice = db.prepare(`
      INSERT INTO devices
      (name, type, price, single_price, multi_price, kind, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ["غرفة Tokyo", "PS5", 100, 100, 120, "room", "#a855f7"],
      ["غرفة Rio", "PS4", 80, 80, 100, "room", "#22c55e"],
      ["غرفة Berlin", "PS5", 100, 100, 120, "room", "#3b82f6"],
      ["غرفة Denver", "PS4", 80, 80, 100, "room", "#f43f5e"],
      ["غرفة Helsinki", "PS4", 80, 80, 100, "room", "#d946ef"],
      ["ترابيزة 1", "TABLE", 0, 0, 0, "table", "#f59e0b"],
      ["ترابيزة 2", "TABLE", 0, 0, 0, "table", "#f59e0b"],
      ["ترابيزة 3", "TABLE", 0, 0, 0, "table", "#f59e0b"]
    ].forEach(d => insertDevice.run(...d));
  } else {
    db.prepare("UPDATE devices SET kind = 'room' WHERE kind IS NULL").run();
    db.prepare("UPDATE devices SET single_price = price WHERE single_price IS NULL").run();
    db.prepare("UPDATE devices SET multi_price = price WHERE multi_price IS NULL").run();
  }

  const productCount = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;

  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products
      (name, category, customer_price, employee_price, quantity)
      VALUES (?, ?, ?, ?, ?)
    `);

    [
      ["بيبسي", "Soda", 10, 8, 50],
      ["شيبسي", "Food", 10, 8, 40],
      ["قهوة", "Hot Drink", 15, 12, 30],
      ["شاي", "Hot Drink", 10, 8, 60],
      ["وافل", "Waffle", 35, 30, 20],
      ["Fresh Mango", "Fresh juice", 35, 30, 20],
      ["Fresh Orange", "Fresh juice", 30, 25, 20],
      ["Combo", "Stand", 60, 55, 25]
    ].forEach(p => insertProduct.run(...p));
  }

  const customerCount = db.prepare("SELECT COUNT(*) AS c FROM customers").get().c;

  if (customerCount === 0) {
    const insertCustomer = db.prepare("INSERT INTO customers (name,balance,notes) VALUES (?,?,?)");

    [
      ["مروان", 0, ""],
      ["حليم", 155, "مديونية قديمة"],
      ["خالد", 0, ""]
    ].forEach(c => insertCustomer.run(...c));
  }
}

seed();

module.exports = db;
