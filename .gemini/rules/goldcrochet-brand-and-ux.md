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


