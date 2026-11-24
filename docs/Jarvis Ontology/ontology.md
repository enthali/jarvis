# Jarvis Ontology

This ontology defines what the Jarvis specification can trace: which kinds of
artifacts exist, which statuses they hold, and which named links connect them.
The strict documentation build enforces it, and the Impact, MECE and Trace
skills read the same file (`docs/Jarvis Ontology/ontology.toml`). The project
owns it and changes it through a normal Change, because a change to the
ontology reaches back through everything recorded so far.

The ontology describes the shape of the graph. It does not assign work to
actors: the applicable Contract declares ownership, current responsibility,
decisions and evidence for each change.

## The Structure

The graph is a tree of membership with a chain of specification below it:

```text
root  ROOT_JARVIS
 └─ mod    (ten modules, each tracked_by the root)
     └─ story   (each tracked_by exactly one module)
         ├─ req   implements story     ──  spec  (links to req)
         ├─ ac    validates story
         └─ story relates_to story      (dependency across modules)
```

The Root and the modules exist to find the impact of a change quickly. Read the
Root, see the modules, pick the module the change belongs to, and start the
impact analysis from that module's stories. Membership is a tree: a story is
never in two modules. A dependency on another module's story is written on the
dependent story with `relates_to`; the other story does not link back. Use
`relates_to` only for a functional dependency that a change in either story can
break. If most stories relate to most others, the tree no longer locates
anything.

The module tree only chooses where an analysis starts. The links from story to
requirement to design spec cross module boundaries and stay authoritative for
the actual impact.

## Need Types

| Type | Prefix | Question it answers | Meaning |
|---|---|---|---|
| `root` | `ROOT_` | Where does the graph start? | The single anchor, the Jarvis VS Code extension as a product. Exactly one exists. |
| `mod` | `MOD_` | Which capability? | One capability of the product. Each is tracked by the Root. Its text states what belongs inside it. |
| `story` | `US_` | Why? | The user need a requirement serves. |
| `req` | `REQ_` | What? | An observable obligation of the product. |
| `spec` | `SPEC_` | How? | The technical approach that realizes a requirement. |
| `ac` | `AC_` | Did we build the right thing? | One acceptance criterion: something a user can observe and judge by hand, in Given/When/Then form, linked to the story it validates. |
| `impl`, `test` | `IMPL_`, `TEST_` | | Existing types, unchanged by this Contract. |

An `ac` holds only what a person must judge: the observable outcome of a user
journey. Corner cases, boundary values, error paths and anything a program can
decide belong to requirement-level tests and unit tests, which trace to a
requirement or spec, not to an `ac`. A feature story usually needs a few
criteria, not one per behaviour.

Every Need carries an explicit ID, and IDs are unique across the project.

## Links

A link is stored on the Need it starts from and points outward. Sphinx-Needs
also exports the incoming side, so every link can be followed in both
directions.

| Link | From | To | Incoming name | Meaning |
|---|---|---|---|---|
| `tracked_by` | `mod` | `root` | `tracks` | The module declares its membership in the product. |
| `tracked_by` | `story` | `mod` | `tracks` | The story declares its module. Exactly one. |
| `relates_to` | `story` | `story` | `is related from` | The dependent story names a story it functionally depends on. |
| `validates` | `ac` | `story` | `is validated by` | The criterion shows that the story's intent is satisfied. |
| `links` | `story`, `req`, `spec` | same chain | `links_back` | The existing untyped chain: req to story, spec to req. Unchanged by this Contract. |

## Required Links

The strict documentation build fails when any of these is violated:

| Need | Rule |
|---|---|
| `mod` | One `tracked_by` to a `root`. |
| `story` | One `tracked_by` to a `mod`. |
| `ac` | At least one `validates`, and every target is a `story`. |
| `relates_to` | Leaves a `story` and reaches a `story`. |

The ontology file combines two mechanisms: `[needs.warnings]` filters detect a
missing link, and `[[needs.schema_definitions.schemas]]` rules check the type at
each end of a link and the one-parent limit. The non-quiet build output names the
offending Need and the rule key or schema ID. The checks establish minimum link
presence and permitted endpoint types, not whether the relationship is
semantically right; review still checks that.

A story is not required to have an `ac`. Which stories need manual validation is
decided by the Contract that changes them.

## Options

| Option | Use |
|---|---|
| `priority` | The relative importance of the Need. |
| `rationale` | The reason behind the Need. |
| `acceptance_criteria` | Existing free-text field; not used by `ac` Needs. |

## Statuses

The Architect, as owner of the specification, sets a Need's status, on the
evidence named below. Statuses never record the User's decision; see
Validation.

| Status | Meaning | Evidence required to enter it |
|---|---|---|
| `draft` | Being written. | None. |
| `open` | Identified, not started. | None. |
| `approved` | `story`, `req`, `spec`: ready for implementation. `ac`: ready to be executed. | The decision of the Contract that adds or changes the Need: the User's approval, or in autonomous mode the Contract's approved scope. |
| `implemented` | `story`, `req`, `spec`: the code exists. Not used by `ac`. | The Developer's changed code and passing unit tests, recorded in the Contract. |
| `verified` | Technical evidence exists, nothing more. `req`, `spec`: the tests of the Need pass and the review is clean. `ac`: the scenario was executed by the Tester or Quality and the result recorded. `story`: the Needs that implement and validate it are verified. | Quality's `proceed` in the Contract naming the evidence. |

There is no status for a retired Need. A Need that is no longer valid is
deleted, together with every link that pointed at it, by the Contract that
retires it; Git holds its history.

Allowed transitions:

```text
draft -> open -> approved -> implemented -> verified
draft -> approved                    ac:  approved -> verified
                                     verified -> approved   when a later change reopens the Need
```

A Need never moves to a later status without its evidence, and a Need whose text
changes materially returns to `approved` or `draft` until the evidence exists
again.

## Validation

Validation is the User's decision that a change delivers what was wanted. It is a
decision about one change at one time, so it lives in the Contract's User
validation section, not in a status. Needs end at `verified`.

For each Contract that changes stories or acceptance criteria, the User
validation rows name the `story` and `ac` IDs the User judged and what the User
observed. Before the change is merged, a check compares the Needs the branch
changed with the Contract:

- every changed `story`, `req` and `spec` is at least `implemented`;
- every changed `ac` is at least `approved`: it is `verified` when the Contract
  names it, in the User validation rows or in Quality's Test Execution, and
  stays `approved` (defined, not yet run) when it does not;
- every changed `story` appears in the User validation rows, and the User
  validation status is `accepted` or an explicit User delegation.

An `ac` is a journey the User walks or the Tester runs. The Contract chooses which
journeys a change executes, so a changed criterion the Contract does not run is
not forced to `verified`. The requirement and design of that check are
`REQ_REL_NEEDSCHECK` and `SPEC_REL_NEEDSCHECK`.

## Changing It

Treat an adjustment as technical Contract work. Preserve unrelated project
content, change only the schema surfaces the file already represents, and run the
strict documentation build afterward. Resolve every ontology warning before the
artifact is complete. Reasons for the current shape: the module tree is for
locating impact quickly and therefore stays a tree; validation is kept out of the
statuses because it describes a change, not a Need; and `ac` is limited to
user-observable outcomes so that manual validation stays small.
