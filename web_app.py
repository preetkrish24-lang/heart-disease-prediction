from flask import Flask, render_template, request
import pickle
import os
import pandas as pd
from ucimlrepo import fetch_ucirepo
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

MODEL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "heart_model.pkl")

# ── Load or Train Model ─────────────────────────────────────────
def get_model():
    if os.path.exists(MODEL_FILE):
        with open(MODEL_FILE, "rb") as f:
            return pickle.load(f)
    print("Training model for the first time...")
    data = fetch_ucirepo(id=45)
    X = data.data.features.fillna(data.data.features.median())
    y = (data.data.targets > 0).astype(int)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train.values.ravel())
    acc = accuracy_score(y_test, model.predict(X_test))
    with open(MODEL_FILE, "wb") as f:
        pickle.dump({"model": model, "acc": acc}, f)
    print(f"Model trained! Accuracy: {acc*100:.1f}%")
    return {"model": model, "acc": acc}

model_data = get_model()

# ── Routes ──────────────────────────────────────────────────────
@app.route("/")
def home():
    accuracy = f"{model_data['acc'] * 100:.1f}%"
    return render_template("index.html", accuracy=accuracy)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        fields = ["age", "sex", "cp", "trestbps", "chol",
                  "fbs", "restecg", "thalach", "exang",
                  "oldpeak", "slope", "ca", "thal"]

        values = {field: float(request.form[field]) for field in fields}
        df = pd.DataFrame([values])

        prob = model_data["model"].predict_proba(df)[0][1]
        pct  = round(prob * 100, 1)

        if prob >= 0.5:
            result   = "HIGH RISK"
            color    = "red"
            advice   = "High likelihood of heart disease detected. Please consult a cardiologist immediately."
            emoji    = "Warning"
        else:
            result   = "LOW RISK"
            color    = "green"
            advice   = "Low likelihood of heart disease. Keep maintaining a healthy lifestyle!"
            emoji    = "Safe"

        accuracy = f"{model_data['acc'] * 100:.1f}%"
        return render_template("index.html",
                               result=result,
                               color=color,
                               advice=advice,
                               emoji=emoji,
                               probability=pct,
                               accuracy=accuracy,
                               form_data=values)
    except Exception as e:
        return f"Error: {e}", 400

if __name__ == "__main__":
    import os
    print("\n" + "="*50)
    print("  Heart Disease Prediction Web App")
    print("  By Krish Verma")
    print("="*50)
    print(f"  Model Accuracy : {model_data['acc']*100:.1f}%")
    print("  Open browser   : http://127.0.0.1:5000")
    print("="*50 + "\n")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
