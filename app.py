from flask import Flask, render_template, request, redirect, url_for, jsonify
import sqlite3
from datetime import datetime
import os

# ---------------- FLASK APP CONFIG ----------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(
    __name__,
    template_folder=TEMPLATE_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static"
)

# Database file inside project folder
DATABASE = os.path.join(BASE_DIR, "database.db")


# ---------------- DATABASE HELPERS ----------------

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            payment_method TEXT,
            note TEXT,
            date TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS budget (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            month TEXT NOT NULL UNIQUE
        )
    """)

    conn.commit()

    # Seed demo data if database is fresh/empty
    count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    if count == 0:
        today = datetime.now().strftime("%Y-%m-%d")
        sample_entries = [
            ("income", 95000, "Salary & Wages", "Bank Transfer", "Core Engineering Salary", today),
            ("income", 28000, "Freelance & Side", "Stripe", "Cyber Web3 UI Contract", today),
            ("expense", 22000, "Housing & Bills", "UPI", "Penthouse Apartment Lease", today),
            ("expense", 8500, "Food & Dining", "Credit Card", "Gourmet Bistro & Team Dinners", today),
            ("expense", 14200, "Shopping & Tech", "Credit Card", "4K UltraWide Monitor", today),
            ("expense", 3800, "Transport & Travel", "UPI", "EV Fast Charging & Uber Black", today),
            ("expense", 2400, "Entertainment", "NetBanking", "Neural Stream & Steam Games", today),
            ("expense", 3100, "Healthcare", "UPI", "Smart Whey & Crossfit Pass", today),
            ("expense", 6200, "Food & Dining", "Debit Card", "Organic Supermarket Stock", today)
        ]
        conn.executemany("""
            INSERT INTO transactions (type, amount, category, payment_method, note, date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, sample_entries)

        current_month = datetime.now().strftime("%Y-%m")
        conn.execute("""
            INSERT OR IGNORE INTO budget (amount, month)
            VALUES (?, ?)
        """, (65000, current_month))

        conn.commit()

    conn.close()


# Initialize database when Flask/Gunicorn starts
init_db()


# ---------------- MAIN 3D DASHBOARD ----------------

@app.route("/")
def index():
    conn = get_db()

    transactions = conn.execute(
        "SELECT * FROM transactions ORDER BY date DESC, id DESC"
    ).fetchall()

    income = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='income'"
    ).fetchone()[0]

    expense = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='expense'"
    ).fetchone()[0]

    balance = income - expense

    category_data = conn.execute("""
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE type='expense'
        GROUP BY category
        ORDER BY total DESC
    """).fetchall()

    category_labels = [row["category"] for row in category_data]
    category_values = [row["total"] for row in category_data]

    current_month = datetime.now().strftime("%Y-%m")
    budget_row = conn.execute(
        "SELECT amount FROM budget WHERE month=?", (current_month,)
    ).fetchone()
    monthly_budget = budget_row["amount"] if budget_row else 65000

    conn.close()

    return render_template(
        "index.html",
        transactions=transactions,
        income=income,
        expense=expense,
        balance=balance,
        category_labels=category_labels,
        category_values=category_values,
        monthly_budget=monthly_budget
    )


# ---------------- REST API (FOR 3D FRONTEND) ----------------

@app.route("/api/transactions", methods=["GET", "POST"])
def api_transactions():
    conn = get_db()

    if request.method == "POST":
        data = request.get_json() or request.form
        tx_type = data.get("type", "expense")
        amount = float(data.get("amount", 0))
        category = data.get("category", "Other")
        note = data.get("title") or data.get("note", "")
        payment_method = data.get("payment_method", "Digital")
        date_val = data.get("date") or datetime.now().strftime("%Y-%m-%d")

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions (type, amount, category, payment_method, note, date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (tx_type, amount, category, payment_method, note, date_val))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        return jsonify({
            "status": "success",
            "transaction": {
                "id": new_id,
                "type": tx_type,
                "amount": amount,
                "category": category,
                "note": note,
                "title": note,
                "date": date_val
            }
        }), 201

    rows = conn.execute("SELECT * FROM transactions ORDER BY date DESC, id DESC").fetchall()
    conn.close()

    tx_list = [
        {
            "id": row["id"],
            "type": row["type"],
            "amount": row["amount"],
            "category": row["category"],
            "title": row["note"] or row["category"],
            "date": row["date"]
        }
        for row in rows
    ]
    return jsonify(tx_list)


