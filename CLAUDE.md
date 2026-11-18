# habilitaciones-amoladoras

## Skills de ingeniería (agent-skills) — usar siempre

Este repo incluye las skills de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
(licencia MIT, ver `.claude/skills/LICENSE-agent-skills`) en `.claude/skills/`.

**Regla:** antes de empezar cualquier tarea (código, docs, planificación, revisión o release),
cargá la skill `using-agent-skills` y seguí su diagrama para elegir y aplicar la skill que
corresponde a la fase del trabajo. No saltees una skill porque la tarea "parece chica".

Guía rápida por fase:

- **Definir:** `interview-me`, `idea-refine`, `spec-driven-development`, `constraint-driven-development`
- **Planificar:** `planning-and-task-breakdown`
- **Construir:** `incremental-implementation`, `test-driven-development`, `context-engineering`,
  `source-driven-development`, `doubt-driven-development`, `frontend-ui-engineering`, `api-and-interface-design`
- **Verificar:** `browser-testing-with-devtools`, `debugging-and-error-recovery`
- **Revisar:** `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization`
- **Entregar:** `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`,
  `documentation-and-adrs`, `observability-and-instrumentation`, `shipping-and-launch`

También están disponibles:

- Comandos: `/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, `/ship`, `/constraints`, `/webperf` (en `.claude/commands/`).
- Subagentes revisores: `code-reviewer`, `test-engineer`, `security-auditor`, `web-performance-auditor` (en `.claude/agents/`).
- Checklists compartidos en `.claude/references/` (las skills los referencian con `../../references/`).

### Actualizar las skills

Copiadas del commit `39b723ceebf81474d0557c1fecd01eddab585563` de upstream. El único cambio
respecto del original es que se quitó el prefijo de plugin `agent-skills:` en los nombres de
skills, porque acá están instaladas como skills del proyecto. Para actualizar, volver a copiar
`skills/`, `references/`, `agents/` y `.claude/commands/` de upstream y repetir ese reemplazo.
