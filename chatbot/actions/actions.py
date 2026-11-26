"""
Custom actions cho trợ lý thư viện.
Các action gọi REST API của backend Node.js để lấy dữ liệu thật
(sách, phòng trống, sách đang mượn, quy định).

Chạy: rasa run actions   (mặc định cổng 5055)
"""
import os
import re
import time
import unicodedata
from difflib import SequenceMatcher
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Text, Tuple

import requests
from dotenv import load_dotenv
from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000/api")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "khoa-noi-bo-rasa")
TIMEOUT = 8

# Từ thừa bỏ đi khi lấy tên sách từ câu hỏi (nếu NLU không bắt được entity)
STOP_PHRASES = [
    "cho mình hỏi", "thư viện", "có sách", "tìm sách", "tìm giáo trình", "tìm tài liệu", "tra cứu sách",
    "mình muốn mượn", "mình muốn tìm", "mượn sách", "sách", "giáo trình", "tài liệu tham khảo", "tài liệu",
    "cuốn", "còn", "không", "có", "về", "để ở kệ nào", "bản", "chưa", "nào", "mình", "tìm", "cho", "hỏi", "ạ", "nhé", "với",
]


def api_get(path: str, params: Optional[Dict[str, Any]] = None, internal: bool = False) -> Any:
    headers = {"x-internal-key": INTERNAL_KEY} if internal else {}
    res = requests.get(f"{BACKEND_URL}{path}", params=params, headers=headers, timeout=TIMEOUT)
    res.raise_for_status()
    return res.json()


def user_id_of(tracker: Tracker) -> Optional[int]:
    """Backend gửi sender_id dạng 'user-12' khi người dùng đã đăng nhập."""
    m = re.match(r"^user-(\d+)$", tracker.sender_id or "")
    return int(m.group(1)) if m else None


def fmt_date(iso: str) -> str:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone().strftime("%d/%m/%Y")


def fmt_time(iso: str) -> str:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone().strftime("%H:%M")


def get_settings() -> Dict[str, int]:
    try:
        return api_get("/settings")["values"]
    except Exception:
        return {}


def money(v: float) -> str:
    return f"{int(float(v)):,}".replace(",", ".") + " đ"


# ---------------- Tìm kiếm thông minh: không dấu, gõ sai chính tả ----------------

def no_accent(text: str) -> str:
    """'Cơ sở dữ liệu' -> 'co so du lieu' (bỏ dấu, chữ thường) để so khớp khi người dùng gõ không dấu."""
    t = unicodedata.normalize("NFD", (text or "").lower()).replace("đ", "d").replace("Đ", "d")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", t)).strip()


_CACHE: Dict[str, Tuple[float, Any]] = {}


def cached(key: str, loader, ttl: int = 300):
    """Lưu tạm danh mục 5 phút để không gọi API liên tục."""
    hit = _CACHE.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    data = loader()
    _CACHE[key] = (time.time(), data)
    return data


def catalog_books() -> List[Dict[str, Any]]:
    return cached("books", lambda: api_get("/books", {"pageSize": 200, "sort": "title"}).get("items", []))


def catalog_materials() -> List[Dict[str, Any]]:
    return cached("materials", lambda: api_get("/materials", {"pageSize": 200}).get("items", []))


def fuzzy_score(query: str, title: str) -> float:
    """Điểm giống nhau 0..1 giữa từ khóa và tên sách (không dấu): kết hợp tỉ lệ từ trùng và SequenceMatcher."""
    q, t = no_accent(query), no_accent(title)
    if not q or not t:
        return 0.0
    if q == t:
        return 1.1
    if q in t:
        return 1.0
    qw, tw = set(q.split()), set(t.split())
    overlap = len(qw & tw) / len(qw)
    seq = SequenceMatcher(None, q, t).ratio()
    # so từng từ gần đúng (gõ thiếu/sai 1 chữ: "cau truc du leu")
    near = sum(1 for w in qw if any(SequenceMatcher(None, w, x).ratio() >= 0.8 for x in tw)) / len(qw)
    return max(overlap, near) * 0.7 + seq * 0.3


