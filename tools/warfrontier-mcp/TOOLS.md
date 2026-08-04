# WarFrontier Project MCP — Tool Reference

Referência das ferramentas públicas do WarFrontier Project MCP 1.0.

## Regras comuns

- `repositoryRoot` é opcional; quando omitido, usa `WARFRONTIER_ROOT` ou o diretório atual.
- Builders usam `confirm=false` por padrão e não gravam arquivos nesse modo.
- A gravação exige uma segunda chamada com `confirm=true`.
- IDs existentes e documentos já criados não são sobrescritos.
- Escritas usam transações com temporários, backups e rollback.

## Ferramentas de inspeção

### `project_state`

Retorna a raiz resolvida, branches de trabalho, ferramentas registradas e presença dos arquivos importantes.

```json
{ "repositoryRoot": "/caminho/WarFrontier" }
```

Use no início de cada sessão.

### `next_task`

Identifica a próxima tarefa compacta ainda pendente. É um auxílio de continuidade, não um rastreador completo de issues.

### `suggest_ids`

Retorna os primeiros IDs livres para:

- corpo: `FED-H##`;
- arma: `FED-WPN-###`;
- pesquisa: `FED-RES-###`;
- estrutura: `FED-D##`;
- template: `FED-TPL-*`.

A ferramenta preenche a primeira lacuna numérica disponível.

## Project Brain

### `analyze_federation`

Analisa, sem escrever:

- referências quebradas;
- corpos e armas órfãos;
- componentes e estruturas sem pesquisa;
- pesquisas sem resultados;
- placeholders em modelos e efeitos.

Avisos de conteúdo órfão exigem revisão manual, pois protótipos podem estar isolados intencionalmente.

### `validate_federation`

Verifica:

- existência e sintaxe dos JSONs obrigatórios;
- IDs principais da Federação;
- referências essenciais do template Guardian;
- contagens de corpos, armas, estruturas, pesquisas e templates.

Não substitui a compilação e o teste dentro do jogo.

## Builders

### `create_unit`

Cria corpo, template e documentação.

Obrigatórios:

- `id` (`FED-H##`);
- `templateId` (`FED-TPL-*`);
- `name`;
- `role`;
- `weaponId` (`FED-WPN-###`).

Opcionais importantes: propulsão, vida, armaduras, custo, peso, energia, calor, escudo, modelo placeholder e `confirm`.

Arquivos alterados:

- `body.json`;
- `templates.json`;
- `docs/units/federation/<id>.md`.

### `create_weapon`

Cria uma arma e sua documentação.

Obrigatórios: `id`, `name`, `role`.

Opcionais: dano, cadência, alcance, precisão, consumo de energia, geração de calor, duração do feixe, classe, efeito, subclasse, modelos, efeitos, som, custo, peso e `confirm`.

Regra: `shortRange` não pode ser maior que `longRange`.

Arquivos alterados:

- `weapons.json`;
- `docs/weapons/federation/<id>.md`.

### `create_structure`

Cria uma estrutura e sua documentação.

Obrigatórios: `id`, `name`, `role`.

Opcionais: tipo, vida, armadura, resistência, custo, dimensões, `weaponIds`, modelo, escudo, recarga, energia e `confirm`.

IDs repetidos em `weaponIds` são rejeitados.

Arquivos alterados:

- `structure.json`;
- `docs/structures/federation/<id>.md`.

### `create_research`

Cria uma pesquisa e sua documentação.

Obrigatórios:

- `id` (`FED-RES-###`);
- `name`;
- `description`;
- ao menos um resultado em `resultComponents` ou `resultStructures`.

Opcionais: ícone, custo, código tecnológico, pré-requisitos, resultados, `statId` e `confirm`.

Regras:

- pré-requisitos duplicados são rejeitados;
- uma pesquisa não pode exigir a si própria;
- precisa desbloquear ao menos um componente ou estrutura.

Arquivos alterados:

- `research.json`;
- `docs/research/federation/<id>.md`.

### `create_combat_package`

Cria em uma única transação:

- corpo;
- arma;
- pesquisa;
- template;
- documentação do pacote.

Obrigatórios: `bodyId`, `weaponId`, `researchId`, `templateId`, `unitName`, `weaponName`, `researchName`, `role` e `description`.

Valida:

- alcance curto e longo;
- auto-dependência de pesquisa;
- existência dos pré-requisitos;
- duplicidade dos quatro IDs.

Exemplo de preview:

```json
{
  "bodyId": "FED-H02",
  "weaponId": "FED-WPN-002",
  "researchId": "FED-RES-005",
  "templateId": "FED-TPL-H02",
  "unitName": "Sentinel",
  "weaponName": "Sentinel Phaser",
  "researchName": "Sentinel Systems",
  "role": "Medium combat vehicle",
  "description": "Shielded Federation line vehicle.",
  "confirm": false
}
```

## Retorno de escrita

Uma gravação bem-sucedida contém:

```json
{
  "mode": "write",
  "transaction": "committed",
  "written": ["caminho/arquivo.json"]
}
```

## Erros comuns

- `Refusing to overwrite existing ID`: execute `suggest_ids` e escolha outro ID.
- `Refusing to overwrite existing file`: a documentação já existe e deve ser tratada manualmente.
- `shortRange cannot be greater than longRange`: corrija os alcances.
- `A research topic cannot require itself`: remova o próprio ID dos pré-requisitos.
- `Missing prerequisite research IDs`: crie ou corrija as pesquisas necessárias.
- Erro de JSON: restaure ou corrija o arquivo antes de usar builders.

## Fluxo recomendado

1. `project_state`;
2. `analyze_federation`;
3. `suggest_ids`;
4. builder com `confirm=false`;
5. revisar preview;
6. repetir com `confirm=true`;
7. `validate_federation`;
8. `analyze_federation`;
9. revisar o Git diff;
10. compilar e testar o jogo.
