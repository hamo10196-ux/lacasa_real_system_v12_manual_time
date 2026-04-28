
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = 3000;

// Simple login for local system
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
const USERS = [
  { username: "admin", password: "1234", role: "مدير النظام" },
  { username: "cashier", password: "123456", role: "موظف" }
];

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  }

  res.json({
    ok: true,
    user: {
      username: user.username,
      role: user.role
    }
  });
});


function nowIso() {
  return new Date().toISOString();
}

app.get("/api/dashboard", (req, res) => {
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='revenue'").get().total;
  const debt = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='debt'").get().total;
  const expenses = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='expense'").get().total;
  const cashAdjust = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type IN ('cash_add','cash_remove')").get().total;
  const available = db.prepare("SELECT COUNT(*) AS c FROM devices WHERE status='available'").get().c;
  const busy = db.prepare("SELECT COUNT(*) AS c FROM devices WHERE status='busy'").get().c;
  const recent = db.prepare("SELECT * FROM transactions ORDER BY id DESC LIMIT 8").all();

  res.json({
    revenue,
    debt,
    expenses,
    cash: revenue + cashAdjust - expenses,
    available,
    busy,
    recent
  });
});

/* Devices */
app.get("/api/devices", (req, res) => {
  res.json(db.prepare("SELECT * FROM devices ORDER BY id").all());
});

app.post("/api/devices", (req, res) => {
  const { name, type, price, single_price, multi_price, kind, color } = req.body;
  if (!name || !type || !price) return res.status(400).json({ error: "Missing device data" });

  const result = db.prepare(
    "INSERT INTO devices (name,type,price,single_price,multi_price,kind,color) VALUES (?,?,?,?,?,?,?)"
  ).run(
    name,
    type,
    Number(price || single_price || 0),
    Number(single_price || price || 0),
    Number(multi_price || price || 0),
    kind || "room",
    color || "#8b5cf6"
  );

  res.json({ id: result.lastInsertRowid });
});

app.put("/api/devices/:id", (req, res) => {
  const { name, type, price, single_price, multi_price, kind, color } = req.body;
  const current = db.prepare("SELECT * FROM devices WHERE id=?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Device not found" });

  db.prepare(
    "UPDATE devices SET name=?, type=?, price=?, single_price=?, multi_price=?, kind=?, color=? WHERE id=?"
  ).run(
    name || current.name,
    type || current.type,
    price !== undefined ? Number(price) : current.price,
    single_price !== undefined ? Number(single_price) : (current.single_price ?? current.price),
    multi_price !== undefined ? Number(multi_price) : (current.multi_price ?? current.price),
    kind || current.kind || "room",
    color || current.color,
    req.params.id
  );

  res.json({ ok: true });
});

