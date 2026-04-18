Scenario: Filtragem de público na camada de serviço
Given que no banco de dados a obra "Curta Metragem" possui média 5.0 baseada em 5 avaliações
And a obra "O Poderoso Chefão" possui média 4.9 baseada em 1.200 avaliações
And a regra do serviço exige um quórum mínimo de 50 avaliações para o ranking
When o serviço recebe uma requisição para gerar a lista de "Mais Bem Avaliados"
Than o serviço processa a agregação de notas validando o quórum
And retorna um conjunto de dados que inclui a obra "O Poderoso Chefão"
And omite completamente a obra "Curta Metragem" da resposta gerada.

Scenario: Cálculo temporal para o ranking "Em Alta"
Given que a obra "Clássico Antigo" possui 100.000 avaliações no total, sendo apenas 10 registradas nos últimos 7 dias
And a obra "Lançamento Recente" possui 500 avaliações no total, sendo 450 registradas nos últimos 7 dias
When o serviço recebe uma requisição para processar o ranking "Em Alta" considerando a janela temporal de 7 dias
Than o serviço realiza a consulta filtrando as interações apenas pelo período recente
And retorna a lista de resultados classificando a obra "Lançamento Recente" em uma posição superior à obra "Clássico Antigo".

Scenario: Segmentação Regional no Ranking de Popularidade
Given que a obra "Blockbuster Mundial" é a mais assistida globalmente, mas possui baixa tração no Brasil
And a obra "Série Nacional" teve 50.000 visualizações concentradas apenas em território brasileiro nas últimas 48 horas
When o serviço recebe uma requisição de ranking "Populares na Sua Região" com o header Accept-Language: pt-BR
Than o serviço aplica o filtro geográfico cruzando os metadados de acesso
And processa o cálculo de relevância local priorizando o volume regional
And retorna o conjunto de dados com a obra "Série Nacional" na primeira posição
And garante que o conteúdo entregue é culturalmente relevante para o usuário final.

Scenario: Falha de Quórum por Volume Insuficiente
Given que o banco de dados contém apenas obras com menos de 50 avaliações cada
And a regra do serviço exige um quórum mínimo de 50 avaliações para o ranking
When o serviço recebe uma requisição para gerar a lista de "Mais Bem Avaliados"
Than o serviço processa a validação e identifica que nenhuma obra atingiu o threshold
And retorna um conjunto de dados vazio (empty set) em vez de listar obras com quórum baixo
And o sistema escreve um log de "Insufficient Data for Ranking" para monitoramento.

Scenario: Falha de Relevância por Janela Temporal Expirada
Given que a obra "Sucesso de Bilheteria 1990" tem 1 milhão de avaliações históricas e 0 recentes
And a obra "Indie Viral" tem 1.000 avaliações, todas registradas nas últimas 24 horas
When o serviço recebe uma requisição para processar o ranking "Em Alta" com janela de 7 dias
But ocorre uma falha na cláusula WHERE do banco de dados, ignorando o filtro de data
Than o serviço processa erroneamente o total acumulado (all-time) em vez do temporal
And retorna a obra "Sucesso de Bilheteria 1990" no topo, falhando no objetivo do ranking "Em Alta"
And dispara um alerta de inconsistência de regra de negócio.
