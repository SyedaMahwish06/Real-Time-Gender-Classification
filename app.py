
from flask import Flask, render_template, request, jsonify
import cv2
import numpy as np
from tensorflow.keras.models import load_model
import base64
import csv
from datetime import datetime

app = Flask(__name__)

# Load model
model = load_model("model/gender_mobilenet.h5")

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

IMG_SIZE = 224


# ---------- CSV LOGGING ----------
def log_prediction(gender, confidence):
    with open("log.csv", "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            datetime.now().strftime("%H:%M:%S"),
            gender,
            round(confidence, 2)
        ])


# ---------- ROUTES ----------
@app.route('/')
def index():
    return render_template("index.html")


@app.route('/predict', methods=['POST'])
def predict():
    data = request.json['image']

    img_data = base64.b64decode(data.split(',')[1])
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.2, 6)

    if len(faces) == 0:
        return jsonify({
            "success": False,
            "gender": None,
            "confidence": 0
        })

    for (x, y, w, h) in faces:
        face = img[y:y+h, x:x+w]
        face = cv2.resize(face, (IMG_SIZE, IMG_SIZE))
        face = face / 255.0
        face = np.reshape(face, (1, IMG_SIZE, IMG_SIZE, 3))

        pred = model.predict(face, verbose=0)
        confidence = float(pred[0][0])

        if confidence > 0.5:
            gender = "Female"
        else:
            gender = "Male"
            confidence = 1 - confidence

        # Save log
        log_prediction(gender, confidence)

        return jsonify({
            "success": True,
            "gender": gender,
            "confidence": confidence
        })


if __name__ == "__main__":
    app.run(debug=True)