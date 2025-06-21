from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001"]
    }
})

@app.route('/api/examplePy', methods=['GET'])
def examplePy():
    msg = "hello world"
    return msg


if __name__ == "__main__":
    app.run(port=8080)