@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
def api_delete_transaction(transaction_id):
    conn = get_db()
    conn.execute("DELETE FROM transactions WHERE id=?", (transaction_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "deleted_id": transaction_id})


@app.route("/api/budget", methods=["GET", "POST"])
def api_budget():
    conn = get_db()
    current_month = datetime.now().strftime("%Y-%m")

    if request.method == "POST":
        data = request.get_json() or request.form
        amount = float(data.get("amount", 65000))

        conn.execute("""
            INSERT INTO budget (amount, month)
            VALUES (?, ?)
            ON CONFLICT(month)
            DO UPDATE SET amount = excluded.amount
        """, (amount, current_month))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "budget": amount, "month": current_month})

    budget_data = conn.execute(
        "SELECT amount FROM budget WHERE month=?", (current_month,)
    ).fetchone()
    conn.close()

    amount = budget_data["amount"] if budget_data else 65000
    return jsonify({"budget": amount, "month": current_month})


# ---------------- LEGACY WEB ROUTES ----------------

@app.route("/add-expense", methods=["GET", "POST"])
def add_expense():
    if request.method == "POST":
        amount = request.form["amount"]
        category = request.form["category"]
        payment_method = request.form.get("payment_method", "Digital")
        note = request.form.get("note", "")
        date = request.form.get("date", datetime.now().strftime("%Y-%m-%d"))

        conn = get_db()
        conn.execute("""
            INSERT INTO transactions
            (type, amount, category, payment_method, note, date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("expense", amount, category, payment_method, note, date))
        conn.commit()
        conn.close()
        return redirect(url_for("index"))

    return render_template("add_expense.html")


@app.route("/add-income", methods=["GET", "POST"])
def add_income():
    if request.method == "POST":
        amount = request.form["amount"]
        category = request.form["category"]
        payment_method = request.form.get("payment_method", "Digital")
        note = request.form.get("note", "")
        date = request.form.get("date", datetime.now().strftime("%Y-%m-%d"))

        conn = get_db()
        conn.execute("""
            INSERT INTO transactions
            (type, amount, category, payment_method, note, date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("income", amount, category, payment_method, note, date))
        conn.commit()
        conn.close()
        return redirect(url_for("index"))

    return render_template("add_income.html")


@app.route("/history")
def history():
    conn = get_db()
    transactions = conn.execute("SELECT * FROM transactions ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return render_template("history.html", transactions=transactions)


@app.route("/edit/<int:transaction_id>", methods=["GET", "POST"])
def edit_transaction(transaction_id):
    conn = get_db()
    transaction = conn.execute("SELECT * FROM transactions WHERE id=?", (transaction_id,)).fetchone()

    if transaction is None:
        conn.close()
        return redirect(url_for("history"))

    if request.method == "POST":
        amount = request.form["amount"]
        category = request.form["category"]
        payment_method = request.form["payment_method"]
        note = request.form["note"]
        date = request.form["date"]

        conn.execute("""
            UPDATE transactions
            SET amount=?, category=?, payment_method=?, note=?, date=?
            WHERE id=?
        """, (amount, category, payment_method, note, date, transaction_id))
        conn.commit()
        conn.close()
        return redirect(url_for("index"))

    conn.close()
    return render_template("edit_transaction.html", transaction=transaction)


@app.route("/delete/<int:transaction_id>")
def delete_transaction(transaction_id):
    conn = get_db()
    conn.execute("DELETE FROM transactions WHERE id=?", (transaction_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("index"))


@app.route("/budget", methods=["GET", "POST"])
def budget():
    current_month = datetime.now().strftime("%Y-%m")
    conn = get_db()

    if request.method == "POST":
        amount = request.form["amount"]
        conn.execute("""
            INSERT INTO budget (amount, month)
            VALUES (?, ?)
            ON CONFLICT(month)
            DO UPDATE SET amount = excluded.amount
        """, (amount, current_month))
        conn.commit()

    budget_data = conn.execute("SELECT amount FROM budget WHERE month=?", (current_month,)).fetchone()
    expense = conn.execute("""
        SELECT COALESCE(SUM(amount), 0) FROM transactions
        WHERE type='expense' AND substr(date, 1, 7)=?
    """, (current_month,)).fetchone()[0]
    conn.close()

    budget_amount = budget_data["amount"] if budget_data else 65000
    remaining = budget_amount - expense

    return render_template("budget.html", budget=budget_amount, expense=expense, remaining=remaining)


# ---------------- RUN APPLICATION ----------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )