import pytest
from fastapi.testclient import TestClient
from whywhy.app import create_app
from whywhy.core import STEPS

@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(str(tmp_path/"temp.sqlite3")))

def mk_session(client):
    r=client.post('/api/sessions',json={'grade':3})
    assert r.status_code==201
    return r.json()

def test_health_no_live_model(client):
    assert client.get('/api/health').json()['live_model'] is False

def test_new_session_needs_first_thought(client):
    s=mk_session(client)
    assert s['next']['kind']=='first_thought'
    assert s['events']==[]

def test_prevent_skipping_early_step(client):
    s=mk_session(client)
    r=client.post(f"/api/sessions/{s['id']}/events",json={'kind':'revision','content':'이전과 달라요'})
    assert r.status_code==409

def test_full_learning_cycle_and_review(client):
    s=mk_session(client)
    for kind,*_ in STEPS:
        r=client.post(f"/api/sessions/{s['id']}/events",json={'kind':kind,'content':f'이것은 {kind}에 관한 내 생각입니다.'})
        assert r.status_code==200, r.text
    out=r.json()
    assert out['next']['status']=='complete'
    assert len(out['events'])==5
    assert len(out['evidence']['observations'])==4
    decision=client.post(f"/api/sessions/{s['id']}/review",json={'decision':'approve','note':'질문 후 근거를 스스로 찾았음'})
    assert decision.status_code==200
    assert decision.json()['review']['decision']=='approve'

def test_student_has_no_model_derived_rating(client):
    s=mk_session(client)
    assert 'score' not in s['evidence']
    assert 'ability' not in s['evidence']

def test_pii_does_not_persist(client):
    s=mk_session(client)
    r=client.post(f"/api/sessions/{s['id']}/events",json={'kind':'first_thought','content':'제 전화번호는 010-9999-8888'})
    assert r.status_code==422
    assert client.get(f"/api/sessions/{s['id']}").json()['events']==[]

def test_delete_cascade(client):
    s=mk_session(client)
    client.post(f"/api/sessions/{s['id']}/events",json={'kind':'first_thought','content':'그렇게 생각했어요'})
    client.post(f"/api/sessions/{s['id']}/review",json={'decision':'revise','note':'다시 생각해보기'})
    assert client.delete(f"/api/sessions/{s['id']}").status_code==204
    assert client.get(f"/api/sessions/{s['id']}").status_code==404
    assert client.get('/api/sessions').json()==[]

def test_reject_grade_6(client):
    assert client.post('/api/sessions',json={'grade':6}).status_code==422

def test_reject_invalid_review(client):
    s=mk_session(client)
    assert client.post(f"/api/sessions/{s['id']}/review",json={'decision':'magical','note':''}).status_code==422
