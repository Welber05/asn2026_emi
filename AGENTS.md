# Desenvolvimento e sincronização

Repositório oficial privado: https://github.com/Welber05/asn2026_emi
Branch principal: `main`. Preserve a privacidade: há dados reais de estudantes.

## Antes de alterar arquivos

1. Confira `git status --short --branch` e `git remote -v`.
2. Execute `git fetch origin` e compare a branch local com sua correspondente remota. Nunca confie apenas nas referências locais de uma sessão anterior.
3. Com a árvore limpa e sem divergência, incorpore os commits remotos com `git pull --ff-only origin main` antes de editar na main. Para outra branch, use a correspondente remota.
4. Se houver trabalho local pendente, preserve-o e examine as diferenças antes de integrar. Não descarte nem sobrescreva mudanças do usuário. Se houver divergência, integre os dois históricos com cuidado e valide o resultado; peça esclarecimento apenas se houver uma decisão de conteúdo que não possa ser inferida.
5. Se não conseguir consultar o remoto, informe que a sincronização não foi verificada e resolva o acesso antes de desenvolver sobre uma versão possivelmente desatualizada.

## Durante e ao concluir o trabalho

- Repita a consulta ao remoto antes de começar uma nova etapa em sessões longas.
- Valide as alterações de forma proporcional, revise o diff e crie commits coerentes das mudanças concluídas. Não inclua trabalho alheio sem revisão.
- Consulte novamente o remoto antes do envio. Incorpore eventuais mudanças concorrentes, resolva conflitos e repita a validação afetada.
- Envie os commits concluídos ao GitHub (`git push origin main` na main). O usuário autorizou esse fluxo contínuo; não peça confirmação a cada envio rotineiro ao mesmo repositório privado.
- Se o push for rejeitado por concorrência, busque e integre as novidades; nunca use force push para contornar a rejeição.
- Confirme após o envio, com uma nova consulta ao remoto, que os commits local e remoto coincidem e reporte qualquer arquivo pendente ou bloqueio. Não declare sincronização se não foi verificada.
- Não use reset destrutivo, limpeza de arquivos ou sobrescrita automática para fazer as cópias coincidirem.
- Não versione segredos, credenciais, dependências instaladas, artefatos de build, arquivos temporários ou bancos locais de execução. Respeite o `.gitignore`.

Este fluxo sincroniza o código e os arquivos versionados a cada ciclo de desenvolvimento. Não é um serviço permanente em segundo plano e não sincroniza registros do banco de dados ou documentos enviados ao aplicativo. Enviar ao GitHub também não publica automaticamente o site hospedado.
