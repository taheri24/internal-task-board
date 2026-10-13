#!/usr/bin/env bash
# End-to-end security checks against a running API (default http://localhost:4000).
# Requires a migrated and seeded database. Run: LOGIN_RATE_LIMIT=500 backend/scripts/e2e-security.sh
API=http://localhost:4000/api/v1
J=/tmp/jar; rm -rf $J; mkdir -p $J
PASS=0; FAIL=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "PASS  $1 (HTTP $3)"; PASS=$((PASS+1)); else echo "FAIL  $1 expected $2 got $3"; FAIL=$((FAIL+1)); fi; }
login() { # jarfile email password
  curl -s -c "$1" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"$3\"}" $API/auth/login -o /dev/null -w "%{http_code}"; }
req()  { # jarfile method path [json]
  if [ -n "$4" ]; then curl -s -b "$1" -X "$2" -H 'Content-Type: application/json' -d "$4" "$API$3" -w "\n%{http_code}";
  else curl -s -b "$1" -X "$2" "$API$3" -w "\n%{http_code}"; fi; }
code() { echo "$1" | tail -1; }
body() { echo "$1" | sed '$d'; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null; }

OWN=$J/owner; MGR=$J/mgr; MEM=$J/mem
check "owner login" 200 $(login $OWN owner@taskboard.local Owner@12345)
check "manager login" 200 $(login $MGR manager@taskboard.local Manager@12345)
check "member login" 200 $(login $MEM member@taskboard.local Member@12345)
check "wrong password rejected" 401 $(login $J/bad member@taskboard.local wrong-password)

# Cookies must be HttpOnly (the flag appears as #HttpOnly_ in the jar)
if grep -q "#HttpOnly_.*access_token" $MEM && grep -q "#HttpOnly_.*refresh_token" $MEM; then echo "PASS  tokens are HttpOnly cookies"; PASS=$((PASS+1)); else echo "FAIL  cookies not HttpOnly"; FAIL=$((FAIL+1)); fi
# Tokens never appear in the login response body
LB=$(curl -s -H 'Content-Type: application/json' -d '{"email":"member@taskboard.local","password":"Member@12345"}' $API/auth/login)
if echo "$LB" | grep -q "accessToken\|refreshToken\|access_token"; then echo "FAIL  token leaked in body"; FAIL=$((FAIL+1)); else echo "PASS  no token in response body"; PASS=$((PASS+1)); fi

# Task IDs
ALL=$(req $OWN GET /todos); ALLJ=$(body "$ALL")
OTHER_ID=$(echo "$ALLJ" | json "[t['id'] for t in d if t['title']=='طراحی صفحه ورود'][0]")
MEM_ID=$(req $MEM GET /auth/me | sed '$d' | json "d['id']")
MGR_ID=$(req $MGR GET /auth/me | sed '$d' | json "d['id']")

# Member visibility
MV=$(req $MEM GET /todos); check "member list" 200 $(code "$MV")
echo "      member sees $(body "$MV" | json "len(d)") task(s)"
LEAK=$(body "$MV" | json "all(t['createdBy']['id']=='$MEM_ID' or (t['assignee'] and t['assignee']['id']=='$MEM_ID') for t in d)")
if [ "$LEAK" = "True" ]; then echo "PASS  member sees only own/assigned tasks"; PASS=$((PASS+1)); else echo "FAIL  member sees foreign tasks"; FAIL=$((FAIL+1)); fi

R=$(req $MEM GET /todos/$OTHER_ID); check "member cannot view another user's task (404 hides existence)" 404 $(code "$R")
R=$(req $MEM PATCH /todos/$OTHER_ID '{"title":"hack"}'); check "member cannot edit another user's task" 404 $(code "$R")

