# E2E Test Infra: Gold Crochet Mobile Redesign

## Test Philosophy
- **Opaque-box & Requirement-driven**: Tests derive directly from `ORIGINAL_REQUEST.md` (R1 through R10) and verify the rendered DOM, visual geometry, computed styles, and interactive state via Chrome Headless CDP.
- **Zero External Dependencies**: Powered by Python 3.11's standard library (`http.server`, `urllib`, `json`, `subprocess`, `unittest`) and native Google Chrome (CDP remote debugging).
- **Progressive Testability**: Tier 1 verifies fundamental structure and CSS tokens; Tier 2 stresses viewports and boundary states; Tier 3 tests multi-component interactions; Tier 4 validates complete customer journeys.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------|:------:|:------:|:------:|
| F1 | Viewport & Rolagem Horizontal Zero (320-480px) | R1 | 5 | 5 | ✓ |
| F2 | Cabeçalho 3 Zonas Limpo & Logo Centralizada | R1, R2 | 5 | 5 | ✓ |
| F3 | Escalonamento Tipográfico com `clamp()` & Tokens | R1, R3 | 5 | 5 | ✓ |
| F4 | Menu Lateral Mobile & Trava de Rolagem | R2 | 5 | 5 | ✓ |
| F5 | Barra Inferior Móvel & Safe Areas | R2, R10 | 5 | 5 | ✓ |
| F6 | Hero Mobile & Botão Pílula sem Setas | R3 | 5 | 5 | ✓ |
| F7 | Grade de Produtos em 2 Colunas & Preços Pretos | R4 | 5 | 5 | ✓ |
| F8 | Carrossel Tátil, Inércia & Proteção de Clique | R5 | 5 | 5 | ✓ |
| F9 | Busca Instantânea, Filtros & Estado Vazio | R6 | 5 | 5 | ✓ |
| F10 | Detalhes do Produto & Compra Exclusiva | R7 | 5 | 5 | ✓ |
| F11 | Sacola em 3 Estados & Checkout WhatsApp | R8 | 5 | 5 | ✓ |
| F12 | Performance, CLS < 0.1 & Reduced Motion | R9 | 5 | 5 | ✓ |
| F13 | Acessibilidade WCAG AA & Input Zoom Fix (16px) | R10 | 5 | 5 | ✓ |
| F14 | Metatags Completas (OG / Twitter) & 404 | R10 | 5 | 5 | ✓ |

## Test Architecture
- **Runner**: Python 3.11 test orchestrator executing `tests/run_e2e_suite.py`.
- **Server**: Local HTTP static server running on port 8088.
- **Client**: Headless Chrome (CDP port 9228) with mobile viewport emulation (e.g., iPhone SE 375x667, iPhone 14 Pro 393x852, Android 360x800, Small Android 320x640).
- **Verification Engine**: Executes JavaScript evaluations directly in the live browser context to read bounding client rects, computed CSS values, touch event dispatches, scroll offsets, and `localStorage` states.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Jornada do Primeiro Acesso: Hero -> Explorar Peças -> Catálogo 2 colunas -> Filtro por Categoria | F1, F2, F3, F5, F6, F7, F9 | Alto |
| 2 | Descoberta Tátil: Deslize no Carrossel da Home sem redirecionamento falso -> Clique intencional em card | F1, F2, F8, F10 | Alto |
| 3 | Navegação Completa via Menu Mobile: Hambúrguer -> Trava de Scroll -> Seleção de Categoria -> Fechamento automático | F2, F4, F5 | Médio |
| 4 | Fluxo de Compra Exclusiva: Produto -> Adicionar à Sacola -> Verificação de Estado 3 -> Checkout WhatsApp formatado | F5, F10, F11 | Alto |
| 5 | Estados Estritos da Sacola: Vazio deslogado com silhueta -> Login -> Vazio logado sem banner -> Adição de item | F11 | Alto |
| 6 | Acessibilidade e Inclusão: Auditoria de contraste WCAG AA + Inputs sem zoom no iOS Safari + Reduced Motion | F3, F12, F13 | Médio |
| 7 | Compartilhamento Social & Notches: Inspeção de metatags OG/Twitter e safe-area-insets nos elementos fixos | F1, F5, F14 | Médio |

## Coverage Thresholds
- Tier 1: ≥ 5 testes por feature (70 testes unitários de renderização)
- Tier 2: ≥ 5 testes por feature em condições extremas e limites (70 testes de limites)
- Tier 3: Testes de interação combinatória cruzada (14 combinações par a par)
- Tier 4: 7 cenários completos de jornada de cliente
- **Total Mínimo Estimado**: ≥ 161 verificações automatizadas com saída estruturada
