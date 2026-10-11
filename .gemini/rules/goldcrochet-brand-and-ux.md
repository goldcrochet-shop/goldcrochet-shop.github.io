---
description: Diretrizes oficiais de marca, paleta de cores, formas orgânicas e arquitetura de usuário da Gold Crochet
globs: ["**/*"]
---

# Gold Crochet — Diretrizes de Marca, UX e Arquitetura

## 1. Paleta Cromática Oficial Estrita
Toda a interface deve seguir rigorosamente as 4 cores oficiais da marca:
- **Cor Primária:** **Ouro Metálico** (`linear-gradient(135deg, #fff2b2, #d4af37, #a67c00, #f3d26b)` e `#cda434` / `#d4af37`).
- **Cor Secundária:** **#fdf6d6** (Areia Suave / Marfim Quente aconchegante do ateliê).
- **Cor Terciária:** **#ffffff** (Branco Puro para cartões e respiro).
- **Cor Quaternária:** **#bad7e8** (Azul Celeste Suave / Brisa Marítima, inspirado em Fernando de Noronha e Arpoador).

## 2. Formas Orgânicas, Pílulas e Círculos
- Evitar formas duras e excessivamente geométricas retangulares.
- Utilizar **pílulas (`border-radius: 999px`)** para botões de ação, filtros de catálogo, links e contêineres de interação.
- Utilizar **círculos (`border-radius: 50%`)** para botões de ícone, badges de contagem e medidores.
- Utilizar **curvas orgânicas suaves (`border-radius: 28px` a `36px`)** para cards e modais.
- Utilizar o logotipo oficial da marca (`assets/logo.png`) no centro do headline e no rodapé, associado ao Búzio Dourado.

## 3. Silhueta de Usuário & Separação de Papéis
- O ícone da **Silhueta do Usuário** no cabeçalho é **exclusivamente a Área do Cliente** (Minha Conta, Firebase Auth, histórico de pedidos e Programa de Brindes).
- O link do **Painel Admin NUNCA deve ser exposto na navegação pública**. O acesso ao Admin é restrito e só ocorre se a pessoa digitar manualmente `/admin` ou `/admin.html` na barra de endereços do navegador.

## 4. Programa de Brindes do Ateliê
- A cada 3 compras registradas, a cliente acumula progresso no medidor circular para resgatar um brinde exclusivo em crochê manual.
- O Firebase (Auth e Firestore) é reservado para gerenciar contas de usuários e histórico de fidelidade, enquanto os dados de vitrine residem no catálogo estático.

## 5. Arquitetura Multi-Página Tradicional (GitHub Pages)
- Cada rota principal (`index.html`, `colecoes.html`, `pecas.html`, `novidades.html`, `casa-gold.html`) e cada produto (`produtos/<slug>.html`) é um arquivo HTML físico independente para garantir que o botão Voltar do navegador (`Alt + Seta Esquerda`) funcione com 100% de estabilidade nativa.

## 6. Resiliência de Interface & Prevenção de Tela em Branco (Zero-Blank State)
- **HTML Primeiro (First Paint Resiliente):** Seções de formulário e autenticação padrão NUNCA devem ter `style="display: none"` inline rígido. A interface padrão (como formulário de login/cadastro) deve estar sempre visível no HTML de base, sendo ocultada apenas após confirmação ativa de sessão.
- **Renderização Síncrona Anti-Flicker:** Telas que alternam entre visitante e usuário logado devem executar um script síncrono ultraleve antes de scripts modulares pesados para verificar `localStorage` e atualizar o estado visual sem travar em branco.
- **Tolerância a Falhas em Módulos ESM:** O módulo central do Firebase (`js/firebase.js`) deve sempre fornecer aliases para métodos de uso comum (ex: `where` e `fsWhere`) para prevenir erros de resolução de módulo (`SyntaxError`) que impeçam a execução de `<script type="module">`.
- **Degradação Elegante Offline:** Toda a experiência do cliente (medidas, pedidos recentes, cálculo de brindes) deve funcionar com persistência local caso o Firebase ou CDN fiquem temporariamente inacessíveis.

## 7. Contato Oficial & Canal de Atendimento Único
- **WhatsApp Comercial Exclusivo:** O único número autorizado para pedidos, encomendas e suporte é **+55 31 98456-6047** (`5531984566047`). Nenhum template, produto ou script deve utilizar números genéricos ou placeholders.

## 8. Inicialização Limpa de Contas & Sincronização Firestore (Cliente ⇄ Admin)
- **Zero Pedidos Simulados:** Toda nova conta criada por um cliente deve iniciar estritamente com `purchasesCount: 0` e `orders: []`. Não devem ser inseridos pedidos mocados ou pré-fabricados. Se o cliente não tiver pedidos, exibe-se um estado vazio elegante com botão para o catálogo.
- **Sincronização Obrigatória no Firestore:** Toda ação do cliente (cadastro, login Google/Email, salvar medidas, salvar endereço de entrega ou somar compra de WhatsApp) deve salvar e mesclar os dados no documento `users/{uid}` no Firestore com `role: 'customer'`, permitindo que o painel `/admin` liste os clientes, visualize suas medidas e seus pedidos em tempo real.

## 9. Logotipo Oficial Imutável & Remoção de Objetos 3D
- **Logotipo Autêntico:** O logotipo oficial consiste estritamente na caligrafia nobre "Gold" unida ao Búzio Dourado artesanal (`assets/logo-transparent.png` e `assets/buzio-oficial.png`). É proibido modificá-lo, estilizá-lo com sombras artificiais ou substituí-lo por vetores SVG aproximados.
- **Sem Canvas 3D:** Não utilizar esculturas 3D ou Three.js na vitrine pública. A identidade é representada com nitidez e leveza através do ativo visual oficial fornecido.

## 10. Tipografia Suave & Padronizada (Poppins / Title Case Sem Uppercase Agressivo)
- **Fonte Padrão do Ateliê:** Utilizar `Poppins` (com fallback `Plus Jakarta Sans`) para todos os textos e navegação, garantindo um desenho elegante, contemporâneo e suave, eliminando tipografias pesadas ou "brutas".
- **Navegação em Title Case:** Os links de menu devem ser apresentados em Title Case (`Início`, `Coleções`, `Peças`, `Novidades`, `Casa Gold`). O item ativo recebe cor dourada (`#cda434`) com traço inferior horizontal em pílula (`width: 28px; height: 3px; background: #cda434`).
- **Sem Uppercase Agressivo:** Evitar `text-transform: uppercase` indiscriminado em botões e gavetas, preservando uma leitura fluida e acolhedora.

## 11. Botões Padronizados com Cor Sólida Oficial (Sem Efeito Cromático)
- **Ouro Sólido:** Todos os botões primários de ação (`.gc-btn-pill-primary`, `.gc-btn-checkout`, `.gc-btn-solid-gold`, `.gc-card-btn-buy`) devem utilizar estritamente cor sólida ouro oficial (`#cda434`, hover `#b8860b`) com tipografia nítida em branco (`#ffffff`).
- **Eliminação de Efeitos Cromáticos:** É proibido aplicar gradientes multicoloridos, metálicos espelhados ou bordas cromáticas psicodélicas nos botões.

## 12. Mega-Menu Suspenso de "Peças"
- Clicar ou pairar sobre "Peças" aciona um mega-menu horizontal em tela cheia dividido em 6 colunas temáticas:
  1. *ESSENCIAIS* (Para Ela / Para Ele)
  2. *PEQUENINOS*
  3. *ACESSÓRIOS*
  4. *BIJUTERIAS*
  5. *ARTIGOS PARA CASA*
  6. *Card Oficial da Marca* com fundo marfim suave e o logotipo oficial centralizado.
  Todos os blocos devem possuir links de rodapé "Ver tudo" sublinhados.

## 13. Experiência da Gaveta de Sacola Vazia
- Quando a sacola de compras estiver vazia, deve renderizar a composição oficial:
  - **Parte Superior (Branca):** Ilustração artesanal do novelo de crochê azul com agulhas (`assets/yarn-ball.png`), título "Sua sacola está vazia." e link "Explore nossas peças!".
  - **Parte Inferior (Areia Suave):** Card editorial "Pegue sua bolsa", texto "Faça login na Minha Conta para acessar sua sacola em todos os seus dispositivos." e botão sólido de ouro "Entrar na Minha Conta".

## 14. Ações de Cabeçalho Despojadas de Bolhas
- Os botões do cabeçalho (Pesquisa, Silhueta do Usuário, Favoritos e Sacola) devem ser ícones limpos, transparentes e sem bordas, sem fundos em círculo nem sombras de bolha.



