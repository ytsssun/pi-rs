# Native in-flight mutation contract

Native v1 records an uncertain mutation as a branch entry before dispatch:

```json
{"type":"custom","customType":"pi-rs.in-flight.v1","data":{"requestId":"...","toolCallId":"...","toolName":"write","state":"pending"}}
```

On open, any `pending` entry blocks automatic mutation replay. An explicit
`resolve_in_flight` operation appends a second entry with the same IDs and
`state: resolved`, plus the operator supplied outcome. Resolution is an
observation record; it never reruns the tool or claims exactly-once effects.

Only `write`, `edit`, and `bash` may create this marker. Read-only calls remain
eligible for deterministic replay. The marker is branch-local and must not cross
session handles or branch leaves.
