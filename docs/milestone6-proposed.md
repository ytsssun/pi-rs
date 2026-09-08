# Proposed next milestone — verifiable completion for supervised daily trials

Status: proposed; not implemented, not substituted for M5 acceptance.

## Evidence and purpose

The original Luna baseline omitted tests in1/9 cases. The unchanged retry again
exposed missing test execution. Correct source code plus a confident final answer
is insufficient evidence that requested verification happened. Neither trace
review found a reason to rewrite successful bash output or silently repair shell
commands. Another blind retry would not test a new hypothesis.

## Bounded candidate

Add an opt-in, user-configured completion check for real repository work. The
user supplies a verification command before a run; the runtime runs it before
reporting verified completion. This supplements the agent's choices, so report
runtime-enforced verification distinctly from independent model-selected testing.
Do not retrofit this intervention into the old frozen tasks or claim the model
itself tested a feature merely because the completion check passed.

## Acceptance to freeze before implementation

1. No configured check preserves current behavior. A configured check is stored
   with the session and resumes consistently; changes require explicit input and
   a recorded policy change. Credentials never enter the policy.
2. A missing command, nonzero exit or timeout prevents verified-success status.
   Evidence includes actual command, exit status, bounded stdout/stderr, time and
   source state association. A successful empty test suite is not automatically
   meaningful; user-defined project checks remain responsible for coverage.
3. Failures are provided back to the model for a bounded repair opportunity;
   exhaustion ends with an explicit unverified/failing state, not endless retry.
4. Verification commands have host authority and may have effects: opt-in follows
   mutation authorization; uncertain crash outcomes cannot be silently replayed.
5. External verifier retains its independent tests and protected inputs. Separate
   fixed pre/post intervention experiments measure program correctness and actual
   verification, while distinguishing runtime enforcement from model autonomy.
6. Finish with a supervised disposable-repository trial, separate-process resume,
   source diffs, usage and a clear daily-trial limitation. No TUI, multiplayer,
   new providers or extension integration needed for this milestone.

First implementation question: fit the verification result into existing durable
messages/effect journal rather than inventing a parallel history. Start with a
small failing completion counterexample and session-state design before live calls.
