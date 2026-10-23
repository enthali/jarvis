# Jarvis Contracts

This registry lists every process of the Jarvis project. Each process defines a contract that binds the involved actors to one goal, declares the artifacts it produces, and names the owner of each artifact. Actors read this registry at session start and follow every applicable process.

The processes are Jarvis's own, derived from the syspilot 0.10 contracts and adapted to this project.

## Processes

- [Change](change.md) — every modification to versioned source code or documentation. Owned and run by the Project Manager; Architect, Developer, Tester, Technical Writer and Admin deliver their artifacts, Quality reviews and executes the tests, the User validates.
- [Release](release.md) — publishing a Jarvis version to GitHub and the VS Code Marketplace. Initiated by the Project Manager, run by Release; ends in an irreversible publication, so the preflight is the final check.

```{toctree}
:hidden:

change
release
```

---
*Owner: Admin. Questions or changes → contact Admin.*
