import os, ssl, smtplib, imaplib, email
from email.message import EmailMessage
from email.header import decode_header
from email.utils import make_msgid, formatdate
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
IMAP_HOST = os.getenv("IMAP_HOST")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")


def _dec(h):
    if not h: return ""
    parts = decode_header(h)
    out = []
    for text, enc in parts:
        out.append(text.decode(enc or "utf-8", "replace") if isinstance(text, bytes) else text)
    return "".join(out)

def smtp_send(to, subject, text=None, html=None, in_reply_to=None):
    if isinstance(to, str):
        to = [to]

    msg = EmailMessage()
    msg["From"] = EMAIL_USER
    msg["To"]   = ", ".join(to)
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    # add a Message-ID so replies can reference it
    msg["Message-ID"] = make_msgid()  # e.g., <random.123@yourhost>
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"]  = in_reply_to

    if html:
        msg.set_content(text or "")
        msg.add_alternative(html, subtype="html")
    else:
        msg.set_content(text or "")

    ctx = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.ehlo()
        s.starttls(context=ctx)
        s.login(EMAIL_USER, EMAIL_PASS)
        s.send_message(msg)
    return msg["Message-ID"]

def imap_search(unseen=False, thread_token=None, limit=10, mark_seen=False):
    M = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    M.login(EMAIL_USER, EMAIL_PASS)
    M.select("INBOX")

    # build search criteria
    criteria = []
    if unseen:
        criteria.append("UNSEEN")
    if thread_token:
        criteria += ["SUBJECT", f'"[RFQ:{thread_token}]"']
    if not criteria:
        criteria = ["ALL"]

    typ, data = M.uid("search", None, *criteria)
    if typ != "OK":
        M.logout()
        return []

    uids = data[0].split()
    uids = list(reversed(uids))[:limit]  # newest first

    items = []
    for uid in uids:
        typ, msgdata = M.uid("fetch", uid, "(RFC822)")
        if typ != "OK" or not msgdata or not msgdata[0]:
            continue
        raw = msgdata[0][1]
        msg = email.message_from_bytes(raw)

        subj = _dec(msg.get("Subject"))
        from_ = _dec(msg.get("From"))
        date_ = msg.get("Date") or ""
        msgid = msg.get("Message-Id") or ""
        irt   = msg.get("In-Reply-To") or ""

        # extract a small text/plain snippet
        snippet = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition") or "").lower():
                    payload = part.get_payload(decode=True) or b""
                    snippet = " ".join(payload.decode(part.get_content_charset() or "utf-8", "replace").split())[:200]
                    break
        else:
            payload = msg.get_payload(decode=True) or b""
            snippet = " ".join(payload.decode(msg.get_content_charset() or "utf-8", "replace").split())[:200]

        items.append({
            "uid": uid.decode(),
            "from": from_,
            "subject": subj,
            "date": date_,
            "snippet": snippet,
            "message_id": msgid,
            "in_reply_to": irt
        })

        if mark_seen:
            M.uid("store", uid, "+FLAGS", r"(\Seen)")

    M.logout()
    return items


@app.post("/email/send")
def api_send():
    data = request.get_json(force=True)
    to = data.get("to")
    subject = data.get("subject", "")
    text = data.get("text") or ""
    html = data.get("html")
    in_reply_to = data.get("in_reply_to")
    thread_token = data.get("thread_token")

    if not to:
        return jsonify(error="'to' is required"), 400
    if thread_token and f"[RFQ:{thread_token}]" not in subject:
        subject = f'{subject} [RFQ:{thread_token}]'

    try:
        message_id = smtp_send(to=to, subject=subject, text=text, html=html, in_reply_to=in_reply_to)
        return jsonify(status="sent", message_id=message_id, subject=subject)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.get("/email/messages")
def api_messages():
    unseen = request.args.get("unseen", "false").lower() == "true"
    limit = int(request.args.get("limit", 10))
    thread_token = request.args.get("thread_token")
    mark_seen = request.args.get("mark_seen", "false").lower() == "true"
    try:
        items = imap_search(unseen=unseen, thread_token=thread_token, limit=limit, mark_seen=mark_seen)
        return jsonify(messages=items)
    except Exception as e:
        return jsonify(error=str(e)), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