# Read-only assignee for members
MINE=$(req $MEM POST /todos '{"title":"تست عضو","status":"todo","priority":"low"}')
check "member creates own task" 201 $(code "$MINE")
MINE_ID=$(body "$MINE" | json "d['id']")
MINE_ASSIGNEE=$(body "$MINE" | json "d['assignee']['id']")
if [ "$MINE_ASSIGNEE" = "$MEM_ID" ]; then echo "PASS  create forces assignee to self"; PASS=$((PASS+1)); else echo "FAIL  assignee not self"; FAIL=$((FAIL+1)); fi
R=$(req $MEM POST /todos "{\"title\":\"x\",\"assigneeId\":\"$MGR_ID\"}")
if [ "$(code "$R")" = "201" ] && [ "$(body "$R" | json "d['assignee']['id']")" = "$MEM_ID" ]; then echo "PASS  member-supplied assigneeId ignored on create"; PASS=$((PASS+1)); else echo "FAIL  member-supplied assigneeId not ignored"; FAIL=$((FAIL+1)); fi
R=$(req $MEM PATCH /todos/$MINE_ID "{\"assigneeId\":\"$MGR_ID\"}"); check "member reassign attempt returns 403" 403 $(code "$R")
R=$(req $MEM PATCH /todos/$MINE_ID "{\"assigneeId\":\"$MEM_ID\",\"title\":\"تست عضو ویرایش\"}"); check "member may resend current assignee" 200 $(code "$R")

# Status rule: member can change status only when assigned to them
R=$(req $MEM PATCH /todos/$MINE_ID '{"status":"in_progress"}'); check "member changes status on own (self-assigned) task" 200 $(code "$R")
R=$(req $OWN POST /todos "{\"title\":\"برای عضو\",\"assigneeId\":\"$MEM_ID\"}"); ASSIGNED_TO_MEM=$(body "$R" | json "d['id']")
R=$(req $MEM PATCH /todos/$ASSIGNED_TO_MEM '{"status":"done"}'); check "member changes status on task assigned to them" 200 $(code "$R")
R=$(req $MEM PATCH /todos/$ASSIGNED_TO_MEM '{"assigneeId":null}'); check "member cannot unassign a task" 403 $(code "$R")

# Owner/manager reassignment
R=$(req $MGR PATCH /todos/$MINE_ID "{\"assigneeId\":\"$MGR_ID\"}"); check "manager reassigns any task" 200 $(code "$R")
R=$(req $MGR PATCH /todos/$MINE_ID "{\"assigneeId\":\"$MEM_ID\"}"); check "manager reassigns back" 200 $(code "$R")

# Users module RBAC
check "member GET /users forbidden" 403 $(code "$(req $MEM GET /users)")
check "member PATCH /users/:id forbidden" 403 $(code "$(req $MEM PATCH /users/$MGR_ID '{"displayName":"x"}')")
check "manager GET /users forbidden" 403 $(code "$(req $MGR GET /users)")
check "owner GET /users allowed" 200 $(code "$(req $OWN GET /users)")
check "member GET /users/directory allowed (names only)" 200 $(code "$(req $MEM GET /users/directory)")
DIR=$(body "$(req $MEM GET /users/directory)")
if echo "$DIR" | grep -q "@taskboard"; then echo "FAIL  directory leaks emails"; FAIL=$((FAIL+1)); else echo "PASS  directory has no emails"; PASS=$((PASS+1)); fi

# Soft delete RBAC
check "member restore forbidden" 403 $(code "$(req $MEM POST /todos/$ASSIGNED_TO_MEM/restore)")
R=$(req $MEM DELETE /todos/$OTHER_ID); check "member cannot delete another's task" 404 $(code "$R")
check "member deletes own task" 204 $(code "$(req $MEM DELETE /todos/$MINE_ID)")
check "manager restores soft-deleted task" 201 $(code "$(req $MGR POST /todos/$MINE_ID/restore)")

