---
description: Diretrizes oficiais de marca, alta-costura, paleta de cores, UX e arquitetura da Gold Crochet Brasil
globs: ["**/*"]
---

# Gold Crochet Brasil — Diretrizes Oficiais de Marca, UX e Arquitetura

## 1. Naming & Identidade da Marca
- O nome oficial da marca padronizado em todo o site, títulos, rodapés e metatags é **Gold Crochet Brasil**.

## 2. Paleta Cromática Oficial Estrita
Toda a interface deve seguir rigorosamente as 4 cores oficiais da marca:
- **Cor Primária:** **Ouro Metálico** (`linear-gradient(135deg, #fff2b2, #d4af37, #a67c00, #f3d26b)` e `#cda434` / `#d4af37`).
- **Cor Secundária:** **#fdf6d6** (Areia Suave / Marfim Quente aconchegante do ateliê).
- **Cor Terciária:** **#ffffff** (Branco Puro para cartões e respiro).
- **Cor Quaternária:** **#bad7e8** (Azul Celeste Suave / Brisa Marítima, inspirado em Fernando de Noronha e Arpoador).

## 3. Arquitetura do Cabeçalho e Navegação (Efeito Schiaparelli)
- **Fixação sem Quebra de Sticky:** O container raiz (`html, body`) deve sempre utilizar `overflow-x: clip` em vez de `overflow-x: hidden`, garantindo que o cabeçalho sticky (`position: sticky`) nunca seja desativado e permaneça perfeitamente fixo.
- **Transição Suave de 2 Níveis com Histerese:** 
  - No topo da página (`scrollY < 15px`), exibe a linha nobre (*crest row*) com a logo caligráfica expandida centralizada e o menu de navegação logo abaixo.
  - Ao rolar a página (`scrollY > 60px`), a linha nobre superior recolhe suavemente (`max-height: 0; opacity: 0; pointer-events: none`) e a logo compacta surge à esquerda na barra de navegação.
  - A histerese (intervalo entre 15px e 60px) elimina completamente tremores e travamentos (*stuttering/lagging*).
- **Abas Laterais Deslizantes (Drawers):**
  - **Sacola:** O ícone de sacola abre a gaveta lateral direita com produtos, quantidades, subtotais e finalização via WhatsApp.
  - **Lista de Desejos (Coração):** O ícone de coração no cabeçalho abre **exclusivamente a gaveta lateral de favoritos**, sem redirecionar o usuário para páginas com filtros.
- **Menu Peças (Mega Menu):**
  - Mantém ponte invisível de interação (`hover bridge`) de pelo menos 24px para evitar que a aba feche ao movimentar o mouse em direção a "Ver tudo" ou categorias.
  - Animação de saída gradual com `opacity: 0; transform: translateY(-12px); visibility: hidden; pointer-events: none`.
  - Exibe a logo oficial em relevo dourado sem cortes laterais no cartão da marca (`media_1791727664891_d5df64c2.png`).

## 4. Apresentação Hero (Vidro Fosco Translúcido)
- **Barra Translúcida:** O painel de boas-vindas do Hero utiliza acabamento de vidro fosco translúcido (`rgba(255, 255, 255, 0.78)` com `backdrop-filter: blur(20px)`), sem bordas douradas pesadas ou linhas pretas de corte.
- **Animação de Entrada:** A barra e as escritas surgem com animação fluida deslizante da esquerda (`@keyframes gcHeroSlideInLeft`).
- **Botão Único em Pílula:** O botão "Explorar Peças" é uma pílula compacta sem seta.

## 5. Carrossel de Criações em Destaque (Loop Infinito)
- **Sem Fim Rígido:** Estrutura contínua em loop infinito ("onde o início é o fim"), resetando seamless na metade do trilho duplicado.
- **Avanço Automático:** Rola automaticamente a cada 30 segundos, pausando e reiniciando a contagem quando o usuário interage via toque ou clique.
- **Bordas Esfumaçadas:** Extremidades laterais com efeito esfumaçado contínuo via máscara CSS em degradê (`mask-image: linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent)`).
- **Sem Tags Redundantes:** Remoção de pílulas ou badges redundantes (como "Seleção Curada") acima do título.

## 6. Cards de Produtos (Padrão Alta-Costura & Base Descolada)
- **Silhueta de Coração Vazada:** O botão de favoritos do card deve conter apenas a silhueta em vetor do coração (`svg`), sem círculos ou bolhas de fundo.
- **Badges Verticais:** As etiquetas/badges de produto ficam posicionadas na vertical na lateral esquerda da imagem.
- **Produtos com Desconto:**
  - O badge tradicional é substituído pela porcentagem/valor do desconto na vertical.
  - Exibição de preço: O preço original/antigo em cor discreta riscado (`line-through`), e ao lado o preço atual em destaque na cor vermelha com tamanho ampliado.
- **Fundo Limpo & Sem Borda no Hover:** Remoção completa da borda dourada que surge ao passar o mouse. O card mantém visual limpo e sem borda aparente.
- **Base do Card ("Fingir que não é do card"):** O container de informações (título e preço) tem fundo transparente e sem bordas/sombras, dando o efeito de flutuar solto abaixo da foto do produto, como na alta-costura internacional.

## 7. Páginas Individuais de Produto (Padrão Cartier)
- **"Voltar ao Catálogo":** Texto limpo em maiúsculas suaves, sem setas (`&larr;`).
- **Galeria Vertical Contínua:** Imagens empilhadas verticalmente com rolagem contínua da página (estilo Cartier), eliminando miniaturas de clique.
- **Estrutura sem Caixas Externas:** Grid aberto e fluido, sem bordas externas, caixas brancas fechadas ou linhas divisórias abaixo do voltar ao catálogo.
- **Botão de Compra:** O texto do botão "Adicionar à Sacola" deve ser sempre branco (`#ffffff !important`).
- **Acordeons com Linhas Finas (+):**
  - Informações técnicas: *Material & Fios Nobres*, *Confecção Artesanal*, *Coleção & Ateliê*, *Acabamento & Detalhes*.
  - Informações institucionais Cartier: *Cuidados Gold Crochet*, *Embalagem para Presente*, *Entregas & Devolução*.
- **Carrossel "Você Também Pode Gostar":** Sugestões dinâmicas de produtos aleatórios em carrossel horizontal contínuo com avanço a cada 30 segundos.

## 8. Silhueta de Usuário & Separação de Papéis
- O ícone da **Silhueta do Usuário** no cabeçalho é **exclusivamente a Área do Cliente** (Minha Conta, Firebase Auth, histórico de pedidos e Programa de Brindes).
- O link do **Painel Admin NUNCA deve ser exposto na navegação pública**. O acesso ao Admin é restrito e só ocorre se a pessoa digitar manualmente `/admin` ou `/admin.html` na barra de endereços do navegador.

## 9. Contatos Oficiais da Marca
- **WhatsApp Comercial Exclusivo:** O único número autorizado para pedidos, encomendas e suporte é **+55 31 98456-6047** (`5531984566047`).
- **Instagram Oficial Único:** O link oficial em todos os botões e rodapés é estritamente **`https://www.instagram.com/goldcrochetbrasil?stkn=Mm5ndmt2cTJzNXRo`**.

## 10. Fluxo Único de Pedido: Exclusividade da Sacola
- **Sem Compra Direta em Produtos:** É estritamente proibido incluir botões de "Comprar Direto no WhatsApp" avulsos nos cards ou nas páginas de produtos.
- **Ação Única do Produto:** O único botão de ação é **"Adicionar à Sacola"**, garantindo que todas as peças passem pelo carrinho para cálculo de brindes, cadastro do cliente e escolha de cores/medidas.
- **Finalização Exclusiva na Gaveta:** O WhatsApp é acionado unicamente pelo botão **"Finalizar pelo WhatsApp"** na gaveta da sacola.