app.delete("/api/devices/:id", (req, res) => {
  db.prepare("DELETE FROM devices WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/devices/:id/start", (req, res) => {
  const { customer_name, session_mode } = req.body;
  const id = req.params.id;

  db.prepare(
    "UPDATE devices SET status='busy', customer_name=?, started_at=?, session_mode=? WHERE id=?"
  ).run(customer_name || "عميل", nowIso(), session_mode || "single", id);

  res.json({ ok: true });
});

app.post("/api/devices/:id/end", (req, res) => {
  const id = req.params.id;
  const { discount = 0, customer_id = null } = req.body;
  const device = db.prepare("SELECT * FROM devices WHERE id=?").get(id);

  if (!device) return res.status(404).json({ error: "Device not found" });
  if (device.status !== "busy") return res.status(400).json({ error: "Device not busy" });

  const started = new Date(device.started_at);
  const diffHours = (new Date() - started) / (1000 * 60 * 60);
  const hourlyPrice = device.session_mode === 'multi' ? (device.multi_price || device.price) : (device.single_price || device.price);
  const sessionCost = device.kind === 'table' ? 0 : Math.ceil(diffHours * hourlyPrice);
  const finalTotal = Math.max(0, sessionCost - Number(discount || 0));

  let customerName = device.customer_name || "عميل";
  let type = "revenue";
  let title = `جلسة ${device.name}`;

  if (customer_id) {
    const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(customer_id);
    if (customer) {
      customerName = customer.name;
      db.prepare("UPDATE customers SET balance = balance + ? WHERE id=?").run(finalTotal, customer_id);
      type = "debt";
      title = `جلسة على حساب ${device.name}`;
    }
  }

  db.prepare(
    "INSERT INTO transactions (type,title,amount,customer_id,customer_name,employee) VALUES (?,?,?,?,?,?)"
  ).run(type, title, finalTotal, customer_id || null, customerName, "admin");

  db.prepare(
    "UPDATE devices SET status='available', customer_name=NULL, started_at=NULL WHERE id=?"
  ).run(id);

  res.json({ ok: true, sessionCost, discount: Number(discount || 0), total: finalTotal });
});



app.post("/api/devices/:id/manual-session", (req, res) => {
  const id = req.params.id;
  const {
    hours = 0,
    minutes = 0,
    session_mode = "single",
    discount = 0,
    customer_id = null,
    customer_name = "عميل"
  } = req.body;

  const device = db.prepare("SELECT * FROM devices WHERE id=?").get(id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const totalMinutes = (Number(hours || 0) * 60) + Number(minutes || 0);
  if (totalMinutes <= 0) return res.status(400).json({ error: "Time required" });

  const hourlyPrice = session_mode === "multi"
    ? Number(device.multi_price || device.price)
    : Number(device.single_price || device.price);

  const subtotal = Math.ceil((totalMinutes / 60) * hourlyPrice);
  const finalTotal = Math.max(0, subtotal - Number(discount || 0));

  let finalCustomerName = customer_name || "عميل";
  let type = "revenue";
  let title = `وقت يدوي ${device.name} (${hours}س ${minutes}د)`;

  if (customer_id) {
    const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(customer_id);
    if (customer) {
      finalCustomerName = customer.name;
      db.prepare("UPDATE customers SET balance = balance + ? WHERE id=?").run(finalTotal, customer_id);
      type = "debt";
      title = `وقت يدوي على حساب ${device.name} (${hours}س ${minutes}د)`;
    }
  }

  db.prepare(
    "INSERT INTO transactions (type,title,amount,customer_id,customer_name,employee) VALUES (?,?,?,?,?,?)"
  ).run(type, title, finalTotal, customer_id || null, finalCustomerName, "admin");

  res.json({
    ok: true,
    totalMinutes,
    hourlyPrice,
    subtotal,
    discount: Number(discount || 0),
    total: finalTotal
  });
});

app.put("/api/devices/:id/start-time", (req, res) => {
  const id = req.params.id;
  const { started_at } = req.body;

  if (!started_at) return res.status(400).json({ error: "Start time required" });

  const device = db.prepare("SELECT * FROM devices WHERE id=?").get(id);
  if (!device) return res.status(404).json({ error: "Device not found" });
  if (device.status !== "busy") return res.status(400).json({ error: "Device not busy" });

  db.prepare("UPDATE devices SET started_at=? WHERE id=?").run(started_at, id);
  res.json({ ok: true });
});


app.get("/api/devices/:id/active-invoice", (req, res) => {
  const id = req.params.id;
  const device = db.prepare("SELECT * FROM devices WHERE id=?").get(id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const startedAt = device.started_at || new Date(0).toISOString();

  const orders = db.prepare(`
    SELECT *
    FROM orders
    WHERE device_id=? AND created_at >= ?
    ORDER BY id DESC
  `).all(id, startedAt);

  const items = db.prepare(`
    SELECT oi.*
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.device_id=? AND o.created_at >= ?
    ORDER BY oi.id DESC
  `).all(id, startedAt);

  const ordersTotal = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  res.json({
    device,
    orders,
    items,
    ordersTotal
  });
});


/* Products */
app.get("/api/products", (req, res) => {
  res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all());
});

app.post("/api/products", (req, res) => {
  const { name, category, customer_price, employee_price, quantity, place } = req.body;
  if (!name || !category) return res.status(400).json({ error: "Missing product data" });

  const result = db.prepare(
    "INSERT INTO products (name,category,customer_price,employee_price,quantity,place) VALUES (?,?,?,?,?,?)"
  ).run(name, category, Number(customer_price), Number(employee_price), Number(quantity), place || "La casa");

  res.json({ id: result.lastInsertRowid });
});

app.delete("/api/products/:id", (req, res) => {
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});


/* Expenses */
app.get("/api/expenses", (req, res) => {
  const rows = db.prepare("SELECT * FROM transactions WHERE type='expense' ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/expenses", (req, res) => {
  const { title, amount, notes } = req.body;
  if (!title || !amount) return res.status(400).json({ error: "Expense title and amount required" });

  const finalTitle = notes ? `${title} - ${notes}` : title;

  const result = db.prepare(
    "INSERT INTO transactions (type,title,amount,customer_name,employee) VALUES (?,?,?,?,?)"
  ).run("expense", finalTitle, Number(amount), "-", "admin");

  res.json({ ok: true, id: result.lastInsertRowid });
});

app.delete("/api/expenses/:id", (req, res) => {
  db.prepare("DELETE FROM transactions WHERE id=? AND type='expense'").run(req.params.id);
  res.json({ ok: true });
});


/* Orders */
app.get("/api/orders", (req, res) => {
  res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all());
});

app.post("/api/orders", (req, res) => {
  const {
    device_id,
    customer_id = null,
    customer_name,
    discount = 0,
    payment_type = "cash",
    notes,
    items
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order items required" });
  }

  let finalCustomerName = customer_name || "عميل";
  if (customer_id) {
    const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(customer_id);
    if (customer) finalCustomerName = customer.name;
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const finalDiscount = Math.max(0, Number(discount || 0));
  const total = Math.max(0, subtotal - finalDiscount);

  const insertOrder = db.prepare(
    "INSERT INTO orders (device_id,customer_id,customer_name,subtotal,discount,total,payment_type,notes) VALUES (?,?,?,?,?,?,?,?)"
  );

  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id,product_id,product_name,qty,price) VALUES (?,?,?,?,?)"
  );

  const decreaseStock = db.prepare(
    "UPDATE products SET quantity = MAX(quantity - ?, 0) WHERE id=?"
  );

  const trx = db.transaction(() => {
    const result = insertOrder.run(
      device_id || null,
      customer_id || null,
      finalCustomerName,
      subtotal,
      finalDiscount,
      total,
      payment_type,
      notes || ""
    );

    const orderId = result.lastInsertRowid;

    items.forEach(item => {
      insertItem.run(orderId, item.id, item.name, item.qty, item.price);
      decreaseStock.run(item.qty, item.id);
    });

    if (payment_type === "debt" && customer_id) {
      db.prepare("UPDATE customers SET balance = balance + ? WHERE id=?").run(total, customer_id);
      db.prepare(
        "INSERT INTO transactions (type,title,amount,customer_id,customer_name,employee) VALUES (?,?,?,?,?,?)"
      ).run("debt", "أوردر على حساب العميل", total, customer_id, finalCustomerName, "admin");
    } else {
      db.prepare(
        "INSERT INTO transactions (type,title,amount,customer_id,customer_name,employee) VALUES (?,?,?,?,?,?)"
      ).run("revenue", "أوردر بوفيه", total, customer_id || null, finalCustomerName, "admin");
    }

    return orderId;
  });

  const orderId = trx();
  res.json({ ok: true, orderId, subtotal, discount: finalDiscount, total });
});

/* Customers */
app.get("/api/customers", (req, res) => {
  res.json(db.prepare("SELECT * FROM customers ORDER BY id DESC").all());
});

app.post("/api/customers", (req, res) => {
  const { name, balance, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const result = db.prepare(
    "INSERT INTO customers (name,balance,notes) VALUES (?,?,?)"
  ).run(name, Number(balance || 0), notes || "");

  res.json({ id: result.lastInsertRowid });
});

app.put("/api/customers/:id", (req, res) => {
  const { name, balance, notes } = req.body;
  const current = db.prepare("SELECT * FROM customers WHERE id=?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Customer not found" });

  db.prepare("UPDATE customers SET name=?, balance=?, notes=? WHERE id=?")
    .run(name || current.name, balance !== undefined ? Number(balance) : current.balance, notes || current.notes || "", req.params.id);

  res.json({ ok: true });
});

app.delete("/api/customers/:id", (req, res) => {
  db.prepare("DELETE FROM customers WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

/* Reports */
app.get("/api/reports", (req, res) => {
  const rows = db.prepare(`
    SELECT date(created_at) AS day,
           SUM(CASE WHEN type='revenue' THEN amount ELSE 0 END) AS revenue,
           SUM(CASE WHEN type='debt' THEN amount ELSE 0 END) AS debt,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
           SUM(CASE WHEN type IN ('cash_add','cash_remove') THEN amount ELSE 0 END) AS cashAdjust
    FROM transactions
    GROUP BY date(created_at)
    ORDER BY day DESC
    LIMIT 30
  `).all();

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const totalDebt = rows.reduce((s, r) => s + Number(r.debt || 0), 0);
  const totalExpenses = rows.reduce((s, r) => s + Number(r.expenses || 0), 0);
  const totalCashAdjust = rows.reduce((s, r) => s + Number(r.cashAdjust || 0), 0);

  res.json({
    rows,
    totalRevenue,
    totalDebt,
    totalExpenses,
    totalCashAdjust,
    net: totalRevenue + totalCashAdjust - totalExpenses
  });
});


/* Cash Adjustments */
app.get("/api/cash-adjustments", (req, res) => {
  const rows = db.prepare("SELECT * FROM transactions WHERE type IN ('cash_add','cash_remove') ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/cash-adjustments", (req, res) => {
  const { action, title, amount, notes } = req.body;
  if (!action || !amount) return res.status(400).json({ error: "Action and amount required" });

  const type = action === "remove" ? "cash_remove" : "cash_add";
  const finalTitle = title || (type === "cash_add" ? "إضافة نقدية" : "سحب نقدية");
  const signedAmount = type === "cash_remove" ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

  const result = db.prepare(
    "INSERT INTO transactions (type,title,amount,customer_name,employee) VALUES (?,?,?,?,?)"
  ).run(type, notes ? `${finalTitle} - ${notes}` : finalTitle, signedAmount, "-", "admin");

  res.json({ ok: true, id: result.lastInsertRowid });
});

/* Customer Payments */
app.post("/api/customers/:id/pay", (req, res) => {
  const { amount, notes } = req.body;
  const id = req.params.id;
  const payAmount = Math.abs(Number(amount || 0));

  if (!payAmount) return res.status(400).json({ error: "Amount required" });

  const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  db.prepare("UPDATE customers SET balance = balance - ? WHERE id=?").run(payAmount, id);

  db.prepare(
    "INSERT INTO transactions (type,title,amount,customer_id,customer_name,employee) VALUES (?,?,?,?,?,?)"
  ).run("revenue", notes ? `تحصيل من عميل - ${notes}` : "تحصيل من عميل", payAmount, id, customer.name, "admin");

  res.json({ ok: true });
});

/* Day Close */
app.get("/api/day-close/today", (req, res) => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

  const rows = db.prepare(`
    SELECT *
    FROM transactions
    WHERE date(created_at, 'localtime') = ?
    ORDER BY id DESC
  `).all(today);

  const revenue = rows.filter(r => r.type === "revenue").reduce((s,r)=>s+Number(r.amount),0);
  const debt = rows.filter(r => r.type === "debt").reduce((s,r)=>s+Number(r.amount),0);
  const expenses = rows.filter(r => r.type === "expense").reduce((s,r)=>s+Number(r.amount),0);
  const cashAdds = rows.filter(r => r.type === "cash_add").reduce((s,r)=>s+Number(r.amount),0);
  const cashRemoves = rows.filter(r => r.type === "cash_remove").reduce((s,r)=>s+Number(r.amount),0);

  res.json({
    day: today,
    revenue,
    debt,
    expenses,
    cashAdds,
    cashRemoves,
    netCash: revenue + cashAdds + cashRemoves - expenses,
    rows
  });
});

app.post("/api/day-close/close", (req, res) => {
  const { notes } = req.body;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

  const exists = db.prepare(
    "SELECT * FROM transactions WHERE type='day_close' AND date(created_at, 'localtime')=?"
  ).get(today);

  if (exists) return res.status(400).json({ error: "Day already closed" });

  const summary = db.prepare(`
    SELECT
      SUM(CASE WHEN type='revenue' THEN amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN type='debt' THEN amount ELSE 0 END) AS debt,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
      SUM(CASE WHEN type='cash_add' THEN amount ELSE 0 END) AS cashAdds,
      SUM(CASE WHEN type='cash_remove' THEN amount ELSE 0 END) AS cashRemoves
    FROM transactions
    WHERE date(created_at, 'localtime') = ?
  `).get(today);

  const netCash = Number(summary.revenue || 0) + Number(summary.cashAdds || 0) + Number(summary.cashRemoves || 0) - Number(summary.expenses || 0);

  db.prepare(
    "INSERT INTO transactions (type,title,amount,customer_name,employee) VALUES (?,?,?,?,?)"
  ).run("day_close", notes ? `تقفيل يوم ${today} - ${notes}` : `تقفيل يوم ${today}`, netCash, "-", "admin");

  res.json({ ok: true, day: today, netCash });
});


/* Settings */
app.post("/api/settings/clear-business", (req, res) => {
  db.prepare("DELETE FROM orders").run();
  db.prepare("DELETE FROM order_items").run();
  db.prepare("DELETE FROM transactions").run();
  db.prepare("UPDATE devices SET status='available', customer_name=NULL, started_at=NULL").run();
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`LaCasa system is running: http://localhost:${PORT}`);
});
