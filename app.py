from flask import Flask, render_template, request, redirect, url_for
import sqlite3
from datetime import datetime
import os

# ---------------- FLASK APP ----------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(
    __name__,
    template_folder=TEMPLATE_DIR
)

# Database file inside project folder
DATABASE = os.path.join(BASE_DIR, "database.db")


# ---------------- DATABASE ----------------

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
    conn.close()


# Initialize database when Flask/Gunicorn starts
init_db()


# ---------------- DASHBOARD ----------------

@app.route("/")
def index():

    conn = get_db()

    transactions = conn.execute(
        "SELECT * FROM transactions ORDER BY date DESC, id DESC"
    ).fetchall()

    income = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) "
        "FROM transactions WHERE type='income'"
    ).fetchone()[0]

    expense = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) "
        "FROM transactions WHERE type='expense'"
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

    conn.close()

    return render_template(
        "index.html",
        transactions=transactions,
        income=income,
        expense=expense,
        balance=balance,
        category_labels=category_labels,
        category_values=category_values
    )


# ---------------- ADD EXPENSE ----------------

@app.route("/add-expense", methods=["GET", "POST"])
def add_expense():

    if request.method == "POST":

        amount = request.form["amount"]
        category = request.form["category"]
        payment_method = request.form["payment_method"]
        note = request.form["note"]
        date = request.form["date"]

        conn = get_db()

        conn.execute("""
            INSERT INTO transactions
            (type, amount, category, payment_method, note, date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "expense",
            amount,
            category,
            payment_method,
            note,
            date
        ))

        conn.commit()
        conn.close()

        return redirect(url_for("index"))

    return render_template("add_expense.html")


# ---------------- ADD INCOME ----------------

@app.route("/add-income", methods=["GET", "POST"])
def add_income():

    if request.method == "POST":

        amount = request.form["amount"]
        category = request.form["category"]
        payment_method = request.form["payment_method"]
        note = request.form["note"]
        date = request.form["date"]

        conn = get_db()

        conn.execute("""
            INSERT INTO transactions
            (type, amount, category, payment_method, note, date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "income",
            amount,
            category,
            payment_method,
            note,
            date
        ))

        conn.commit()
        conn.close()

        return redirect(url_for("index"))

    return render_template("add_income.html")


# ---------------- HISTORY ----------------

@app.route("/history")
def history():

    conn = get_db()

    transactions = conn.execute(
        "SELECT * FROM transactions "
        "ORDER BY date DESC, id DESC"
    ).fetchall()

    conn.close()

    return render_template(
        "history.html",
        transactions=transactions
    )


# ---------------- EDIT TRANSACTION ----------------

@app.route("/edit/<int:transaction_id>", methods=["GET", "POST"])
def edit_transaction(transaction_id):

    conn = get_db()

    transaction = conn.execute(
        "SELECT * FROM transactions WHERE id=?",
        (transaction_id,)
    ).fetchone()

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
            SET amount=?,
                category=?,
                payment_method=?,
                note=?,
                date=?
            WHERE id=?
        """, (
            amount,
            category,
            payment_method,
            note,
            date,
            transaction_id
        ))

        conn.commit()
        conn.close()

        return redirect(url_for("history"))

    conn.close()

    return render_template(
        "edit_transaction.html",
        transaction=transaction
    )


# ---------------- DELETE TRANSACTION ----------------

@app.route("/delete/<int:transaction_id>")
def delete_transaction(transaction_id):

    conn = get_db()

    conn.execute(
        "DELETE FROM transactions WHERE id=?",
        (transaction_id,)
    )

    conn.commit()
    conn.close()

    return redirect(url_for("history"))


# ---------------- BUDGET ----------------

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
        """, (
            amount,
            current_month
        ))

        conn.commit()

    budget_data = conn.execute(
        "SELECT amount FROM budget WHERE month=?",
        (current_month,)
    ).fetchone()

    expense = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE type='expense'
        AND substr(date, 1, 7)=?
    """, (
        current_month,
    )).fetchone()[0]

    conn.close()

    budget_amount = (
        budget_data["amount"]
        if budget_data
        else 0
    )

    remaining = budget_amount - expense

    return render_template(
        "budget.html",
        budget=budget_amount,
        expense=expense,
        remaining=remaining
    )


# ---------------- RUN APPLICATION ----------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )