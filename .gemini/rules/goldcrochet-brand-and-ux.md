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

## 2. Formas Orgânicas, Pílulas e Estrutura de Cards
- Utilizar **pílulas (`border-radius: 999px`)** para botões de ação e links.
- **Cards de Produtos:** Bordas superiores arredondadas puxadas para o quadrado e bordas inferiores suavemente quadradas (`border-radius: 14px 14px 8px 8px`), transmitindo requinte sóbrio e moderno de alta-costura.
- **Preço dos Produtos em Preto Sólido:** O preço deve ser renderizado sempre em preto puro (`#000000`), sem cor dourada e **sem texto de parcelamento** (`3x de R$ ...`).

## 3. Silhueta de Usuário & Separação de Papéis
- O ícone da **Silhueta do Usuário** no cabeçalho é **exclusivamente a Área do Cliente** (Minha Conta, Firebase Auth, histórico de pedidos e Programa de Brindes).
- O link do **Painel Admin NUNCA deve ser exposto na navegação pública**. O acesso ao Admin é restrito e só ocorre se a pessoa digitar manualmente `/admin` ou `/admin.html` na barra de endereços do navegador.

## 4. Programa de Brindes do Ateliê & Jornal (Newsletter)
- A cada 3 compras registradas, a cliente acumula progresso no medidor circular para resgatar um brinde exclusivo em crochê manual.
- O banner principal de fidelidade na home integra o **Jornal do Ateliê (Newsletter VIP)**, onde a cliente se cadastra para receber novidades de coleções e mimos de alta-costura.

## 5. Arquitetura Multi-Página Tradicional (GitHub Pages)
- Cada rota principal (`index.html`, `colecoes.html`, `pecas.html`, `novidades.html`, `casa-gold.html`) e cada produto (`produtos/<slug>.html`) é um arquivo HTML físico independente para garantir que o botão Voltar do navegador (`Alt + Seta Esquerda`) funcione com 100% de estabilidade nativa.

## 6. Resiliência de Interface & Prevenção de Tela em Branco (Zero-Blank State)
- **HTML Primeiro (First Paint Resiliente):** Seções de formulário e autenticação padrão NUNCA devem ter `style="display: none"` inline rígido. A interface padrão (como formulário de login/cadastro) deve estar sempre visível no HTML de base, sendo ocultada apenas após confirmação ativa de sessão.
- **Renderização Síncrona Anti-Flicker:** Telas que alternam entre visitante e usuário logado devem executar um script síncrono ultraleve antes de scripts modulares pesados para verificar `localStorage` e atualizar o estado visual sem travar em branco.
- **Degradação Elegante Offline:** Toda a experiência do cliente (medidas, pedidos recentes, cálculo de brindes) deve funcionar com persistência local caso o Firebase ou CDN fiquem temporariamente inacessíveis.

## 7. Contatos Oficiais da Marca
- **WhatsApp Comercial Exclusivo:** O único número autorizado para pedidos, encomendas e suporte é **+55 31 98456-6047** (`5531984566047`).
- **Instagram Oficial Único:** O link oficial em todos os botões e rodapés é estritamente **`https://www.instagram.com/goldcrochetbrasil?stkn=Mm5ndmt2cTJzNXRo`**.

## 8. Inicialização Limpa de Contas & Sincronização Firestore (Cliente ⇄ Admin)
- **Zero Pedidos Simulados:** Toda nova conta criada por um cliente deve iniciar estritamente com `purchasesCount: 0` e `orders: []`. Não devem ser inseridos pedidos mocados ou pré-fabricados. Se o cliente não tiver pedidos, exibe-se um estado vazio elegante com botão para o catálogo.
- **Sincronização Obrigatória no Firestore:** Toda ação do cliente (cadastro, login Google/Email, salvar medidas, salvar endereço de entrega ou somar compra de WhatsApp) deve salvar e mesclar os dados no documento `users/{uid}` no Firestore com `role: 'customer'`, permitindo que o painel `/admin` liste os clientes, visualize suas medidas e seus pedidos em tempo real.

## 9. Logotipo Oficial Caligráfico & Loading Screen Imutável
- **Logotipo Autêntico:** O logotipo oficial consiste estritamente na caligrafia nobre "Gold Crochet BRASIL" (`assets/logo-brasil-transparent.png`). É proibido modificá-lo ou distorcê-lo.
- **Loading Screen Impecável:** Na tela de transição/carregamento (`js/loader.js`), utiliza-se o logotipo caligráfico oficial com proporções preservadas e animação de respiração elegante (`width: 220px; max-width: 80vw; height: auto; object-fit: contain`).
- **Peça Personalizada:** Utiliza o logotipo oficial caligráfico sobre fundo marfim nobre (`assets/peca-personalizada.png`).

## 10. Estrutura Rígida do Headline (Esquerda para a Direita)
A navegação superior do site segue rigorosamente a ordem:
1. **Logotipo Oficial** na extrema esquerda (`assets/logo-brasil-transparent.png`)
2. **Início**
3. **Coleções**
4. **Peças** (sem qualquer setinha ou chevron indicador; ao abrir, a aba/mega-menu desce com animação fluida `gcMegaMenuSlideDown`)
5. **Novidades**
6. **Casa Gold**
7. **Pesquisar** (ícone e texto)
8. **Silhueta do Usuário** (acesso à Minha Conta)
9. **Silhueta do Coração** (Favoritos)
10. **Sacola de Compras** (abertura da gaveta do carrinho)

## 11. Hero Box com Fundo Tropical & Letras Animadas
- **Fundo Tropical:** Utiliza a fotografia botânica oficial (`assets/hero-tropical-bg.jpg`) com camada translúcida esbranquiçada (`linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(253,246,214,0.85) 100%)`) garantindo 100% de contraste e legibilidade.
- **Animações de Entrada:** Título e textos surgem com animação fluida de deslizamento suave.
- **Botão Único em Pílula Menor:** O botão "Explorar Peças" é uma pílula compacta sem seta. A opção "Ver Coleções" foi removida da caixa de Hero.
- **Portais das Linhas com Surgimento ao Rolar:** Os 4 cartões temáticos abaixo do hero surgem suavemente quando o usuário rola a página (via IntersectionObserver).

## 12. Carrossel de Criações em Destaque
- Substitui grades estáticas por um **carrossel horizontal interativo** abastecido com produtos do catálogo de forma dinâmica e farta (mínimo de 12 itens embaralhados aleatoriamente).
- Possui **setas de navegação** (Anterior e Próximo).
- **Física de Deslize Fluida (Mouse & Touch):**
  - O arraste com mouse deve desativar o arrasto nativo de imagens (`user-drag: none; pointer-events: none`) para evitar congelamento.
  - Durante o movimento, desativa temporariamente o `scroll-behavior: smooth` e o `scroll-snap` para resposta 1:1 ao cursor, escutando `mousemove`/`mouseup` a nível global (`window`).
  - Ao soltar o clique, calcula a velocidade instantânea e aplica impulso com inércia suave (*momentum glide*) antes de restaurar o encaixe (*snap*).
- O botão "Ver Todo o Acervo" não possui seta.

## 13. Experiência da Gaveta de Sacola (3 Estados Estritos)
1. **Sacola Vazia & Deslogado:** Exibe a **silhueta clássica da sacola em SVG**, a mensagem "Sua sacola está vazia.", o link "Explore nossas peças!" e o card "Pegue sua bolsa" com o botão "Entrar na Minha Conta".
2. **Sacola Vazia & Logado:** Exibe apenas a silhueta clássica da sacola, a mensagem "Sua sacola está vazia." e o link de explorar. O card de login **não aparece**.
3. **Sacola com Produtos:** Exibe a lista de itens, o total, o pill de identificação `Conectado como <Nome>` e o botão dourado sólido com o texto exato **"Finalizar pelo WhatsApp"** (sem emoji de foguete 🚀).

## 14. Fluxo Único de Pedido: Exclusividade da Sacola
- **Sem Compra Direta em Produtos:** É estritamente proibido incluir botões de "Comprar Direto no WhatsApp" nas páginas de produtos (`produtos/*.html`).
- **Ação Única do Produto:** O único botão de ação é **"Adicionar à Sacola"**, garantindo que todas as peças passem pelo carrinho para cálculo de brindes, cadastro do cliente e escolha de cores/medidas.
- **Finalização Exclusiva na Gaveta:** O WhatsApp é acionado unicamente pelo botão **"Finalizar pelo WhatsApp"** na gaveta da sacola.



