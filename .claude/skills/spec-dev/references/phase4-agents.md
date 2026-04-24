# Phase 4 Agent Orchestration Guide

This reference is read at the start of Phase 4 (Implement). It contains the exact prompt
structure to use when invoking each specialist agent via the `Agent` tool, plus context
rules for each agent type.

---

## Before running any agent

Always read these files first:
- `specs/<slug>/SPEC.md` — acceptance criteria and API contracts
- `specs/<slug>/PLAN.md` — exact files to create/modify
- `specs/<slug>/TASKS.md` — task IDs for status updates

---

## Agent 1: implementation-engineer

**When:** After user approves "proceed with implementation"  
**TaskUpdate:** Set IMPL-* tasks to `in_progress`

### Prompt template

```
You are the implementation-engineer for the feature described in `specs/<slug>/SPEC.md`.

Your job: write ALL production code described in `specs/<slug>/PLAN.md`. Do not write tests.
Do not write documentation. Focus only on working, production-ready implementation.

Context files to read before writing any code:
1. `specs/<slug>/SPEC.md` — acceptance criteria and API contracts
2. `specs/<slug>/PLAN.md` — exact files to create/modify with their purposes

Project: MISO-Proyecto-final (multi-microservice platform, AWS ECS, API Gateway)
Monorepo root: /home/ahenao/code/MISO-Proyecto-final/

Language and architecture rules per service:
- Python services (booking, booking_orchestrator, pms, auth, notifications):
    Hexagonal architecture: domain/ → application/ → infrastructure/ → controllers.py
    Async SQLAlchemy with uv. Pydantic v2. FastAPI with Annotated[..., Depends()] pattern.
    In-memory repository pattern for testability. Do NOT skip the domain layer.
    For each new entity/aggregate: create infrastructure/in_memory_<entity>_repo.py that
    implements the same Protocol as the SQLAlchemy adapter. test-engineer will inject this.
    See services/booking/infrastructure/ for an existing example.
- poc_properties (Java 25 / Spring Boot 4):
    CQRS pattern: Command classes + CommandHandler, Query classes + QueryHandler.
    MapStruct for DTO mapping. JPA/PostgreSQL. Maven build.
    Package root: co.edu.uniandes.grupo03.proyectofinal.pocproperties
- PricingEngine / PricingOrchestator (.NET 8 / ASP.NET Core):
    Entity Framework Core with Npgsql. Controller pattern or minimal API.
    dotnet CLI build. XML doc comments on public methods.
- user_interface (Angular 20 / Ionic 8 / TypeScript 5.9):
    Lazy-loaded routing. Ionic components. Capacitor for native.
    TypeScript strict mode. Service injection pattern. Signals or RxJS.

When done, report:
- Files created (with paths)
- Files modified (with paths and summary of changes)
- Any blocking issues or assumptions made during implementation
```

---

## Agent 2: test-engineer

**When:** After implementation-engineer completes  
**TaskUpdate:** Set TEST-* tasks to `in_progress`

### Prompt template

```
You are the test-engineer for the feature described in `specs/<slug>/SPEC.md`.

Your job: write unit tests for the code implemented in IMPL-* tasks. Target ≥80% code coverage
on the new/modified code. Run the test suite and confirm it passes. Fix any test failures.

Context files to read before writing any tests:
1. `specs/<slug>/SPEC.md` — acceptance criteria (each must be covered by at least one test)
2. `specs/<slug>/PLAN.md` — which files were created/modified
3. The implemented source files listed in PLAN.md

Test commands and coverage targets per language:
- Python (uv):
    Run:      uv run pytest tests/ -v
    Coverage: uv run pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=80
    Pattern:  Unit tests use in-memory repository created by implementation-engineer
              (infrastructure/in_memory_<entity>_repo.py). If it does not exist, raise a
              blocking issue back to implementation-engineer before proceeding.
              Domain tests: zero mocks. Use case tests: inject in-memory fakes.
              Controller tests: FastAPI TestClient with dependency_overrides.
              Use pytest.mark.asyncio for async test functions.
- Java (Maven):
    Run:      ./mvnw test
    Coverage: ./mvnw test jacoco:report  (report at target/site/jacoco/index.html)
    Pattern:  JUnit 5 + Mockito. @SpringBootTest for integration, @ExtendWith(MockitoExtension.class) for unit.
- .NET (dotnet):
    Run:      dotnet test
    Coverage: dotnet test --collect:"XPlat Code Coverage"
    Pattern:  xUnit. Mock with Moq or NSubstitute.
- Angular (npm):
    Run:      npm test -- --watch=false
    Coverage: npm test -- --watch=false --code-coverage
    Pattern:  Jest or Karma/Jasmine. TestBed for component tests. HttpClientTestingModule for services.

Reporting format when done:
- Test files created (with paths)
- Coverage percentage achieved per service
- Any tests that were skipped and why
- Pass/fail status of each test suite
```

---

## Agent 3: review-engineer

