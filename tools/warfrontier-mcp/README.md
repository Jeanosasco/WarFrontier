# WarFrontier Project MCP

Servidor MCP local para consultar o estado do projeto, identificar a próxima tarefa e validar o protótipo da Federação.

## Requisitos

- Node.js 20 ou superior
- npm
- clone local do repositório WarFrontier

## Instalação

```bash
cd tools/warfrontier-mcp
npm install
npm run typecheck
npm run build
```

## Execução

```bash
npm start
```

O servidor usa transporte `stdio`. Não escreva logs comuns em `stdout`; o servidor utiliza `stderr` para mensagens de diagnóstico.

## Variável de ambiente

Quando o cliente MCP iniciar o servidor fora da raiz do repositório, defina:

```bash
WARFRONTIER_ROOT=/caminho/para/WarFrontier
```

No Windows PowerShell:

```powershell
$env:WARFRONTIER_ROOT = "C:\caminho\para\WarFrontier"
```

## Ferramentas disponíveis

### `project_state`

Retorna um resumo compacto dos arquivos importantes, branches de trabalho e commit-base importado.

### `next_task`

Retorna a próxima tarefa ainda não concluída, seguindo a ordem definida pelas skills do projeto.

### `validate_federation`

Valida:

- existência dos JSONs obrigatórios;
- sintaxe JSON;
- IDs principais da Federação;
- cadeia básica de pesquisas;
- referências do template `FED-TPL-H01`.

A ferramenta não altera arquivos.

## Teste com MCP Inspector

```bash
npm run inspect
```

No Inspector, execute as ferramentas nesta ordem:

1. `project_state`
2. `next_task`
3. `validate_federation`

## Exemplo de configuração de cliente

```json
{
  "mcpServers": {
    "warfrontier": {
      "command": "node",
      "args": [
        "C:/caminho/WarFrontier/tools/warfrontier-mcp/dist/index.js"
      ],
      "env": {
        "WARFRONTIER_ROOT": "C:/caminho/WarFrontier"
      }
    }
  }
}
```

## Estado da versão 0.1

Esta versão é somente leitura. Ela consulta e valida o projeto, mas ainda não cria ou modifica unidades automaticamente.

Próximas ferramentas planejadas:

- `create_unit`
- `create_weapon`
- `create_structure`
- `build_status`
- `roadmap_status`

## Segurança

Ferramentas de escrita deverão:

- exigir uma opção explícita de confirmação;
- rejeitar caminhos fora do repositório;
- impedir sobrescrita acidental;
- validar o JSON antes de salvar;
- retornar todos os arquivos alterados.
