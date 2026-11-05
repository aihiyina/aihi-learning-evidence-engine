import pytest
from whywhy.core import MAX_CHARS, STEPS, ValidationError, expected_kind, evidence_summary, prompt_for, validate_entry

def mk_events(n):
    return [{"kind": kind, "content": f"내 생각 {i+1}"} for i,(kind,*_) in enumerate(STEPS[:n])]

@pytest.mark.parametrize("n", range(6))
def test_step_progression(n):
    events = mk_events(n)
    expected = STEPS[n][0] if n<5 else None
    assert expected_kind(events) == expected
    assert prompt_for(events)["completed"] == n

def test_order_must_not_jump():
    with pytest.raises(ValueError):
        expected_kind([{"kind":"revision","content":"수정"}])

def test_pii_email_blocked():
    with pytest.raises(ValidationError):
        validate_entry("my.name@example.org")

def test_pii_phone_blocked():
    with pytest.raises(ValidationError):
        validate_entry("010-1234-5678입니다")

def test_pii_rrn_blocked():
    with pytest.raises(ValidationError):
        validate_entry("990101-1234567")

def test_empty_blocked():
    with pytest.raises(ValidationError):
        validate_entry("  ")

def test_maximum_blocked():
    with pytest.raises(ValidationError):
        validate_entry("생"*(MAX_CHARS+1))

def test_evidence_not_grade_or_personality():
    result=evidence_summary(mk_events(5))
    assert all(x["observed"] for x in result["observations"])
    assert "score" not in result and "personality" not in result
