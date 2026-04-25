import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p77182784_proton_mods_marketpl')

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    """Регистрация, вход и проверка токена пользователя"""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == 'register':
            username = body.get('username', '').strip()
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')

            if not username or not email or not password:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Заполни все поля'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email=%s OR username=%s", (email, username))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': cors, 'body': json.dumps({'error': 'Email или имя уже занято'})}

            pw_hash = hash_password(password)
            cur.execute(f"INSERT INTO {SCHEMA}.users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email",
                        (username, email, pw_hash))
            user = cur.fetchone()
            token = secrets.token_hex(32)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user[0], token))
            conn.commit()
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'token': token,
                'user': {'id': user[0], 'username': user[1], 'email': user[2]}
            })}

        elif action == 'login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            pw_hash = hash_password(password)
            cur.execute(f"SELECT id, username, email FROM {SCHEMA}.users WHERE email=%s AND password_hash=%s", (email, pw_hash))
            user = cur.fetchone()
            if not user:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный email или пароль'})}
            token = secrets.token_hex(32)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user[0], token))
            conn.commit()
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'token': token,
                'user': {'id': user[0], 'username': user[1], 'email': user[2]}
            })}

        elif action == 'me':
            token = (event.get('headers') or {}).get('X-Auth-Token') or body.get('token')
            if not token:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Нет токена'})}
            cur.execute(f"""
                SELECT u.id, u.username, u.email FROM {SCHEMA}.users u
                JOIN {SCHEMA}.sessions s ON s.user_id = u.id
                WHERE s.token=%s AND s.expires_at > NOW()
            """, (token,))
            user = cur.fetchone()
            if not user:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Сессия истекла'})}
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'user': {'id': user[0], 'username': user[1], 'email': user[2]}
            })}

        else:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Неизвестное действие'})}

    finally:
        cur.close()
        conn.close()