**When:** After test-engineer completes  
**TaskUpdate:** Set RVEW-01 to `in_progress`

### Prompt template

```
You are the review-engineer for the feature described in `specs/<slug>/SPEC.md`.

Your job has three parts:
1. Run all test suites and confirm they pass
2. Review the implementation against SPEC.md acceptance criteria
3. Flag any documentation gaps

Step 1 — Run tests (use the language-specific commands):
- Python:  cd services/<svc> && uv run pytest tests/ -v
- Java:    cd services/poc_properties && ./mvnw test
- .NET:    cd services/<svc> && dotnet test
- Angular: cd user_interface && npm test -- --watch=false

Step 2 — Review implementation:
Read each SPEC.md acceptance criterion. For each one, confirm:
- [ ] The code implements it (read the relevant source files)
- [ ] At least one test covers it
- [ ] No TODO/FIXME left in new code
- [ ] No hardcoded secrets or credentials

Step 3 — Documentation gaps:
Check for:
- Missing docstrings on new public functions (Python)
- Missing Swagger/OpenAPI annotations on new endpoints (Java)
- Missing XML doc comments on new public methods (.NET)
- Missing JSDoc on new public service methods (Angular)
- README not updated if new env vars or endpoints were added

Report format:
- Test results: [PASS/FAIL] per service
- Acceptance criteria: [MET/NOT MET] per criterion
- Documentation gaps found: [list or "none"]
- Blocking issues for devops/docs agents: [list or "none"]
- Overall verdict: APPROVED / NEEDS FIXES
```

---

## Agent 4: devops-engineer

**When:** After review-engineer approves — triggered by the shared parallel gate in SKILL.md  
**TaskUpdate:** Set DEVOPS-01 to `in_progress`

### Prompt template

```
You are the devops-engineer for the feature described in `specs/<slug>/SPEC.md`.

Your full instructions are in `.claude/agents/devops-engineer.md` — read it first.
Use the SPEC.md and PLAN.md to determine what changed, then apply all relevant parts.

Project root: /home/ahenao/code/MISO-Proyecto-final/

Quick checklist (details in devops-engineer.md):
1. CI/CD: update pr_validation.yml, deploy_apps.yml, deploy_stack.yml if new service added
2. Terraform tfvars: update container_registry, ecs_api, api_gateway if new service added
3. Postman: add request YAML files for new endpoints; update collection.yaml + definition.yaml

For Postman request file format, read these existing examples first:
- postman/postman/collections/travelhub-backend/Booking/ (read 2 files)
- postman/postman/collections/travelhub-backend/Auth/ (read 1 file)

Report: all files created/modified.
```

---

## Agent 5: docs-engineer

**When:** After review-engineer approves (run in parallel with devops-engineer)  
**TaskUpdate:** Set DOCS-01 to `in_progress`

### Prompt template

```
You are the docs-engineer for the feature described in `specs/<slug>/SPEC.md`.

Your job: ensure all documentation is accurate and up to date after implementation.

Part 1 — Update SPEC.md:
Read `specs/<slug>/SPEC.md`. For each open question in the Open Questions table, fill in
the resolution based on what was actually implemented. Update status from "Draft" to "Implemented".

Part 2 — Update CLAUDE.md:
Read `/home/ahenao/code/MISO-Proyecto-final/CLAUDE.md`. Update only if:
- A new service was added (add to Services section)
- API endpoints changed (update Booking Service API section or equivalent)
- Service communication patterns changed (update Service Communication section)
- Auth behavior changed

Part 3 — Update service docs:
For each modified service in `specs/<slug>/PLAN.md`:

Python (FastAPI) services:
- Add/update docstrings on new endpoint functions (FastAPI uses these for OpenAPI auto-generation)
- Update the service README.md if new env vars, run commands, or endpoints were added

Java (poc_properties):
- Add/update Swagger @Operation and @ApiResponse annotations on new controller methods
- Update any relevant Javadoc

.NET services:
- Add/update XML doc comments (///) on new controller actions and public methods

Angular (user_interface):
- Add JSDoc on new public service methods
- Update src/assets/config.json comments if new config keys added

Part 4 — Verify Postman definition.yaml:
Check that `postman/postman/collections/travelhub-backend/.resources/definition.yaml`
matches the actual API contracts in SPEC.md. Flag any discrepancies.

Report: files modified, open questions resolved, any remaining doc gaps.
```

---

## Parallel execution (agents 4 and 5)

After the shared gate ("yes"), invoke both agents simultaneously using **two `Agent` tool calls
in the same response**. Both receive the same context (SPEC.md + PLAN.md + TASKS.md). They write
to disjoint file sets — no merge conflicts:

- devops-engineer owns: `.github/workflows/`, `terraform/environments/develop/`, `postman/`
- docs-engineer owns: `specs/`, `CLAUDE.md`, `services/*/README.md`, source docstrings

Do NOT wait for one to finish before starting the other.