# Validation: unknown fields, TipTap allow-list, safe links
check "unknown field rejected" 400 $(code "$(req $MGR PATCH /todos/$OTHER_ID '{"title":"ok","isAdmin":true}')")
check "disallowed TipTap node rejected" 400 $(code "$(req $MGR POST /todos '{"title":"x","description":{"type":"doc","content":[{"type":"script"}]}}')")
check "javascript: link rejected" 400 $(code "$(req $MGR POST /todos '{"title":"x","description":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"a","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}}')")
check "https link accepted" 201 $(code "$(req $MGR POST /todos '{"title":"x","description":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"a","marks":[{"type":"link","attrs":{"href":"https://example.com"}}]}]}]}}')")
check "empty document accepted" 201 $(code "$(req $MGR POST /todos '{"title":"empty","description":{"type":"doc"}}')")
R=$(req $MGR POST /todos '{"title":"bad","priority":"extreme"}'); check "invalid enum rejected" 400 $(code "$R")
ERRSHAPE=$(body "$R" | json "all(k in d for k in ['statusCode','error','message','requestId'])")
if [ "$ERRSHAPE" = "True" ]; then echo "PASS  error envelope has statusCode/error/message/requestId"; PASS=$((PASS+1)); else echo "FAIL  error envelope shape"; FAIL=$((FAIL+1)); fi

# Last active Owner protection
OID=$(req $OWN GET /auth/me | sed '$d' | json "d['id']")
check "last active owner cannot be disabled" 409 $(code "$(req $OWN PATCH /users/$OID '{"isActive":false}')")
check "last active owner cannot be downgraded" 409 $(code "$(req $OWN PATCH /users/$OID '{"role":"manager"}')")

# Refresh rotation and reuse detection
RJ=$J/refresh; login $RJ member@taskboard.local Member@12345 >/dev/null
OLD_REFRESH=$(awk '/refresh_token/{print $7}' $RJ)
check "refresh rotates" 200 $(curl -s -b $RJ -c $RJ -X POST $API/auth/refresh -o /dev/null -w "%{http_code}")
REUSE=$(curl -s -H "Cookie: refresh_token=$OLD_REFRESH" -X POST $API/auth/refresh -o /dev/null -w "%{http_code}")
check "reusing a rotated refresh token is rejected" 401 $REUSE
check "reuse revokes the newer session too" 401 $(curl -s -b $RJ -X POST $API/auth/refresh -o /dev/null -w "%{http_code}")

# Disabled users: an old, still-valid access token must stop working immediately
login $MEM member@taskboard.local Member@12345 >/dev/null
MEM_ACCESS=$(awk '/access_token/{print $7}' $MEM)
check "old token works before disable" 200 $(curl -s -H "Cookie: access_token=$MEM_ACCESS" $API/auth/me -o /dev/null -w "%{http_code}")
check "owner disables member" 200 $(code "$(req $OWN PATCH /users/$MEM_ID '{"isActive":false}')")
check "old access token rejected after disable" 401 $(curl -s -H "Cookie: access_token=$MEM_ACCESS" $API/auth/me -o /dev/null -w "%{http_code}")
check "disabled user cannot log in" 401 $(login $J/dis member@taskboard.local Member@12345)
check "owner re-enables member" 200 $(code "$(req $OWN PATCH /users/$MEM_ID '{"isActive":true}')")

# Logout clears the session
login $J/lo manager@taskboard.local Manager@12345 >/dev/null
check "logout" 204 $(curl -s -b $J/lo -c $J/lo -X POST $API/auth/logout -o /dev/null -w "%{http_code}")

# Health endpoint: public, and it never leaks row contents
PING=$(curl -s $API/ping); check "ping is public" 200 $(curl -s -o /dev/null -w "%{http_code}" $API/ping)
if echo "$PING" | json "d['status']=='ok' and d['database']['status']=='up' and d['database']['counts'] is not None" | grep -q True; then
  echo "PASS  ping reports database up with entity counts"; PASS=$((PASS+1));
else echo "FAIL  ping payload missing status or counts: $PING"; FAIL=$((FAIL+1)); fi
if echo "$PING" | grep -q "@taskboard.local\|password_hash\|token_hash"; then
  echo "FAIL  ping leaked sensitive data"; FAIL=$((FAIL+1));
else echo "PASS  ping leaks no sensitive data"; PASS=$((PASS+1)); fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