def fuzzy_find(query: str, items: List[Dict[str, Any]], key: str = "title", limit: int = 5, min_score: float = 0.55):
    scored = sorted(((fuzzy_score(query, it.get(key, "")), it) for it in items), key=lambda x: -x[0])
    return [it for sc, it in scored if sc >= min_score][:limit]


def extract_keyword(tracker: Tracker, extra_stop: Optional[List[str]] = None) -> str:
    """Lấy từ khóa từ câu hỏi khi NLU không bắt được entity."""
    text = (tracker.latest_message.get("text") or "").lower()
    if text.startswith("/"):
        return ""
    for p in sorted(STOP_PHRASES + (extra_stop or []), key=len, reverse=True):
        text = re.sub(rf"\b{re.escape(p)}\b", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def book_state(b: Dict[str, Any]) -> str:
    s = b.get("copiesSummary") or {}
    if s.get("available"):
        return f"còn {s['available']} bản mượn về"
    if s.get("onsiteAvailable"):
        return "chỉ đọc tại chỗ"
    return "tạm hết bản"


def find_major(name: str) -> Optional[Dict[str, Any]]:
    majors = cached("majors", lambda: api_get("/majors"))
    n = no_accent(name)
    return next(
        (m for m in majors if n == no_accent(m["code"]) or n in no_accent(m["name"]) or no_accent(m["name"]) in n),
        None,
    )


class ActionSearchBook(Action):
    def name(self) -> Text:
        return "action_search_book"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        title = next(tracker.get_latest_entity_values("book_title"), None)
        major = next(tracker.get_latest_entity_values("major"), None)
        params: Dict[str, Any] = {"pageSize": 5}

        try:
            if major:
                found = find_major(major)
                if not found:
                    dispatcher.utter_message(text=f"Mình không tìm thấy ngành \"{major}\". Bạn thử gõ tên ngành đầy đủ nhé.")
                    return []
                params["majorId"] = found["id"]
                params["sort"] = "popular"
                heading = f"Tài liệu ngành {found['name']} được mượn nhiều nhất:"
            else:
                if not title:
                    # Lấy phần còn lại của câu làm từ khóa
                    text = (tracker.latest_message.get("text") or "").lower()
                    if text.startswith("/"):  # bấm nút gợi ý, chưa có từ khóa
                        text = ""
                    for p in sorted(STOP_PHRASES, key=len, reverse=True):
                        text = re.sub(rf"\b{re.escape(p)}\b", " ", text)
                    title = re.sub(r"[^\w\s]", " ", text).strip()
                    title = re.sub(r"\s+", " ", title)
                if not title or len(title) < 2:
                    dispatcher.utter_message(response="utter_ask_book_title")
                    return []
                params["q"] = title
                heading = f"Kết quả cho \"{title}\":"

            data = api_get("/books", params)
        except Exception:
            dispatcher.utter_message(text="Hệ thống tra cứu đang bận, bạn thử lại sau hoặc dùng mục Tra cứu sách nhé.")
            return []

        items = data.get("items", [])
        if not items and title:
            # Gõ không dấu / sai chính tả: so khớp gần đúng trên danh mục
            try:
                items = fuzzy_find(title, catalog_books())
            except Exception:
                items = []
            if items:
                heading = f"Không có sách tên đúng \"{title}\", có phải bạn tìm:"
        if not items:
            dispatcher.utter_message(text="Mình chưa tìm thấy tài liệu phù hợp. Bạn thử từ khóa ngắn hơn, ví dụ chỉ tên môn học.")
            return []

        lines = [heading]
        for b in items:
            lines.append(f"• {b['title']} ({b['author']}), kệ {b.get('shelf') or '—'}: {book_state(b)}")
        if data.get("total", 0) > len(items):
            lines.append(f"…và {data['total'] - len(items)} kết quả khác trong mục Tra cứu sách.")
        lines.append("Bạn có thể bấm Đặt mượn trong trang chi tiết sách để thư viện soạn sẵn.")
        dispatcher.utter_message(text="\n".join(lines))
        return [SlotSet("book_title", items[0]["title"])] if title else []


# Ca mượn phòng cố định (phòng hoạt động 7h–17h)
SHIFTS = [(7, 9), (9, 11), (13, 15), (15, 17)]


def parse_shift(text: str, time_entity: Optional[str]) -> Tuple[datetime, datetime]:
    """Đoán ca mượn phòng từ câu hỏi: 'chiều nay', 'sáng mai', 'lúc 14h', 'ca 3'..."""
    src = f"{time_entity or ''} {text}".lower()
    now = datetime.now()
    day = now + timedelta(days=1) if "mai" in src else now
    shift = None
    mc = re.search(r"ca\s*([1-4])", src)
    mh = re.search(r"(\d{1,2})\s*(h|giờ|g)\b", src)
    if mc:
        shift = SHIFTS[int(mc.group(1)) - 1]
    elif mh:
        hour = int(mh.group(1))
        if "chiều" in src and hour < 12:
            hour += 12
        shift = next((s for s in SHIFTS if s[0] <= hour < s[1]), None) or next((s for s in SHIFTS if s[0] >= hour), None)
    elif "sáng" in src:
        shift = SHIFTS[0] if day.date() != now.date() or now.hour < 7 else SHIFTS[1]
    elif "chiều" in src:
        shift = SHIFTS[2]
    # chưa nói giờ, hoặc ca đã qua: lấy ca gần nhất còn lại trong ngày, hết ca thì sang ca 1 hôm sau
    candidates = [s for s in SHIFTS if shift is None or s[0] >= shift[0]]
    for s in candidates:
        end = day.replace(hour=s[1], minute=0, second=0, microsecond=0)
        if end > now:
            return day.replace(hour=s[0], minute=0, second=0, microsecond=0), end
    nxt = day + timedelta(days=1)
    return nxt.replace(hour=7, minute=0, second=0, microsecond=0), nxt.replace(hour=9, minute=0, second=0, microsecond=0)


class ActionFindRoom(Action):
    def name(self) -> Text:
        return "action_find_room"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        text = tracker.latest_message.get("text") or ""
        people_raw = next(tracker.get_latest_entity_values("people"), None)
        m = re.search(r"\d+", people_raw or "") or re.search(r"(\d+)\s*(người|bạn|thành viên)", text)
        people = int(m.group(1) if m and m.lastindex else m.group(0)) if m else 1
        wants_reading = "phòng đọc" in text.lower()

        start, end = parse_shift(text, next(tracker.get_latest_entity_values("time_of_day"), None))

        try:
            rooms = api_get(
                "/rooms/available",
                {
                    "start": start.astimezone().isoformat(),
                    "end": end.astimezone().isoformat(),
                    "people": people,
                    "roomType": "READING" if wants_reading else "GROUP",
                },
            )
        except Exception:
            dispatcher.utter_message(text="Mình chưa kiểm tra được lịch phòng, bạn xem trực tiếp ở mục Mượn phòng nhé.")
            return []

        when = f"ca {start.hour}h–{end.hour}h ngày {start.strftime('%d/%m')}"
        if not rooms:
            dispatcher.utter_message(
                text=f"Trong {when} không còn phòng phù hợp cho {people} người. Phòng mượn theo ca 7h–9h, 9h–11h, 13h–15h, 15h–17h; bạn thử ca khác hoặc xem lịch ở mục Mượn phòng."
            )
            return []
        lines = [f"Trong {when} còn các phòng cho {people} người:"]
        for r in rooms[:5]:
            extra = f", còn {r['freeSeats']} chỗ" if r.get("roomType") == "READING" else ""
            lines.append(f"• {r['name']} (sức chứa {r['capacity']}{extra}){' - ' + r['equipment'] if r.get('equipment') else ''}")
        lines.append("Vào mục Mượn phòng để gửi yêu cầu đặt, thủ thư sẽ duyệt cho bạn.")
        dispatcher.utter_message(text="\n".join(lines))
        return []


class ActionMyLoans(Action):
    def name(self) -> Text:
        return "action_my_loans"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        uid = user_id_of(tracker)
        if not uid:
            dispatcher.utter_message(text="Bạn cần đăng nhập để mình xem được sách bạn đang mượn.")
            return []
        try:
            items = api_get(f"/internal/users/{uid}/loans", internal=True)
        except Exception:
            dispatcher.utter_message(text="Mình chưa lấy được thông tin mượn sách, bạn xem ở mục Sách của tôi nhé.")
            return []
        if not items:
            dispatcher.utter_message(text="Hiện bạn không mượn cuốn sách nào.")
            return []
        lines = [f"Bạn đang mượn {len(items)} cuốn:"]
        for i in items:
            note = f" (quá hạn {i['daysLate']} ngày!)" if i["daysLate"] > 0 else ""
            lines.append(f"• {i['title']}: hạn trả {fmt_date(i['dueAt'])}{note}")
        if any(i["daysLate"] > 0 for i in items):
            lines.append("Sách quá hạn không gia hạn được, bạn mang trả tại quầy sớm để hạn chế tiền phạt nhé.")
        else:
            lines.append("Bạn có thể gia hạn trong mục Sách của tôi.")
        dispatcher.utter_message(text="\n".join(lines))
        return []


class ActionMyBookings(Action):
    def name(self) -> Text:
        return "action_my_bookings"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        uid = user_id_of(tracker)
        if not uid:
            dispatcher.utter_message(text="Bạn cần đăng nhập để mình xem lịch đặt phòng của bạn.")
            return []
        try:
            items = api_get(f"/internal/users/{uid}/bookings", internal=True)
        except Exception:
            dispatcher.utter_message(text="Mình chưa lấy được lịch đặt phòng, bạn xem ở mục Mượn phòng nhé.")
            return []
        if not items:
            dispatcher.utter_message(text="Bạn chưa có lượt đặt phòng nào sắp tới.")
            return []
        labels = {"PENDING": "chờ duyệt", "APPROVED": "đã duyệt", "IN_USE": "đang sử dụng"}
        lines = ["Các lượt đặt phòng sắp tới của bạn:"]
        for b in items:
            lines.append(f"• {b['room']} {fmt_time(b['startTime'])}–{fmt_time(b['endTime'])} ngày {fmt_date(b['startTime'])}: {labels.get(b['status'], b['status'])}")
        dispatcher.utter_message(text="\n".join(lines))
        return []


class ActionLoanRules(Action):
    def name(self) -> Text:
        return "action_loan_rules"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        s = get_settings()
        if not s:
            dispatcher.utter_message(text="Bạn vui lòng xem quy định mượn trả tại quầy thư viện nhé.")
            return []
        dispatcher.utter_message(
            text=(
                "Quy định mượn sách:\n"
                f"• Mượn về nhà tối đa {s['LOAN_DAYS']} ngày, số cuốn theo hạn mức của thẻ.\n"
                f"• Gia hạn tối đa {s['MAX_RENEWALS']} lần, mỗi lần thêm {s['RENEW_DAYS']} ngày, ngay trong mục Sách của tôi "
                "(không gia hạn được khi sách đã quá hạn hoặc có người đang chờ mượn).\n"
                "• Sách có nhãn đọc tại chỗ phải trả trong ngày.\n"
                "• Cần thẻ mượn còn hiệu lực và không nợ tiền phạt."
            )
        )
        return []


class ActionFineRules(Action):
    def name(self) -> Text:
        return "action_fine_rules"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        s = get_settings()
        if not s:
            dispatcher.utter_message(text="Bạn vui lòng hỏi quầy thư viện về mức phạt nhé.")
            return []
        dispatcher.utter_message(
            text=(
                "Mức phạt hiện hành:\n"
                f"• Trả trễ: {money(s['FINE_PER_DAY'])} mỗi ngày mỗi cuốn.\n"
                f"• Làm hỏng sách: {money(s['DAMAGE_FINE'])}.\n"
                f"• Làm mất sách: {money(s['LOST_FINE'])}.\n"
                "Tiền phạt nộp tại quầy; khi còn nợ phạt bạn tạm thời không mượn thêm được."
            )
        )
        return []


class ActionOpeningHours(Action):
    def name(self) -> Text:
        return "action_opening_hours"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        s = get_settings()
        open_h, close_h = s.get("OPEN_HOUR", 7), s.get("CLOSE_HOUR", 20)
        dispatcher.utter_message(text=f"Thư viện mở cửa từ {open_h}h đến {close_h}h. Phòng đọc, phòng học nhóm mượn theo 4 ca: 7h–9h, 9h–11h, 13h–15h, 15h–17h.")
        return []


class ActionRecommendBooks(Action):
    """Gợi ý sách: theo chủ đề người dùng nói, theo ngành được nhắc, hoặc theo ngành của chính bạn đọc; ưu tiên sách được mượn nhiều."""

    def name(self) -> Text:
        return "action_recommend_books"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        major_text = next(tracker.get_latest_entity_values("major"), None)
        topic = next(tracker.get_latest_entity_values("book_title"), None)
        try:
            major = find_major(major_text) if major_text else None
            if not major and not topic:
                uid = user_id_of(tracker)
                prof = api_get(f"/internal/users/{uid}/profile", internal=True) if uid else None
                if prof and prof.get("majorId"):
                    major = {"id": prof["majorId"], "name": prof["majorName"]}
            if topic:
                items = fuzzy_find(topic, catalog_books(), limit=5, min_score=0.45)
                heading = f"Sách về \"{topic}\" bạn có thể đọc:"
            elif major:
                items = api_get("/books", {"majorId": major["id"], "sort": "popular", "pageSize": 5}).get("items", [])
                heading = f"Sinh viên ngành {major['name']} hay mượn nhất 12 tháng qua:"
            else:
                items = api_get("/books", {"sort": "popular", "pageSize": 5}).get("items", [])
                heading = "Sách được mượn nhiều nhất thư viện 12 tháng qua:"
        except Exception:
            dispatcher.utter_message(text="Hệ thống gợi ý đang bận, bạn thử lại sau nhé.")
            return []
        if not items:
            dispatcher.utter_message(text="Mình chưa có gợi ý phù hợp. Bạn thử nói tên ngành hoặc chủ đề, ví dụ \"gợi ý sách ngành kế toán\".")
            return []
        lines = [heading]
        for b in items:
            extra = f", {b['loanCount']} lượt mượn" if b.get("loanCount") else ""
            lines.append(f"• {b['title']} ({b['author']}): {book_state(b)}{extra}")
        if not major_text and not topic and not user_id_of(tracker):
            lines.append("Đăng nhập để mình gợi ý đúng ngành của bạn nhé.")
        dispatcher.utter_message(
            text="\n".join(lines),
            buttons=[{"title": "Còn phòng học nhóm không?", "payload": "/ask_room"}, {"title": "Quy định mượn sách", "payload": "/ask_loan_rules"}],
        )
        return [SlotSet("book_title", items[0]["title"])]


class ActionSearchMaterial(Action):
    """Tìm giáo trình, sách, tài liệu bài giảng đang bán ở nhà sách: giá, tồn kho."""

    def name(self) -> Text:
        return "action_search_material"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        title = next(tracker.get_latest_entity_values("book_title"), None) or extract_keyword(
            tracker, ["mua", "giá", "bao nhiêu", "bao nhiêu tiền", "tiền", "bán", "ở đâu", "thế nào", "bài giảng", "nhà sách", "muốn", "thanh toán", "ra sao"]
        )
        if not title or len(title) < 3:
            dispatcher.utter_message(response="utter_buy_material")
            return []
        try:
            items = fuzzy_find(title, catalog_materials(), limit=4, min_score=0.5)
        except Exception:
            dispatcher.utter_message(response="utter_buy_material")
            return []
        if not items:
            dispatcher.utter_message(text=f"Nhà sách chưa bán tài liệu \"{title}\". Bạn xem danh mục ở mục Nhà sách nhé.")
            return []
        lines = [f"Nhà sách thư viện đang bán:"]
        for m in items:
            stock = "bản PDF" if m["format"] == "DIGITAL" else (f"còn {m['stock']} cuốn" if m["stock"] else "hết hàng")
            lines.append(f"• {m['title']}: {money(m['price'])} ({stock})")
        lines.append("Bấm vào sách trong mục Nhà sách để đặt mua và xem các sách liên quan.")
        dispatcher.utter_message(text="\n".join(lines))
        return []


# Từ khóa định tuyến khi NLU không chắc chắn (so khớp không dấu)
ROUTES = [
    (["phong", "phong nhom", "phong doc", "dat phong"], "/ask_room", "Bạn muốn tìm phòng học nhóm, phòng đọc còn trống?"),
    (["gia han"], "/ask_renew", "Bạn muốn hỏi cách gia hạn sách?"),
    (["phat", "tre han", "qua han", "lam mat", "hong sach"], "/ask_fine", "Bạn muốn hỏi về tiền phạt?"),
    (["the", "lam the", "the thu vien"], "/ask_card", "Bạn muốn hỏi về thẻ thư viện?"),
    (["mo cua", "may gio", "gio lam viec", "dong cua"], "/ask_opening_hours", "Bạn muốn hỏi giờ mở cửa?"),
    (["dang muon", "het han", "han tra", "sach cua minh", "sach cua toi"], "/ask_my_loans", "Bạn muốn xem sách đang mượn và hạn trả?"),
    (["mua", "gia", "nha sach", "bai giang"], "/ask_buy_material", "Bạn muốn mua sách, tài liệu?"),
    (["goi y", "nen doc", "sach hay", "muon nhieu"], "/ask_recommend", "Bạn muốn mình gợi ý sách?"),
]


class ActionSmartFallback(Action):
    """Khi không chắc ý định: đoán theo từ khóa, rồi thử tìm sách gần đúng, cuối cùng mới xin lỗi."""

    def name(self) -> Text:
        return "action_smart_fallback"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        text = tracker.latest_message.get("text") or ""
        plain = f" {no_accent(text)} "
        for keys, payload, question in ROUTES:
            if any(f" {k} " in plain for k in keys):
                dispatcher.utter_message(text=question, buttons=[{"title": "Đúng vậy", "payload": payload}, {"title": "Không phải", "payload": "/deny"}])
                return []
        kw = extract_keyword(tracker)
        if len(kw) >= 4:
            try:
                books = fuzzy_find(kw, catalog_books(), limit=3, min_score=0.6)
            except Exception:
                books = []
            if books:
                lines = ["Có phải bạn đang tìm sách này không?"] + [f"• {b['title']}: {book_state(b)}" for b in books]
                dispatcher.utter_message(text="\n".join(lines))
                return [SlotSet("book_title", books[0]["title"])]
        dispatcher.utter_message(
            response="utter_default",
            buttons=[
                {"title": "Tìm sách", "payload": "/ask_book"},
                {"title": "Gợi ý sách cho tôi", "payload": "/ask_recommend"},
                {"title": "Phòng học nhóm", "payload": "/ask_room"},
                {"title": "Hạn trả sách", "payload": "/ask_my_loans"},
            ],
        )
        return []
