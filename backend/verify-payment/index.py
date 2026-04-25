import json
import os
import base64
import psycopg2
import urllib.request

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p77182784_proton_mods_marketpl')
SUPPORT_EMAIL = 'usertophit49@gmail.com'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def call_openai(image_url: str, expected_amount: int, payment_method: str) -> dict:
    """Вызов OpenAI Vision для проверки скриншота оплаты"""
    api_key = os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        return {'ok': False, 'reason': 'AI проверка недоступна'}

    if payment_method == 'crypto':
        prompt = (
            f"Это скриншот подтверждения криптовалютного перевода. "
            f"Ожидаемый адрес получателя: UQDz2ihzBbSH1gAtCXFdNSimLpmwEwKD8OIlv7t46KDofROf "
            f"Проверь: 1) Виден ли перевод TON/крипты? 2) Адрес совпадает или похож? "
            f"3) Есть ли статус 'успешно/completed/confirmed'? "
            f"Ответь строго JSON: {{\"valid\": true/false, \"reason\": \"пояснение на русском\"}}"
        )
    else:
        prompt = (
            f"Это скриншот банковского перевода. Ожидаемая сумма: {expected_amount} рублей. "
            f"Проверь: 1) Виден ли перевод денег? 2) Сумма {expected_amount} руб совпадает? "
            f"3) Статус 'успешно/выполнено/отправлено'? "
            f"Ответь строго JSON: {{\"valid\": true/false, \"reason\": \"пояснение на русском\"}}"
        )

    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_url, "detail": "low"}}
            ]
        }],
        "max_tokens": 200
    }).encode()

    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read())
    content = data['choices'][0]['message']['content'].strip()
    if content.startswith('```'):
        content = content.split('\n', 1)[1].rsplit('```', 1)[0].strip()
    result = json.loads(content)
    return result

def handler(event: dict, context) -> dict:
    """AI-проверка скриншота оплаты (перевод или крипта). При подозрении — уведомление на почту"""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    order_id = body.get('order_id')

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(f"""
            SELECT o.id, o.amount, o.payment_method, o.screenshot_url, o.status
            FROM {SCHEMA}.orders o WHERE o.id = %s
        """, (order_id,))
        row = cur.fetchone()

        if not row:
            return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Заказ не найден'})}

        oid, amount, payment_method, screenshot_url, status = row

        if status == 'approved':
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'status': 'approved', 'verdict': 'Уже подтверждено'})}

        if not screenshot_url:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Нет скриншота'})}

        try:
            ai_result = call_openai(screenshot_url, amount, payment_method)
            is_valid = ai_result.get('valid', False)
            reason = ai_result.get('reason', '')
        except Exception as e:
            is_valid = None
            reason = f'AI недоступен: {str(e)}'

        if is_valid is True:
            new_status = 'approved'
            cur.execute(f"""
                UPDATE {SCHEMA}.orders SET status='approved', ai_verdict=%s WHERE id=%s
            """, (reason, oid))
            cur.execute(f"""
                UPDATE {SCHEMA}.mods SET downloads = downloads + 1
                WHERE id = (SELECT mod_id FROM {SCHEMA}.orders WHERE id=%s)
            """, (oid,))
        elif is_valid is False:
            new_status = 'rejected'
            cur.execute(f"""
                UPDATE {SCHEMA}.orders SET status='rejected', ai_verdict=%s WHERE id=%s
            """, (reason, oid))
        else:
            new_status = 'manual_review'
            cur.execute(f"""
                UPDATE {SCHEMA}.orders SET status='manual_review', ai_verdict=%s WHERE id=%s
            """, (reason or 'AI недоступен, требуется ручная проверка', oid))

        conn.commit()

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
            'status': new_status,
            'verdict': reason,
            'support_email': SUPPORT_EMAIL if new_status in ('rejected', 'manual_review') else None
        })}

    finally:
        cur.close()
        conn.close()
