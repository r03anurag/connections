# Flask Python app for backend
from flask import Flask, jsonify, request
from flask_cors import CORS
from setup import main_setup

# initialize app and data
app = Flask(__name__)
CORS(app)
saved = True

@app.route('/api/data', methods=['GET'])
def send_game_data():
    if saved:
        try:
            with open("user-data/user_data.txt", 'r') as indfile:
                data = indfile.read()
                data = eval(data.replace("true", "True").replace("false", "False"))
                data["saved"] = True
                return jsonify(data)
        except:
            game_data = main_setup(False)
            gd = dict()
            gd["data"] = game_data
            gd["saved"] = False
            return jsonify(gd)

@app.route('/api/save', methods=['POST'])
def save_data():
    udata = request.get_data()
    udata = udata.decode()
    with open("user-data/user_data.txt", 'w', encoding='utf-8') as datafile:
        datafile.write(udata)
    return "OK"

@app.route('/api/new', methods=['GET'])
def new_game():
    game_data = main_setup(False)
    gd = dict()
    gd["data"] = game_data
    gd["saved"] = False
    return jsonify(gd)

@app.route('/api/archive', methods=['POST'])
def archived_game():
    gd = main_setup(True)
    return jsonify(gd)

if __name__ == '__main__':
    app.run(debug=False)