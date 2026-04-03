import json
import os
import uuid
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'pong-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

HIGH_SCORE_FILE = "highscore.json"

# Waiting queue and active rooms
waiting_player = None        # sid of player waiting for a match
rooms = {}                   # room_id -> { players: [sid1, sid2], scores: [0, 0] }
player_rooms = {}            # sid -> room_id
player_numbers = {}          # sid -> 1 or 2

def read_high_score():
    if not os.path.exists(HIGH_SCORE_FILE):
        return 0
    with open(HIGH_SCORE_FILE, "r") as f:
        return json.load(f).get("highScore", 0)

def write_high_score(score):
    with open(HIGH_SCORE_FILE, "w") as f:
        json.dump({"highScore": score}, f)

# ── HTTP routes ──────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/game")
def game():
    return render_template("index.html")

@app.route("/online")
def online():
    return render_template("online.html")

@app.route("/highscore", methods=["GET"])
def get_high_score():
    return jsonify({"highScore": read_high_score()})

@app.route("/highscore", methods=["POST"])
def post_high_score():
    data = request.get_json()
    new_score = data.get("score", 0)
    current = read_high_score()
    if new_score > current:
        write_high_score(new_score)
        return jsonify({"highScore": new_score, "updated": True})
    return jsonify({"highScore": current, "updated": False})

# ── Socket events ────────────────────────────────────────────────────────────

@socketio.on('find_game')
def on_find_game():
    global waiting_player
    sid = request.sid

    if waiting_player is None or waiting_player == sid:
        # No one waiting — join the queue
        waiting_player = sid
        emit('waiting', {})
    else:
        # Match found — create a room
        room_id = str(uuid.uuid4())[:8]
        p1 = waiting_player
        p2 = sid
        waiting_player = None

        rooms[room_id] = {'players': [p1, p2], 'scores': [0, 0]}
        player_rooms[p1] = room_id
        player_rooms[p2] = room_id
        player_numbers[p1] = 1
        player_numbers[p2] = 2

        join_room(room_id, sid=p1)
        join_room(room_id, sid=p2)

        # Tell both players the game is starting
        socketio.emit('game_start', {'player': 1, 'room': room_id}, to=p1)
        socketio.emit('game_start', {'player': 2, 'room': room_id}, to=p2)

@socketio.on('paddle_move')
def on_paddle_move(data):
    sid = request.sid
    room_id = player_rooms.get(sid)
    if not room_id:
        return
    # Broadcast paddle position to the other player in the room
    emit('opponent_paddle', {'y': data['y']}, room=room_id, skip_sid=sid)

@socketio.on('ball_update')
def on_ball_update(data):
    # Only player 1 sends ball updates
    sid = request.sid
    room_id = player_rooms.get(sid)
    if not room_id or player_numbers.get(sid) != 1:
        return
    emit('ball_sync', data, room=room_id, skip_sid=sid)

@socketio.on('score_update')
def on_score_update(data):
    sid = request.sid
    room_id = player_rooms.get(sid)
    if not room_id or player_numbers.get(sid) != 1:
        return
    emit('score_sync', data, room=room_id, skip_sid=sid)

@socketio.on('disconnect')
def on_disconnect():
    global waiting_player
    sid = request.sid

    if waiting_player == sid:
        waiting_player = None

    room_id = player_rooms.get(sid)
    if room_id and room_id in rooms:
        emit('opponent_disconnected', {}, room=room_id, skip_sid=sid)
        # Clean up room
        for player in rooms[room_id]['players']:
            player_rooms.pop(player, None)
            player_numbers.pop(player, None)
        del rooms[room_id]

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8080))
    print(port)
    socketio.run(app, host="0.0.0.0", port=port)