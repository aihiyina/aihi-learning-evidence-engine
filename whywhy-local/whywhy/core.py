"""Deterministic, child-facing learning loop. No model calls and no scoring.

This package is a design prototype, not a production child-safety system.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

LESSON = {
    "id": "why-ask-001",
    "title": "정말 그럴까? AI 답을 확인하는 질문 연구소",
    "grades": [3, 4],
    "minutes": 40,
    "subject": "AI 리터러시 · 과학 탐구",
    "scenario": "수업용 AI 답변 예시야. ‘모든 식물은 하루 종일 햇빛을 쬐어야 건강하게 자라.’ 이 말을 그대로 믿어도 될까?",
    "objective": "AI의 말을 그대로 믿지 않고, 나의 생각과 질문, 확인한 근거를 바탕으로 다시 설명하기",
    "teacher_plan": [
        {"minute": "0–5", "activity": "AI의 답을 읽고 첫 생각 말하기"},
        {"minute": "5–12", "activity": "왜·어떻게 질문 만들기"},
        {"minute": "12–25", "activity": "근거 계획 세우고 비교하기"},
        {"minute": "25–35", "activity": "처음 생각을 수정하고 자기 말로 설명하기"},
        {"minute": "35–40", "activity": "생각 변화 공유·교사 관찰 기록"},
    ],
    "source_note": "고정된 탐구 상황 예시이며, 과학적 정답을 단정하지 않습니다.",
}

STEPS = (
    ("first_thought", "첫 생각", "이 답을 읽고 네 생각은 어때?", "맞다/틀리다만 쓰지 않고 이유를 자유롭게 적어도 좋아."),
    ("child_question", "나의 질문", "궁금한 점을 ‘왜’ 또는 ‘어떻게’로 질문해볼래?", "한 가지 질문만 골라도 괜찮아."),
    ("verification", "확인할 근거", "그 질문을 알아보려면 무엇을 관찰하거나 확인하면 좋을까?", "직접 해볼 일이나 믿을 만한 자료를 생각해봐."),
    ("revision", "다시 생각", "처음 생각에서 바꾸거나 더해보고 싶은 부분이 있을까?", "생각이 같아도 이유를 더 적어도 괜찮아."),
    ("self_explanation", "내가 설명하기", "지금 생각을 친구에게 네 말로 설명해볼래?", "AI 도움 없이 한두 문장으로 말해보자."),
)

MAX_CHARS = 600
# Conservative demo safeguards; real-world PII detection requires a dedicated tested service.
PII_PATTERNS = (
    re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE),
    re.compile(r"(?<!\d)01[016789][\s-]?\d{3,4}[\s-]?\d{4}(?!\d)"),
    re.compile(r"(?<!\d)\d{6}[\s-]?[1-4]\d{6}(?!\d)"),
)


@dataclass(frozen=True)
class ValidationError(Exception):
    message: str


def validate_entry(text: str) -> str:
    candidate = text.strip()
    if len(candidate) < 2:
        raise ValidationError("두 글자 이상으로 네 생각을 적어줘.")
    if len(candidate) > MAX_CHARS:
        raise ValidationError("조금 짧게 적어볼까? 600자까지 쓸 수 있어.")
    if any(p.search(candidate) for p in PII_PATTERNS):
        raise ValidationError("전화번호나 주민등록번호 같은 개인정보 대신 생각만 적어줘.")
    return candidate


def expected_kind(events: list[dict]) -> str | None:
    sequence = [e["kind"] for e in events]
    for index, (kind, *_rest) in enumerate(STEPS):
        if len(sequence) <= index:
            return kind
        if sequence[index] != kind:
            raise ValueError("The recorded learning sequence has been altered")
    return None


def prompt_for(events: list[dict]) -> dict:
    kind = expected_kind(events)
    if kind is None:
        return {
            "status": "complete", "kind": None, "stage": "마무리", "prompt": "오늘 네 생각이 어떻게 달라졌는지 돌아보자.",
            "tip": "선생님은 정답보다 네가 스스로 생각한 과정을 살펴볼 거야.",
            "completed": len(STEPS), "total": len(STEPS),
        }
    idx = next(i for i, x in enumerate(STEPS) if x[0] == kind)
    _, stage, prompt, tip = STEPS[idx]
    return {"status": "active", "kind": kind, "stage": stage, "prompt": prompt, "tip": tip, "completed": idx, "total": len(STEPS)}


def evidence_summary(events: list[dict]) -> dict:
    data = {e["kind"]: e["content"] for e in events}
    return {
        "first_thought": data.get("first_thought"),
        "child_question": data.get("child_question"),
        "verification": data.get("verification"),
        "revision": data.get("revision"),
        "self_explanation": data.get("self_explanation"),
        "observations": [
            {"label": "질문을 스스로 작성", "observed": "child_question" in data},
            {"label": "근거를 확인하는 방법을 제시", "observed": "verification" in data},
            {"label": "처음 생각을 되돌아봄", "observed": "revision" in data},
            {"label": "자기 말로 다시 설명", "observed": "self_explanation" in data},
        ],
        "notes": "이 기록은 학생의 발화 증거입니다. 성적·능력·성향에 대한 자동 판정이 아닙니다.",
    }
